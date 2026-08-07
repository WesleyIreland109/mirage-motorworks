package server

import (
	"encoding/json"
	"os"
	"testing"
	"time"

	"github.com/mirage-motorworks/telemetry-os/internal/telemetry"
)

func TestCaptureRedactsSensitiveVehicleData(t *testing.T) {
	file, err := os.CreateTemp(t.TempDir(), "capture-*.jsonl")
	if err != nil {
		t.Fatal(err)
	}
	api := &API{captureFile: file}
	now := time.Now()
	snapshot := telemetry.Snapshot{Timestamp: now, GPSLatitude: telemetry.Value(41, "gps", now), GPSLongitude: telemetry.Value(-87, "gps", now)}
	snapshot.Attachment.Identity.VIN.Value = "SHHFK8730MU000001"
	api.record(snapshot)
	if _, err = file.Seek(0, 0); err != nil {
		t.Fatal(err)
	}
	var captured telemetry.Snapshot
	if err = json.NewDecoder(file).Decode(&captured); err != nil {
		t.Fatal(err)
	}
	if captured.Attachment.Identity.VIN.Value != "REDACTED" || captured.GPSLatitude.Available || captured.GPSLongitude.Available {
		t.Fatalf("sensitive fields were not redacted: %+v", captured)
	}
}
