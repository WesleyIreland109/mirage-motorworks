package telemetry

import (
	"context"
	"time"

	"github.com/mirage-motorworks/telemetry-os/internal/attach"
)

type Availability string

const (
	Available   Availability = "AVAILABLE"
	Unavailable Availability = "UNAVAILABLE"
	Stale       Availability = "STALE"
	Error       Availability = "ERROR"
	Unknown     Availability = "UNKNOWN"
)

type Reading struct {
	Value     *float64     `json:"value" yaml:"value"`
	Available bool         `json:"available" yaml:"available"`
	Status    Availability `json:"status" yaml:"status"`
	Source    string       `json:"source" yaml:"source"`
	Quality   *float64     `json:"quality,omitempty" yaml:"quality,omitempty"`
	Timestamp time.Time    `json:"timestamp" yaml:"timestamp"`
}

func Value(v float64, source string, at time.Time) Reading {
	return Reading{Value: &v, Available: true, Status: Available, Source: source, Timestamp: at}
}
func Missing(source string, at time.Time) Reading {
	return Reading{Available: false, Status: Unavailable, Source: source, Timestamp: at}
}

type Snapshot struct {
	Attachment              attach.Snapshot `json:"attachment"`
	Timestamp               time.Time       `json:"timestamp"`
	EngineRunning           bool            `json:"engine_running"`
	RPM                     Reading         `json:"rpm"`
	VehicleSpeedMPH         Reading         `json:"vehicle_speed_mph"`
	BoostPSI                Reading         `json:"boost_psi"`
	ManifoldPressure        Reading         `json:"manifold_pressure"`
	ThrottlePercent         Reading         `json:"throttle_percent"`
	AcceleratorPedalPercent Reading         `json:"accelerator_pedal_percent"`
	EngineLoadPercent       Reading         `json:"engine_load_percent"`
	CoolantTempF            Reading         `json:"coolant_temp_f"`
	OilTempF                Reading         `json:"oil_temp_f"`
	OilPressurePSI          Reading         `json:"oil_pressure_psi"`
	IntakeAirTempF          Reading         `json:"intake_air_temp_f"`
	AmbientTempF            Reading         `json:"ambient_temp_f"`
	AFR                     Reading         `json:"afr"`
	Lambda                  Reading         `json:"lambda"`
	BatteryVoltage          Reading         `json:"battery_voltage"`
	FuelLevelPercent        Reading         `json:"fuel_level_percent"`
	FuelPressurePSI         Reading         `json:"fuel_pressure_psi"`
	Gear                    Reading         `json:"gear"`
	IgnitionTiming          Reading         `json:"ignition_timing"`
	InjectorDutyPercent     Reading         `json:"injector_duty_percent"`
	WastegateDutyPercent    Reading         `json:"wastegate_duty_percent"`
	SteeringAngle           Reading         `json:"steering_angle"`
	LateralG                Reading         `json:"lateral_g"`
	LongitudinalG           Reading         `json:"longitudinal_g"`
	GPSLatitude             Reading         `json:"gps_latitude"`
	GPSLongitude            Reading         `json:"gps_longitude"`
	GPSSpeed                Reading         `json:"gps_speed"`
	ProviderConnected       bool            `json:"provider_connected"`
	ProviderLatencyMS       Reading         `json:"provider_latency_ms"`
}

type ProviderStatus struct {
	Name      string  `json:"name"`
	Connected bool    `json:"connected"`
	Scenario  string  `json:"scenario"`
	UpdateHz  float64 `json:"update_hz"`
	Error     string  `json:"error,omitempty"`
}
type Provider interface {
	Start(context.Context) error
	Stop(context.Context) error
	Readings() <-chan Snapshot
	Status() ProviderStatus
}
