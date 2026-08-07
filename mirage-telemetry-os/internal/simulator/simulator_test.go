package simulator

import (
	"context"
	"testing"
	"time"
)

func TestScenarioAndLifecycle(t *testing.T) {
	s := New(5 * time.Millisecond)
	if err := s.SetScenario("not-real"); err == nil {
		t.Fatal("expected invalid scenario error")
	}
	if err := s.SetScenario("hard-acceleration"); err != nil {
		t.Fatal(err)
	}
	if err := s.Action("attach-adapter"); err != nil {
		t.Fatal(err)
	}
	if err := s.Action("attach-fk8"); err != nil {
		t.Fatal(err)
	}
	if err := s.SetScenario("hard-acceleration"); err != nil {
		t.Fatal(err)
	}
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	if err := s.Start(ctx); err != nil {
		t.Fatal(err)
	}
	select {
	case snap := <-s.Readings():
		if !snap.RPM.Available || snap.RPM.Value == nil || *snap.RPM.Value < 3000 {
			t.Fatalf("unexpected RPM: %+v", snap.RPM)
		}
	case <-time.After(time.Second):
		t.Fatal("no snapshot")
	}
	_ = s.Stop(context.Background())
}
func TestAttachmentLifecycle(t *testing.T) {
	s := New(time.Second)
	if got := s.Attachment().Snapshot().State; got != "WAITING_FOR_ADAPTER" {
		t.Fatalf("state=%s", got)
	}
	if err := s.Action("attach-adapter"); err != nil {
		t.Fatal(err)
	}
	if got := s.Attachment().Snapshot().State; got != "WAITING_FOR_VEHICLE" {
		t.Fatalf("state=%s", got)
	}
	if err := s.Action("attach-fk8"); err != nil {
		t.Fatal(err)
	}
	if got := s.Attachment().Snapshot(); got.State != "CONNECTED" || got.Profile.ProfileID != "fk8" || !got.ECUConnected {
		t.Fatalf("snapshot=%+v", got)
	}
	if err := s.Action("ignition-off"); err != nil {
		t.Fatal(err)
	}
	if got := s.Attachment().Snapshot().State; got != "WAITING_FOR_VEHICLE" {
		t.Fatalf("state=%s", got)
	}
	if err := s.Action("attach-fk8"); err != nil {
		t.Fatal(err)
	}
	if err := s.Action("remove-adapter"); err != nil {
		t.Fatal(err)
	}
	if got := s.Attachment().Snapshot().State; got != "WAITING_FOR_ADAPTER" {
		t.Fatalf("state=%s", got)
	}
}
func TestUnavailableIsNotZero(t *testing.T) {
	s := New(time.Second)
	_ = s.SetScenario("sensor-disconnect")
	snap := s.next(time.Now())
	if snap.OilTempF.Available || snap.OilTempF.Value != nil {
		t.Fatal("disconnected sensor must be unavailable, not zero")
	}
}
