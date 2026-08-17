package obd

import (
	"context"
	"fmt"
	"testing"
)

func TestReadOnlySafetyPolicy(t *testing.T) {
	pid := byte(0x0C)
	if err := EnforceReadOnly(Request{Service: 0x01, PID: &pid, Operation: ReadOnly}); err != nil {
		t.Fatal(err)
	}
	for _, request := range []Request{{Service: 0x04, Operation: ReadOnly}, {Service: 0x01, Operation: VehicleMutation}, {Service: 0x09, Operation: Programming}} {
		if err := EnforceReadOnly(request); err == nil {
			t.Fatalf("unsafe request accepted: %+v", request)
		}
	}
}
func TestCapabilityBitmapAndPartialSupport(t *testing.T) {
	pids := DecodeSupportedPIDs(0, []byte{0x08, 0x18, 0, 0})
	if !pids[5] || !pids[12] || !pids[13] {
		t.Fatalf("pids=%v", pids)
	}
	caps := Capabilities(pids)
	if !caps["coolantTemperature"].Available || caps["oilTemperature"].Available {
		t.Fatalf("caps=%v", caps)
	}
}
func TestStandardDecoders(t *testing.T) {
	rpm, err := DecodeStandardPID(0x0C, []byte{0x1F, 0x40})
	if err != nil || rpm != 2000 {
		t.Fatalf("rpm=%v err=%v", rpm, err)
	}
	temperature, _ := DecodeStandardPID(0x05, []byte{100})
	if temperature != 60 {
		t.Fatalf("temperature=%v", temperature)
	}
	if _, err = DecodeStandardPID(0x99, []byte{1}); err == nil {
		t.Fatal("unknown PID accepted")
	}
}

func TestDecodeVINResponseFromHeaderedISOTPFrames(t *testing.T) {
	lines := []string{
		"7E81014490201315632",
		"7E8214141324341304A",
		"7E82243303030303031",
	}
	vin, err := DecodeVINResponse(lines)
	if err != nil || vin != "1V2AA2CA0JC000001" {
		t.Fatalf("vin=%q err=%v", vin, err)
	}
}

func TestDecodeVINResponseFromELMReassembledLines(t *testing.T) {
	lines := []string{"014", "0: 49 02 01 31 56 32", "1: 41 41 32 43 41 30 4A", "2: 43 30 30 30 30 30 31"}
	vin, err := DecodeVINResponse(lines)
	if err != nil || vin != "1V2AA2CA0JC000001" {
		t.Fatalf("vin=%q err=%v", vin, err)
	}
}

func TestDiscoverSupportedUDSAndDecodeVIN(t *testing.T) {
	adapter := &scriptedAdapter{responses: map[string][]string{
		"22F400": {"0762F40000180000"},
		"22F802": {"101462F80233435A", "21525A3248353054", "224D303030303031"},
	}}
	pids, err := DiscoverSupportedUDS(context.Background(), adapter)
	if err != nil || !pids[0x0C] || !pids[0x0D] {
		t.Fatalf("pids=%v err=%v", pids, err)
	}
	vin, err := DecodeUDSVINResponse(adapter.responses["22F802"])
	if err != nil || vin != "3CZRZ2H50TM000001" {
		t.Fatalf("vin=%q err=%v", vin, err)
	}
}

type scriptedAdapter struct{ responses map[string][]string }

func (s *scriptedAdapter) Open(context.Context) error                    { return nil }
func (s *scriptedAdapter) Close() error                                  { return nil }
func (s *scriptedAdapter) Identify(context.Context) (AdapterInfo, error) { return AdapterInfo{}, nil }
func (s *scriptedAdapter) Initialize(context.Context) error              { return nil }
func (s *scriptedAdapter) DetectProtocol(context.Context) (ProtocolInfo, error) {
	return ProtocolInfo{}, nil
}
func (s *scriptedAdapter) Status() AdapterStatus { return AdapterStatus{} }
func (s *scriptedAdapter) Query(_ context.Context, request Request) (Response, error) {
	command := fmt.Sprintf("%02X", request.Service)
	for _, parameter := range request.Parameters {
		command += fmt.Sprintf("%02X", parameter)
	}
	return Response{Raw: s.responses[command]}, nil
}
