package liveobd

import (
	"testing"
	"time"

	"github.com/mirage-motorworks/telemetry-os/internal/attach"
)

func TestApplyNormalizesUnitsAndSource(t *testing.T) {
	now := time.Now()
	snapshot := emptySnapshot(now, attach.Snapshot{}, "obd2-standard")
	apply(&snapshot, 0x0D, 100, now, "obd2-standard")
	apply(&snapshot, 0x05, 90, now, "obd2-standard")
	apply(&snapshot, 0x0B, 150, now, "obd2-standard")
	if got := *snapshot.VehicleSpeedMPH.Value; got < 62.13 || got > 62.14 {
		t.Fatalf("speed = %v", got)
	}
	if got := *snapshot.CoolantTempF.Value; got != 194 {
		t.Fatalf("coolant = %v", got)
	}
	if got := *snapshot.BoostPSI.Value; got < 7.05 || got > 7.07 {
		t.Fatalf("boost = %v", got)
	}
	if snapshot.RPM.Available {
		t.Fatal("unread metrics must remain unavailable")
	}
	if snapshot.BoostPSI.Source != "obd2-standard" {
		t.Fatalf("source = %q", snapshot.BoostPSI.Source)
	}
}
