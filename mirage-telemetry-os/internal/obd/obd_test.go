package obd

import "testing"

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
