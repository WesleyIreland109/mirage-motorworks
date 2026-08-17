package obd

import (
	"bytes"
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
	Parameters  []byte         `json:"parameters,omitempty"`
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
	case 0x01, 0x03, 0x07, 0x09, 0x22:
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
	for _, parameter := range request.Parameters {
		command += fmt.Sprintf("%02X", parameter)
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

func DiscoverSupported(ctx context.Context, adapter Adapter) (map[byte]bool, error) {
	all := map[byte]bool{}
	for _, base := range []byte{0x00, 0x20, 0x40, 0x60, 0x80, 0xA0, 0xC0} {
		response, err := adapter.Query(ctx, Request{Service: 0x01, PID: &base, Operation: ReadOnly, Description: "supported PID block"})
		if err != nil {
			return all, err
		}
		data, found := HexBytes(response.Raw), false
		for index := 0; index+5 < len(data); index++ {
			if data[index] == 0x41 && data[index+1] == base {
				for pid, yes := range DecodeSupportedPIDs(base, data[index+2:index+6]) {
					all[pid] = yes
				}
				found = true
				break
			}
		}
		if !found {
			return all, fmt.Errorf("supported PID %02X response malformed: %s", base, strings.Join(response.Raw, " | "))
		}
		if !all[base+0x20] {
			break
		}
	}
	return all, nil
}

func DiscoverSupportedUDS(ctx context.Context, adapter Adapter) (map[byte]bool, error) {
	all := map[byte]bool{}
	for _, base := range []byte{0x00, 0x20, 0x40, 0x60, 0x80, 0xA0, 0xC0} {
		response, err := adapter.Query(ctx, Request{Service: 0x22, Parameters: []byte{0xF4, base}, Operation: ReadOnly, Description: "OBD-on-UDS supported PID block"})
		if err != nil {
			return all, err
		}
		data := HexBytes(response.Raw)
		found := false
		for index := 0; index+6 < len(data); index++ {
			if data[index] == 0x62 && data[index+1] == 0xF4 && data[index+2] == base {
				for pid, yes := range DecodeSupportedPIDs(base, data[index+3:index+7]) {
					all[pid] = yes
				}
				found = true
			}
		}
		if !found {
			return all, fmt.Errorf("OBD-on-UDS supported PID %02X response malformed: %s", base, strings.Join(response.Raw, " | "))
		}
		if !all[base+0x20] {
			break
		}
	}
	return all, nil
}

func DecodeStandardPID(pid byte, data []byte) (float64, error) {
	if len(data) == 0 {
		return 0, errors.New("empty PID payload")
	}
	a := float64(data[0])
	b := 0.0
	if len(data) > 1 {
		b = float64(data[1])
	}
	switch pid {
	case 0x04:
		return a * 100 / 255, nil
	case 0x05, 0x0F, 0x46, 0x5C:
		return a - 40, nil
	case 0x0A:
		return a * 3, nil
	case 0x0B, 0x0D:
		return a, nil
	case 0x0C:
		if len(data) < 2 {
			return 0, errors.New("RPM requires two bytes")
		}
		return (a*256 + b) / 4, nil
	case 0x0E:
		return a/2 - 64, nil
	case 0x10:
		if len(data) < 2 {
			return 0, errors.New("MAF requires two bytes")
		}
		return (a*256 + b) / 100, nil
	case 0x11, 0x2F, 0x49:
		return a * 100 / 255, nil
	case 0x42:
		if len(data) < 2 {
			return 0, errors.New("voltage requires two bytes")
		}
		return (a*256 + b) / 1000, nil
	case 0x44:
		if len(data) < 2 {
			return 0, errors.New("lambda requires two bytes")
		}
		return (a*256 + b) * 2 / 65535, nil
	default:
		return 0, fmt.Errorf("no standard decoder for PID %02X", pid)
	}
}

func DecodeVINPayload(data []byte) (string, error) {
	for start := 0; start+17 <= len(data); start++ {
		candidate := strings.ToUpper(string(data[start : start+17]))
		if validVINBytes(candidate) {
			return candidate, nil
		}
	}
	return "", errors.New("malformed VIN response")
}

// DecodeVINResponse decodes Mode 09 PID 02 from ELM output. It supports both
// adapter-reassembled payloads and raw ISO-TP frames with 11-bit CAN headers.
func DecodeVINResponse(lines []string) (string, error) {
	return decodeVINResponse(lines, []byte{0x49, 0x02, 0x01})
}

func DecodeUDSVINResponse(lines []string) (string, error) {
	return decodeVINResponse(lines, []byte{0x62, 0xF8, 0x02})
}

func decodeVINResponse(lines []string, markerBytes []byte) (string, error) {
	var payload []byte
	for _, raw := range lines {
		line := strings.TrimSpace(raw)
		upper := strings.ToUpper(line)
		if line == "" || strings.Contains(upper, "SEARCHING") || strings.Contains(upper, "NO DATA") {
			continue
		}
		if colon := strings.IndexByte(line, ':'); colon >= 0 {
			line = line[colon+1:]
		}
		hex := strings.NewReplacer(" ", "", "\t", "").Replace(line)
		if len(hex) == 3 { // ELM multi-line total-length marker, e.g. 014.
			continue
		}
		if len(hex)%2 == 1 && len(hex) >= 5 { // 11-bit CAN header, e.g. 7E8.
			hex = hex[3:]
		}
		frame := parseHex(hex)
		if len(frame) == 0 {
			continue
		}
		switch frame[0] >> 4 {
		case 0: // ISO-TP single frame.
			length := int(frame[0] & 0x0F)
			if length <= len(frame)-1 {
				payload = append(payload, frame[1:1+length]...)
			}
		case 1: // ISO-TP first frame.
			if len(frame) >= 3 {
				payload = append(payload, frame[2:]...)
			}
		case 2: // ISO-TP consecutive frame.
			payload = append(payload, frame[1:]...)
		default: // Already reassembled by the adapter.
			payload = append(payload, frame...)
		}
	}
	if marker := bytes.Index(payload, markerBytes); marker >= 0 {
		if vin, err := DecodeVINPayload(payload[marker+len(markerBytes):]); err == nil {
			return vin, nil
		}
	}
	return DecodeVINPayload(payload)
}

func parseHex(value string) []byte {
	if len(value)%2 != 0 {
		return nil
	}
	out := make([]byte, 0, len(value)/2)
	for index := 0; index < len(value); index += 2 {
		parsed, err := strconv.ParseUint(value[index:index+2], 16, 8)
		if err != nil {
			return nil
		}
		out = append(out, byte(parsed))
	}
	return out
}

func validVINBytes(value string) bool {
	if len(value) != 17 {
		return false
	}
	for _, char := range value {
		if !(char >= '0' && char <= '9') && !(char >= 'A' && char <= 'Z') || char == 'I' || char == 'O' || char == 'Q' {
			return false
		}
	}
	return true
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
