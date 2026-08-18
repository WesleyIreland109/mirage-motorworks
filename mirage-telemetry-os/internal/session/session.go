package session

import (
	"bufio"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/mirage-motorworks/telemetry-os/internal/attach"
	"github.com/mirage-motorworks/telemetry-os/internal/telemetry"
)

type Summary struct {
	ID          string          `json:"id"`
	Label       string          `json:"label"`
	State       string          `json:"state"`
	StartedAt   time.Time       `json:"startedAt"`
	EndedAt     *time.Time      `json:"endedAt,omitempty"`
	DurationMS  int64           `json:"durationMs"`
	Samples     uint64          `json:"samples"`
	OBDRequests uint64          `json:"obdRequests"`
	OBDErrors   uint64          `json:"obdErrors"`
	Path        string          `json:"path"`
	Attachment  attach.Snapshot `json:"attachment"`
	DataVersion int             `json:"dataVersion"`
}

type Manager struct {
	mu      sync.Mutex
	root    string
	active  *Summary
	file    *os.File
	encoder *json.Encoder
	obdFile *os.File
	obd     *json.Encoder
}

func New(root string) *Manager { return &Manager{root: root} }

func (m *Manager) Start(label string) (Summary, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.active != nil {
		return *m.active, errors.New("session already active")
	}
	now := time.Now().UTC()
	id := now.Format("20060102T150405.000Z")
	directory := filepath.Join(m.root, id)
	if err := os.MkdirAll(directory, 0o700); err != nil {
		return Summary{}, err
	}
	file, err := os.OpenFile(filepath.Join(directory, "telemetry.jsonl"), os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0o600)
	if err != nil {
		return Summary{}, err
	}
	obdFile, err := os.OpenFile(filepath.Join(directory, "obd.jsonl"), os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0o600)
	if err != nil {
		_ = file.Close()
		return Summary{}, err
	}
	summary := &Summary{ID: id, Label: cleanLabel(label), State: "recording", StartedAt: now, Path: directory, DataVersion: 1}
	m.active, m.file, m.encoder, m.obdFile, m.obd = summary, file, json.NewEncoder(file), obdFile, json.NewEncoder(obdFile)
	if err := m.saveLocked(); err != nil {
		_ = file.Close()
		_ = obdFile.Close()
		m.active, m.file, m.encoder, m.obdFile, m.obd = nil, nil, nil, nil, nil
		return Summary{}, err
	}
	return *summary, nil
}

func (m *Manager) RecordOBD(value any, failed bool) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.active == nil {
		return nil
	}
	if err := m.obd.Encode(value); err != nil {
		return err
	}
	m.active.OBDRequests++
	if failed {
		m.active.OBDErrors++
	}
	return nil
}

func (m *Manager) Record(snapshot telemetry.Snapshot) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.active == nil {
		return nil
	}
	redact(&snapshot)
	if m.active.Samples == 0 {
		m.active.Attachment = snapshot.Attachment
		redactAttachment(&m.active.Attachment)
	}
	if err := m.encoder.Encode(snapshot); err != nil {
		return err
	}
	m.active.Samples++
	return nil
}

func (m *Manager) Stop() (Summary, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.active == nil {
		return Summary{}, errors.New("no active session")
	}
	ended := time.Now().UTC()
	m.active.EndedAt = &ended
	m.active.DurationMS = ended.Sub(m.active.StartedAt).Milliseconds()
	m.active.State = "complete"
	if err := m.file.Sync(); err != nil {
		return Summary{}, err
	}
	if err := m.file.Close(); err != nil {
		return Summary{}, err
	}
	if err := m.obdFile.Sync(); err != nil {
		return Summary{}, err
	}
	if err := m.obdFile.Close(); err != nil {
		return Summary{}, err
	}
	if err := m.saveLocked(); err != nil {
		return Summary{}, err
	}
	result := *m.active
	m.active, m.file, m.encoder, m.obdFile, m.obd = nil, nil, nil, nil, nil
	return result, nil
}

func (m *Manager) Status() *Summary {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.active == nil {
		return nil
	}
	copy := *m.active
	copy.DurationMS = time.Since(copy.StartedAt).Milliseconds()
	return &copy
}

func (m *Manager) List() ([]Summary, error) {
	entries, err := os.ReadDir(m.root)
	if errors.Is(err, os.ErrNotExist) {
		return []Summary{}, nil
	}
	if err != nil {
		return nil, err
	}
	result := make([]Summary, 0, len(entries))
	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}
		data, readErr := os.ReadFile(filepath.Join(m.root, entry.Name(), "summary.json"))
		if readErr != nil {
			continue
		}
		var summary Summary
		if json.Unmarshal(data, &summary) == nil {
			result = append(result, summary)
		}
	}
	sort.Slice(result, func(i, j int) bool { return result[i].StartedAt.After(result[j].StartedAt) })
	return result, nil
}

func (m *Manager) ReplayPath(id string) (string, error) {
	return m.sessionPath(id, "telemetry.jsonl")
}

func (m *Manager) Get(id string) (Summary, error) {
	path, err := m.sessionPath(id, "summary.json")
	if err != nil {
		return Summary{}, err
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return Summary{}, err
	}
	var summary Summary
	err = json.Unmarshal(data, &summary)
	return summary, err
}

func (m *Manager) TelemetryPath(id string) (string, error) {
	return m.sessionPath(id, "telemetry.jsonl")
}
func (m *Manager) OBDPath(id string) (string, error) { return m.sessionPath(id, "obd.jsonl") }

func (m *Manager) sessionPath(id, name string) (string, error) {
	if id == "" || filepath.Base(id) != id || strings.ContainsAny(id, `/\\`) {
		return "", errors.New("invalid session id")
	}
	path := filepath.Join(m.root, id, name)
	if _, err := os.Stat(path); err != nil {
		return "", err
	}
	return path, nil
}

func (m *Manager) saveLocked() error {
	data, err := json.MarshalIndent(m.active, "", "  ")
	if err != nil {
		return err
	}
	path := filepath.Join(m.active.Path, "summary.json")
	temporary := path + ".tmp"
	if err := os.WriteFile(temporary, append(data, '\n'), 0o600); err != nil {
		return err
	}
	return os.Rename(temporary, path)
}

func Replay(ctx context.Context, path string, speed float64, publish func(telemetry.Snapshot)) error {
	if speed <= 0 || speed > 100 {
		return errors.New("replay speed must be greater than zero and at most 100")
	}
	file, err := os.Open(path)
	if err != nil {
		return err
	}
	defer file.Close()
	decoder := json.NewDecoder(bufio.NewReader(file))
	var previous time.Time
	for {
		var snapshot telemetry.Snapshot
		if err := decoder.Decode(&snapshot); errors.Is(err, io.EOF) {
			return nil
		} else if err != nil {
			return fmt.Errorf("decode replay: %w", err)
		}
		if !previous.IsZero() {
			delay := time.Duration(float64(snapshot.Timestamp.Sub(previous)) / speed)
			if delay > 0 {
				timer := time.NewTimer(delay)
				select {
				case <-ctx.Done():
					timer.Stop()
					return ctx.Err()
				case <-timer.C:
				}
			}
		}
		previous = snapshot.Timestamp
		snapshot.Timestamp = time.Now()
		publish(snapshot)
	}
}

func redact(snapshot *telemetry.Snapshot) {
	redactAttachment(&snapshot.Attachment)
	snapshot.GPSLatitude = telemetry.Missing("session-redaction", snapshot.Timestamp)
	snapshot.GPSLongitude = telemetry.Missing("session-redaction", snapshot.Timestamp)
}

func redactAttachment(snapshot *attach.Snapshot) { snapshot.Identity.VIN.Value = "REDACTED" }

func cleanLabel(value string) string {
	value = strings.TrimSpace(strings.NewReplacer("\r", " ", "\n", " ").Replace(value))
	if value == "" {
		return "unlabeled"
	}
	return value
}
