package simulator

import (
	"context"
	"fmt"
	"github.com/mirage-motorworks/telemetry-os/internal/attach"
	"github.com/mirage-motorworks/telemetry-os/internal/telemetry"
	"math"
	"sync"
	"time"
)

var Scenarios = []string{"ignition-off", "startup", "idle", "city", "highway", "hard-acceleration", "track", "overheating", "low-oil-pressure", "sensor-disconnect", "connection-loss"}
var Actions = []string{"attach-adapter", "remove-adapter", "ignition-on", "ignition-off", "attach-fk8", "attach-fl5", "attach-bronco", "attach-generic", "unsupported-vin", "ecu-timeout", "partial-pid-support", "adapter-failure"}

type Simulator struct {
	mu         sync.RWMutex
	interval   time.Duration
	scenario   string
	connected  bool
	readings   chan telemetry.Snapshot
	cancel     context.CancelFunc
	started    bool
	phase      float64
	attachment *attach.Controller
}

func New(interval time.Duration) *Simulator {
	return &Simulator{interval: interval, scenario: "ignition-off", connected: false, readings: make(chan telemetry.Snapshot, 4), attachment: attach.NewController()}
}
func (s *Simulator) Attachment() *attach.Controller { return s.attachment }
func (s *Simulator) Action(action string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	switch action {
	case "attach-adapter":
		s.attachment.AttachAdapter("sim://vlinker-fs")
		s.connected = false
	case "remove-adapter":
		s.attachment.RemoveAdapter()
		s.connected = false
	case "ignition-off":
		s.attachment.IgnitionOff()
		s.connected = false
		s.scenario = "ignition-off"
	case "ignition-on", "attach-fk8":
		if err := s.attachment.AttachVehicle("fk8", false, false); err != nil {
			return err
		}
		s.connected = true
		s.scenario = "idle"
	case "attach-fl5":
		if err := s.attachment.AttachVehicle("fl5", false, false); err != nil {
			return err
		}
		s.connected = true
		s.scenario = "idle"
	case "attach-bronco":
		if err := s.attachment.AttachVehicle("bronco", false, false); err != nil {
			return err
		}
		s.connected = true
		s.scenario = "idle"
	case "attach-generic":
		if err := s.attachment.AttachVehicle("generic", false, false); err != nil {
			return err
		}
		s.connected = true
		s.scenario = "idle"
	case "unsupported-vin":
		if err := s.attachment.AttachVehicle("generic", false, true); err != nil {
			return err
		}
		s.connected = true
		s.scenario = "idle"
	case "partial-pid-support":
		if err := s.attachment.AttachVehicle("fk8", true, false); err != nil {
			return err
		}
		s.connected = true
		s.scenario = "idle"
	case "ecu-timeout":
		s.attachment.Fail("ECU request timeout")
		s.connected = false
	case "adapter-failure":
		s.attachment.Fail("adapter probe failed")
		s.connected = false
	default:
		return fmt.Errorf("unknown simulator action %q", action)
	}
	return nil
}
func (s *Simulator) Start(ctx context.Context) error {
	s.mu.Lock()
	if s.started {
		s.mu.Unlock()
		return nil
	}
	ctx, s.cancel = context.WithCancel(ctx)
	s.started = true
	s.mu.Unlock()
	go s.run(ctx)
	return nil
}
func (s *Simulator) Stop(context.Context) error {
	s.mu.Lock()
	if s.cancel != nil {
		s.cancel()
	}
	s.started = false
	s.mu.Unlock()
	return nil
}
func (s *Simulator) Readings() <-chan telemetry.Snapshot { return s.readings }
func (s *Simulator) Status() telemetry.ProviderStatus {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return telemetry.ProviderStatus{Name: "simulator", Connected: s.connected, Scenario: s.scenario, UpdateHz: 1 / s.interval.Seconds()}
}
func (s *Simulator) SetScenario(v string) error {
	valid := false
	for _, x := range Scenarios {
		if x == v {
			valid = true
		}
	}
	if !valid {
		return fmt.Errorf("unknown scenario %q", v)
	}
	s.mu.Lock()
	s.scenario = v
	s.connected = v != "connection-loss"
	s.mu.Unlock()
	return nil
}
func (s *Simulator) run(ctx context.Context) {
	ticker := time.NewTicker(s.interval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case now := <-ticker.C:
			snap := s.next(now)
			select {
			case s.readings <- snap:
			default:
				<-s.readings
				s.readings <- snap
			}
		}
	}
}
func (s *Simulator) next(now time.Time) telemetry.Snapshot {
	s.mu.Lock()
	s.phase += s.interval.Seconds()
	p, scenario, connected := s.phase, s.scenario, s.connected
	s.mu.Unlock()
	rpm, speed, throttle, boost := 2600+900*math.Sin(p*.7), 38+17*math.Sin(p*.22), 34+18*math.Sin(p*.7), 4+5*math.Sin(p*.7)
	switch scenario {
	case "ignition-off":
		rpm, speed, throttle, boost = 0, 0, 0, -14.5
	case "startup":
		rpm, speed, throttle, boost = 1200+300*math.Exp(-p*.1), 0, 4, -10
	case "idle":
		rpm, speed, throttle, boost = 780+20*math.Sin(p*2), 0, 2, -10
	case "highway":
		rpm, speed, throttle, boost = 2800+120*math.Sin(p), 70+2*math.Sin(p*.2), 25, 1
	case "hard-acceleration":
		rpm, speed, throttle, boost = 3500+2800*(.5+.5*math.Sin(p*.7)), 55+35*(.5+.5*math.Sin(p*.35)), 92, 18
	case "track":
		rpm, speed, throttle, boost = 4600+2200*math.Sin(p*1.1), 80+38*math.Sin(p*.34), 65+30*math.Sin(p*.8), 13+8*math.Sin(p*.8)
	}
	v := func(x float64) telemetry.Reading { return telemetry.Value(x, "simulator", now) }
	miss := func() telemetry.Reading { return telemetry.Missing("simulator", now) }
	coolant, oil, oilPressure := 198+3*math.Sin(p*.05), 218+5*math.Sin(p*.04), 24+rpm/330
	if scenario == "overheating" {
		coolant, oil = 244, 272
	}
	if scenario == "low-oil-pressure" {
		oilPressure = 7
	}
	snapshot := telemetry.Snapshot{Attachment: s.attachment.Snapshot(), Timestamp: now, EngineRunning: connected && rpm > 0, RPM: v(rpm), VehicleSpeedMPH: v(speed), BoostPSI: v(boost), ManifoldPressure: v(14.7 + boost), ThrottlePercent: v(throttle), AcceleratorPedalPercent: v(throttle * .96), EngineLoadPercent: v(math.Min(100, throttle+15)), CoolantTempF: v(coolant), OilTempF: v(oil), OilPressurePSI: v(oilPressure), IntakeAirTempF: v(82 + math.Max(0, boost)*1.4), AmbientTempF: v(76), AFR: v(14.7 - math.Max(0, boost)*.17), Lambda: v(1 - math.Max(0, boost)*.011), BatteryVoltage: v(13.9 + .1*math.Sin(p)), FuelLevelPercent: v(67), FuelPressurePSI: v(48 + boost), Gear: v(math.Max(1, math.Min(6, math.Ceil(speed/18)))), IgnitionTiming: v(18), InjectorDutyPercent: v(math.Min(95, throttle*.8)), WastegateDutyPercent: v(math.Max(0, boost*3)), SteeringAngle: v(8 * math.Sin(p*.4)), LateralG: v(.2 * math.Sin(p*.4)), LongitudinalG: v(.15 * math.Sin(p*.7)), GPSLatitude: miss(), GPSLongitude: miss(), GPSSpeed: v(speed), ProviderConnected: connected, ProviderLatencyMS: v(3 + math.Abs(math.Sin(p))*2)}
	if !connected {
		snapshot.RPM = miss()
		snapshot.VehicleSpeedMPH = miss()
		snapshot.BoostPSI = miss()
		snapshot.CoolantTempF = miss()
		snapshot.OilTempF = miss()
		snapshot.OilPressurePSI = miss()
		snapshot.IntakeAirTempF = miss()
		snapshot.ThrottlePercent = miss()
		snapshot.AFR = miss()
		snapshot.BatteryVoltage = miss()
		snapshot.Gear = miss()
	}
	if scenario == "sensor-disconnect" {
		snapshot.OilTempF = miss()
		snapshot.OilPressurePSI = miss()
	}
	return snapshot
}
