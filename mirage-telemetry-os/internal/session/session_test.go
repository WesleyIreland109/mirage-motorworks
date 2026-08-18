package session

import (
	"context"
	"path/filepath"
	"testing"
	"time"

	"github.com/mirage-motorworks/telemetry-os/internal/telemetry"
)

func TestRecordListAndReplay(t *testing.T) {
	manager := New(t.TempDir())
	summary, err := manager.Start("test drive")
	if err != nil {
		t.Fatal(err)
	}
	now := time.Now()
	for index := 0; index < 2; index++ {
		snapshot := telemetry.Snapshot{Timestamp: now.Add(time.Duration(index) * time.Millisecond), RPM: telemetry.Value(float64(1000+index), "test", now)}
		snapshot.Attachment.Identity.VIN.Value = "3CZRZ2H50TM000001"
		if err := manager.Record(snapshot); err != nil {
			t.Fatal(err)
		}
	}
	if err := manager.RecordOBD(map[string]any{"pid": "0C", "raw": []string{"410C1F40"}}, false); err != nil {
		t.Fatal(err)
	}
	stopped, err := manager.Stop()
	if err != nil || stopped.Samples != 2 || stopped.OBDRequests != 1 {
		t.Fatalf("summary=%+v err=%v", stopped, err)
	}
	listed, err := manager.List()
	if err != nil || len(listed) != 1 || listed[0].Attachment.Identity.VIN.Value != "REDACTED" {
		t.Fatalf("listed=%+v err=%v", listed, err)
	}
	count := 0
	err = Replay(context.Background(), filepath.Join(summary.Path, "telemetry.jsonl"), 100, func(snapshot telemetry.Snapshot) { count++ })
	if err != nil || count != 2 {
		t.Fatalf("replayed=%d err=%v", count, err)
	}
}
