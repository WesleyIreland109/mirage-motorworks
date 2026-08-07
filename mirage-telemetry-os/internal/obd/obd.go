package obd

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"strings"
)

type OperationClass string

const (
	ReadOnly        OperationClass = "read-only"
	VehicleMutation OperationClass = "vehicle-mutation"
	Programming     OperationClass = "programming"
)

type Request struct {
	Service     byte           `json:"service"`
	PID         *byte          `json:"pid,omitempty"`
	Operation   OperationClass `json:"operation"`
	Description string         `json:"description,omitempty"`
}

type Response struct {
	Raw  []string `json:"raw"`
	Data []byte   `json:"data"`
}
type AdapterInfo struct{ Name, Version, Port string }
type ProtocolInfo struct {
	Name   string
	Number int
}
type AdapterStatus struct {
	Open, Initialized bool
	Error             string
}

type Adapter interface {
	Open(context.Context) error
	Close() error
	Identify(context.Context) (AdapterInfo, error)
	Initialize(context.Context) error
	DetectProtocol(context.Context) (ProtocolInfo, error)
	Query(context.Context, Request) (Response, error)
	Status() AdapterStatus
}

type Transport interface {
	Open(context.Context) error
	Close() error
	Exchange(context.Context, string) ([]string, error)
}

func EnforceReadOnly(request Request) error {
	if request.Operation != ReadOnly {
		return fmt.Errorf("safety policy rejected %s operation", request.Operation)
	}
	switch request.Service {
	case 0x01, 0x03, 0x07, 0x09:
		return nil
	default:
		return fmt.Errorf("OBD service %02X is not allowed in read-only mode", request.Service)
	}
}

type ELM327Adapter struct {
	transport Transport
	init      []string
	status    AdapterStatus
	info      AdapterInfo
}

func NewELM327Adapter(transport Transport, port string, init []string) *ELM327Adapter {
	return &ELM327Adapter{transport: transport, init: append([]string(nil), init...), info: AdapterInfo{Name: "ELM-compatible", Port: port}}
}
func (a *ELM327Adapter) Open(ctx context.Context) error {
	if err := a.transport.Open(ctx); err != nil {
		return err
	}
	a.status.Open = true
	return nil
}
func (a *ELM327Adapter) Close() error {
	a.status.Open = false
	a.status.Initialized = false
	return a.transport.Close()
}
func (a *ELM327Adapter) Identify(ctx context.Context) (AdapterInfo, error) {
	lines, err := a.transport.Exchange(ctx, "ATI")
	if err != nil {
		return a.info, err
	}
	a.info.Version = strings.Join(lines, " ")
	return a.info, nil
}
func (a *ELM327Adapter) Initialize(ctx context.Context) error {
	for _, command := range a.init {
		if _, err := a.transport.Exchange(ctx, command); err != nil {
			return fmt.Errorf("%s: %w", command, err)
		}
	}
	a.status.Initialized = true
	return nil
}
func (a *ELM327Adapter) DetectProtocol(ctx context.Context) (ProtocolInfo, error) {
	lines, err := a.transport.Exchange(ctx, "ATDP")
	if err != nil {
		return ProtocolInfo{}, err
	}
	return ProtocolInfo{Name: strings.Join(lines, " ")}, nil
}
func (a *ELM327Adapter) Query(ctx context.Context, request Request) (Response, error) {
	if err := EnforceReadOnly(request); err != nil {
		return Response{}, err
	}
	command := fmt.Sprintf("%02X", request.Service)
	if request.PID != nil {
		command += fmt.Sprintf("%02X", *request.PID)
	}
	lines, err := a.transport.Exchange(ctx, command)
	return Response{Raw: lines}, err
}
func (a *ELM327Adapter) Status() AdapterStatus { return a.status }

type Capability struct {
	Available bool   `json:"available"`
	Source    string `json:"source,omitempty"`
	PID       string `json:"pid,omitempty"`
}
type MetricDefinition struct{ Name, PID string }

var StandardMetrics = []MetricDefinition{{"calculatedEngineLoad", "0104"}, {"coolantTemperature", "0105"}, {"fuelPressure", "010A"}, {"manifoldPressure", "010B"}, {"rpm", "010C"}, {"vehicleSpeed", "010D"}, {"timingAdvance", "010E"}, {"intakeAirTemperature", "010F"}, {"massAirflow", "0110"}, {"throttlePosition", "0111"}, {"fuelLevel", "012F"}, {"controlModuleVoltage", "0142"}, {"acceleratorPedalPosition", "0149"}, {"commandedEquivalenceRatio", "0144"}, {"ambientAirTemperature", "0146"}, {"oilTemperature", "015C"}}

func DecodeSupportedPIDs(base byte, data []byte) map[byte]bool {
	out := map[byte]bool{}
	if len(data) < 4 {
		return out
	}
	for bit := 0; bit < 32; bit++ {
		if data[bit/8]&(1<<uint(7-bit%8)) != 0 {
			out[base+byte(bit)+1] = true
		}
	}
	return out
}

func Capabilities(pids map[byte]bool) map[string]Capability {
	out := map[string]Capability{}
	for _, metric := range StandardMetrics {
		pid64, _ := strconv.ParseUint(metric.PID[2:], 16, 8)
		pid := byte(pid64)
		out[metric.Name] = Capability{Available: pids[pid], Source: "obd2-standard", PID: metric.PID}
	}
	return out
}

func DecodeVINPayload(data []byte) (string, error) {
	clean := make([]byte, 0, len(data))
	for _, b := range data {
		if b >= 32 && b <= 126 {
			clean = append(clean, b)
		}
	}
	vin := strings.TrimSpace(string(clean))
	if len(vin) > 17 {
		vin = vin[len(vin)-17:]
	}
	if len(vin) != 17 {
		return "", errors.New("malformed VIN response")
	}
	return vin, nil
}

func HexBytes(lines []string) []byte {
	var out []byte
	for _, line := range lines {
		clean := strings.NewReplacer(" ", "", "\t", "").Replace(line)
		if strings.Contains(strings.ToUpper(clean), "NODATA") {
			continue
		}
		for index := 0; index+1 < len(clean); index += 2 {
			value, err := strconv.ParseUint(clean[index:index+2], 16, 8)
			if err != nil {
				break
			}
			out = append(out, byte(value))
		}
	}
	return out
}

type OEMTelemetryExtension interface {
	Supports(any) bool
	Capabilities() []MetricDefinition
	Poll(context.Context, Adapter) (map[string]float64, error)
}
