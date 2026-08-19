package main

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/mirage-motorworks/telemetry-os/internal/session"
)

func TestHasOBDReply(t *testing.T) {
	if !hasOBDReply([]string{"SEARCHING...", "7E8 06 41 00 BE 3E A8 13"}) {
		t.Fatal("expected Mode 01 PID 00 reply")
	}
	if hasOBDReply([]string{"NO DATA"}) {
		t.Fatal("NO DATA must not count as an OBD reply")
	}
}

func TestHasUDSReply(t *testing.T) {
	if !hasUDSReply([]string{"18DAF110 62 F4 0C 0D C0"}) {
		t.Fatal("expected OBD-on-UDS response")
	}
	if hasUDSReply([]string{"NO DATA"}) {
		t.Fatal("NO DATA must not be treated as an OBD-on-UDS response")
	}
}

func TestHasCANFrame(t *testing.T) {
	if hasCANFrame([]string{"STOPPED"}) {
		t.Fatal("ELM monitor terminator must not count as CAN traffic")
	}
	if !hasCANFrame([]string{"17F00010201000000000"}) {
		t.Fatal("expected hexadecimal CAN frame")
	}
}

func TestRecordSessionFinalizesOnInterrupt(t *testing.T) {
	started := make(chan struct{}, 1)
	stopped := make(chan struct{}, 1)
	summary := session.Summary{ID: "test-session", Label: "friend car", State: "recording", StartedAt: time.Now(), Path: "sessions/test-session"}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/api/session/start":
			started <- struct{}{}
			_ = json.NewEncoder(w).Encode(summary)
		case "/api/session/stop":
			summary.State = "complete"
			summary.Samples = 42
			summary.OBDRequests = 84
			summary.DurationMS = 1250
			stopped <- struct{}{}
			_ = json.NewEncoder(w).Encode(summary)
		default:
			http.NotFound(w, r)
		}
	}))
	defer server.Close()

	ctx, cancel := context.WithCancel(context.Background())
	var out bytes.Buffer
	done := make(chan error, 1)
	go func() { done <- recordSession(ctx, server.URL, "friend car", 15*time.Minute, &out) }()
	<-started
	cancel()
	select {
	case <-stopped:
	case <-time.After(time.Second):
		t.Fatal("session stop was not called after interruption")
	}
	if err := <-done; err != nil {
		t.Fatal(err)
	}
	if text := out.String(); !strings.Contains(text, "INTERRUPT RECEIVED") || !strings.Contains(text, "bin/mirage session replay test-session") {
		t.Fatalf("unexpected output:\n%s", text)
	}
}

func TestRecordSessionRejectsMoreThanFifteenMinutes(t *testing.T) {
	err := recordSession(context.Background(), "http://127.0.0.1:1", "test", 15*time.Minute+time.Second, &bytes.Buffer{})
	if err == nil || !strings.Contains(err.Error(), "no more than 15 minutes") {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestResolveSessionByFriendName(t *testing.T) {
	started := time.Date(2026, time.August, 19, 8, 30, 0, 0, time.UTC)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_ = json.NewEncoder(w).Encode([]session.Summary{{ID: "20260819T083000.000Z", Label: "Alex // DRIVE", State: "complete", StartedAt: started}})
	}))
	defer server.Close()
	id, err := resolveSession(server.URL, "Alex")
	if err != nil || id != "20260819T083000.000Z" {
		t.Fatalf("id=%q err=%v", id, err)
	}
}

func TestResolveSessionListsMultipleTimestampedChoices(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_ = json.NewEncoder(w).Encode([]session.Summary{
			{ID: "20260819T083000.000Z", Label: "Alex // SHORT TEST", State: "complete", StartedAt: time.Now()},
			{ID: "20260819T090000.000Z", Label: "Alex // DRIVE", State: "complete", StartedAt: time.Now()},
		})
	}))
	defer server.Close()
	_, err := resolveSession(server.URL, "Alex")
	if err == nil || !strings.Contains(err.Error(), "20260819T083000.000Z") || !strings.Contains(err.Error(), "20260819T090000.000Z") {
		t.Fatalf("unexpected error: %v", err)
	}
}
