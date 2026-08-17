package attach

import (
	"fmt"
	"sync"
	"time"

	"github.com/mirage-motorworks/telemetry-os/internal/obd"
	"github.com/mirage-motorworks/telemetry-os/internal/vehicle"
)

type State string

const (
	Starting                State = "STARTING"
	WaitingForAdapter       State = "WAITING_FOR_ADAPTER"
	AdapterDetected         State = "ADAPTER_DETECTED"
	InitializingAdapter     State = "INITIALIZING_ADAPTER"
	WaitingForVehicle       State = "WAITING_FOR_VEHICLE"
	NegotiatingProtocol     State = "NEGOTIATING_PROTOCOL"
	IdentifyingVehicle      State = "IDENTIFYING_VEHICLE"
	DiscoveringCapabilities State = "DISCOVERING_CAPABILITIES"
	MatchingProfile         State = "MATCHING_PROFILE"
	Connected               State = "CONNECTED"
	VehicleDisconnected     State = "VEHICLE_DISCONNECTED"
	AdapterRemoved          State = "ADAPTER_REMOVED"
	ConnectionError         State = "CONNECTION_ERROR"
)

type Event struct {
	Sequence uint64    `json:"sequence"`
	State    State     `json:"state"`
	Previous State     `json:"previous"`
	Message  string    `json:"message"`
	At       time.Time `json:"at"`
}
type AdapterView struct{ Name, Version, Port, Protocol, Status string }
type Snapshot struct {
	State            State                     `json:"state"`
	Message          string                    `json:"message"`
	Adapter          AdapterView               `json:"adapter"`
	Identity         vehicle.Identity          `json:"identity"`
	Capabilities     map[string]obd.Capability `json:"capabilities"`
	Profile          vehicle.ProfileMatch      `json:"profile"`
	ECUConnected     bool                      `json:"ecuConnected"`
	SupportedMetrics int                       `json:"supportedMetrics"`
	LastTransition   time.Time                 `json:"lastTransition"`
	Sequence         uint64                    `json:"sequence"`
	Error            string                    `json:"error,omitempty"`
}
type Controller struct {
	mu            sync.RWMutex
	snapshot      Snapshot
	events        chan Event
	reconnects    uint64
	requests      uint64
	requestErrors uint64
}

func NewController() *Controller {
	c := &Controller{events: make(chan Event, 32)}
	c.snapshot = Snapshot{State: Starting, Capabilities: map[string]obd.Capability{}, LastTransition: time.Now()}
	c.Transition(WaitingForAdapter, "Connect OBD-II interface...")
	return c
}
func (c *Controller) Events() <-chan Event { return c.events }
func (c *Controller) Snapshot() Snapshot   { c.mu.RLock(); defer c.mu.RUnlock(); return c.snapshot }
func (c *Controller) Transition(next State, message string) {
	c.mu.Lock()
	prev := c.snapshot.State
	c.snapshot.State = next
	c.snapshot.Message = message
	c.snapshot.LastTransition = time.Now()
	c.snapshot.Sequence++
	event := Event{Sequence: c.snapshot.Sequence, State: next, Previous: prev, Message: message, At: c.snapshot.LastTransition}
	c.mu.Unlock()
	select {
	case c.events <- event:
	default:
	}
}
func (c *Controller) AttachAdapter(port string) {
	c.mu.Lock()
	c.snapshot.Adapter = AdapterView{Name: "vLinker / ELM-compatible", Port: port, Status: "detected"}
	c.mu.Unlock()
	c.Transition(AdapterDetected, "USB interface detected")
	c.Transition(InitializingAdapter, "Probing ELM-compatible adapter")
	c.mu.Lock()
	c.snapshot.Adapter.Status = "ready"
	c.mu.Unlock()
	c.Transition(WaitingForVehicle, "Adapter ready; waiting for ECU")
}
func (c *Controller) SetAdapterInfo(info obd.AdapterInfo) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if info.Name != "" {
		c.snapshot.Adapter.Name = info.Name
	}
	if info.Version != "" {
		c.snapshot.Adapter.Version = info.Version
	}
	if info.Port != "" {
		c.snapshot.Adapter.Port = info.Port
	}
}
func (c *Controller) RemoveAdapter() {
	c.Transition(AdapterRemoved, "OBD adapter removed")
	c.mu.Lock()
	c.snapshot.Adapter = AdapterView{}
	c.snapshot.ECUConnected = false
	c.snapshot.Identity = vehicle.Identity{}
	c.snapshot.Capabilities = map[string]obd.Capability{}
	c.snapshot.Profile = vehicle.ProfileMatch{}
	c.mu.Unlock()
	c.Transition(WaitingForAdapter, "Connect OBD-II interface...")
}
func (c *Controller) IgnitionOff() {
	c.mu.Lock()
	c.snapshot.ECUConnected = false
	c.mu.Unlock()
	c.Transition(VehicleDisconnected, "Vehicle ECU unavailable")
	c.Transition(WaitingForVehicle, "Waiting for ignition / ECU")
}
func (c *Controller) AttachVehicle(kind string, partial, unsupportedVIN bool) error {
	if c.Snapshot().Adapter.Port == "" {
		return fmt.Errorf("attach an adapter first")
	}
	c.Transition(NegotiatingProtocol, "Negotiating OBD protocol")
	c.mu.Lock()
	c.snapshot.Adapter.Protocol = "ISO 15765-4 CAN"
	c.mu.Unlock()
	c.Transition(IdentifyingVehicle, "Reading standardized vehicle information")
	evidence := simulatedEvidence(kind, unsupportedVIN)
	return c.ConnectEvidence(evidence, simulatedPIDs(partial), "ISO 15765-4 CAN")
}
func (c *Controller) ConnectEvidence(evidence vehicle.Evidence, pids map[byte]bool, protocol string) error {
	if c.Snapshot().Adapter.Port == "" {
		return fmt.Errorf("attach an adapter first")
	}
	c.mu.Lock()
	c.snapshot.Adapter.Protocol = protocol
	c.mu.Unlock()
	identity := vehicle.BasicIdentifier{Decoder: vehicle.BasicVINDecoder{}}.Identify(nil, evidence)
	c.Transition(DiscoveringCapabilities, "Discovering supported telemetry channels")
	caps := obd.Capabilities(pids)
	count := 0
	for name, cap := range caps {
		if evidence.TelemetrySource != "" {
			cap.Source = evidence.TelemetrySource
			caps[name] = cap
		}
		if cap.Available {
			count++
		}
	}
	c.Transition(MatchingProfile, "Selecting vehicle profile")
	profile := vehicle.MatchProfile(identity)
	c.mu.Lock()
	c.snapshot.Identity = identity
	c.snapshot.Capabilities = caps
	c.snapshot.SupportedMetrics = count
	c.snapshot.Profile = profile
	c.snapshot.ECUConnected = true
	c.mu.Unlock()
	c.Transition(Connected, "Starting "+profile.OSName)
	return nil
}
func (c *Controller) Fail(message string) {
	c.mu.Lock()
	c.snapshot.Error = message
	c.requestErrors++
	c.mu.Unlock()
	c.Transition(ConnectionError, message)
}
func (c *Controller) Counts() (uint64, uint64, uint64) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.reconnects, c.requests, c.requestErrors
}
func (c *Controller) RecordRequest(err error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.requests++
	if err != nil {
		c.requestErrors++
	}
}
func simulatedEvidence(kind string, unsupported bool) vehicle.Evidence {
	if unsupported {
		return vehicle.Evidence{VIN: "UNAVAILABLE"}
	}
	switch kind {
	case "fk8":
		return vehicle.Evidence{VIN: "SHHFK8730MU000001", ManufacturerHint: "Honda", ModelHint: "Civic Type R", GenerationHint: "FK8", TrimHint: "Type R", ModelYearHint: 2021}
	case "fl5":
		return vehicle.Evidence{VIN: "JHMFL5G40PX000001", ManufacturerHint: "Honda", ModelHint: "Civic Type R", GenerationHint: "FL5", TrimHint: "Type R", ModelYearHint: 2023}
	case "bronco":
		return vehicle.Evidence{VIN: "1FMDE5BH0MLA00001", ManufacturerHint: "Ford", ModelHint: "Bronco", GenerationHint: "Bronco", ModelYearHint: 2021}
	default:
		return vehicle.Evidence{VIN: "UNAVAILABLE"}
	}
}
func simulatedPIDs(partial bool) map[byte]bool {
	all := map[byte]bool{0x04: true, 0x05: true, 0x0B: true, 0x0C: true, 0x0D: true, 0x0F: true, 0x10: true, 0x11: true, 0x2F: true, 0x42: true, 0x44: true, 0x46: true, 0x49: true, 0x5C: true}
	if partial {
		for _, pid := range []byte{0x10, 0x2F, 0x44, 0x49, 0x5C} {
			delete(all, pid)
		}
	}
	return all
}
