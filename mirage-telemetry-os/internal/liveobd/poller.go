package liveobd

import (
	"bytes"
	"context"
	"fmt"
	"math"
	"time"

	"github.com/mirage-motorworks/telemetry-os/internal/attach"
	"github.com/mirage-motorworks/telemetry-os/internal/obd"
	"github.com/mirage-motorworks/telemetry-os/internal/telemetry"
)

type Poller struct {
	Adapter    obd.Adapter
	Attachment *attach.Controller
	Publish    func(telemetry.Snapshot)
	Interval   time.Duration
	Mode       string
}

const (
	ModeLegacy = "legacy-obd"
	ModeUDS    = "obd-on-uds"
)

var pollingOrder = []byte{0x0C, 0x0D, 0x11, 0x0B, 0x05, 0x0F, 0x42, 0x04, 0x5C, 0x44, 0x2F, 0x0E}

func (p Poller) Run(ctx context.Context, supported map[byte]bool) error {
	if p.Adapter == nil || p.Attachment == nil || p.Publish == nil {
		return fmt.Errorf("live OBD poller is not configured")
	}
	if p.Interval <= 0 {
		p.Interval = 50 * time.Millisecond
	}
	active := make([]byte, 0, len(pollingOrder))
	for _, pid := range pollingOrder {
		if supported[pid] {
			active = append(active, pid)
		}
	}
	if len(active) == 0 {
		return fmt.Errorf("vehicle exposes none of the supported live PIDs")
	}
	source := "obd2-standard"
	if p.Mode == ModeUDS {
		source = "obd-on-uds"
	}
	snapshot := emptySnapshot(time.Now(), p.Attachment.Snapshot(), source)
	ticker := time.NewTicker(p.Interval)
	defer ticker.Stop()
	index, consecutiveErrors := 0, 0
	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case started := <-ticker.C:
			pid := active[index%len(active)]
			index++
			value, err := query(p.Adapter, ctx, pid, p.Mode)
			p.Attachment.RecordRequest(err)
			if err != nil {
				consecutiveErrors++
				if consecutiveErrors >= len(active)*2 {
					return fmt.Errorf("live OBD polling lost ECU: %w", err)
				}
				continue
			}
			consecutiveErrors = 0
			now := time.Now()
			apply(&snapshot, pid, value, now, source)
			snapshot.Timestamp = now
			snapshot.Attachment = p.Attachment.Snapshot()
			snapshot.ProviderConnected = true
			latency := float64(time.Since(started).Milliseconds())
			snapshot.ProviderLatencyMS = telemetry.Value(latency, source, now)
			snapshot.EngineRunning = snapshot.RPM.Available && snapshot.RPM.Value != nil && *snapshot.RPM.Value > 0
			p.Publish(snapshot)
		}
	}
}

func query(adapter obd.Adapter, ctx context.Context, pid byte, mode string) (float64, error) {
	request := obd.Request{Service: 0x01, PID: &pid, Operation: obd.ReadOnly, Description: "live telemetry"}
	responseMarker := []byte{0x41, pid}
	if mode == ModeUDS {
		request = obd.Request{Service: 0x22, Parameters: []byte{0xF4, pid}, Operation: obd.ReadOnly, Description: "OBD-on-UDS live telemetry"}
		responseMarker = []byte{0x62, 0xF4, pid}
	}
	response, err := adapter.Query(ctx, request)
	if err != nil {
		return 0, err
	}
	data := obd.HexBytes(response.Raw)
	for index := 0; index+len(responseMarker) < len(data); index++ {
		if bytes.Equal(data[index:index+len(responseMarker)], responseMarker) {
			return obd.DecodeStandardPID(pid, data[index+len(responseMarker):])
		}
	}
	return 0, fmt.Errorf("PID %02X response malformed", pid)
}

func emptySnapshot(now time.Time, attachment attach.Snapshot, source string) telemetry.Snapshot {
	missing := func() telemetry.Reading { return telemetry.Missing(source, now) }
	return telemetry.Snapshot{
		Attachment: attachment, Timestamp: now, RPM: missing(), VehicleSpeedMPH: missing(), BoostPSI: missing(),
		ManifoldPressure: missing(), ThrottlePercent: missing(), AcceleratorPedalPercent: missing(), EngineLoadPercent: missing(),
		CoolantTempF: missing(), OilTempF: missing(), OilPressurePSI: missing(), IntakeAirTempF: missing(), AmbientTempF: missing(),
		AFR: missing(), Lambda: missing(), BatteryVoltage: missing(), FuelLevelPercent: missing(), FuelPressurePSI: missing(),
		Gear: missing(), IgnitionTiming: missing(), InjectorDutyPercent: missing(), WastegateDutyPercent: missing(),
		SteeringAngle: missing(), LateralG: missing(), LongitudinalG: missing(), GPSLatitude: missing(), GPSLongitude: missing(),
		GPSSpeed: missing(), ProviderLatencyMS: missing(),
	}
}

func apply(snapshot *telemetry.Snapshot, pid byte, value float64, now time.Time, source string) {
	reading := func(value float64) telemetry.Reading { return telemetry.Value(value, source, now) }
	switch pid {
	case 0x04:
		snapshot.EngineLoadPercent = reading(value)
	case 0x05:
		snapshot.CoolantTempF = reading(celsiusToFahrenheit(value))
	case 0x0B:
		snapshot.ManifoldPressure = reading(value)
		snapshot.BoostPSI = reading((value - 101.325) * 0.1450377)
	case 0x0C:
		snapshot.RPM = reading(value)
	case 0x0D:
		snapshot.VehicleSpeedMPH = reading(value * 0.621371)
		snapshot.GPSSpeed = telemetry.Missing("gps-unavailable", now)
	case 0x0E:
		snapshot.IgnitionTiming = reading(value)
	case 0x0F:
		snapshot.IntakeAirTempF = reading(celsiusToFahrenheit(value))
	case 0x11:
		snapshot.ThrottlePercent = reading(value)
	case 0x2F:
		snapshot.FuelLevelPercent = reading(value)
	case 0x42:
		snapshot.BatteryVoltage = reading(value)
	case 0x44:
		snapshot.Lambda = reading(value)
		snapshot.AFR = reading(value * 14.7)
	case 0x5C:
		snapshot.OilTempF = reading(celsiusToFahrenheit(value))
	}
}

func celsiusToFahrenheit(value float64) float64 { return math.Round((value*9/5+32)*10) / 10 }
