package discovery

import (
	"context"
	"path/filepath"
	"runtime"
	"sort"
	"strings"
	"sync"
	"time"

	serial "go.bug.st/serial"
)

type EventType string

const (
	DeviceAdded   EventType = "device-added"
	DeviceRemoved EventType = "device-removed"
)

type Device struct{ Port, VID, PID, Serial, Platform string }
type Event struct {
	Type   EventType
	Device Device
	At     time.Time
}
type DeviceDiscovery interface {
	Events() <-chan Event
	Start(context.Context) error
	Stop(context.Context) error
	Candidates(context.Context) ([]Device, error)
}

type PollingDiscovery struct {
	interval      time.Duration
	preferredPort string
	events        chan Event
	cancel        context.CancelFunc
	mu            sync.Mutex
	known         map[string]Device
}

func New(interval time.Duration, preferredPort string) *PollingDiscovery {
	return &PollingDiscovery{interval: interval, preferredPort: preferredPort, events: make(chan Event, 16), known: map[string]Device{}}
}
func (d *PollingDiscovery) Events() <-chan Event { return d.events }
func (d *PollingDiscovery) Start(ctx context.Context) error {
	d.mu.Lock()
	ctx, d.cancel = context.WithCancel(ctx)
	d.mu.Unlock()
	go d.run(ctx)
	return nil
}
func (d *PollingDiscovery) Stop(context.Context) error {
	d.mu.Lock()
	if d.cancel != nil {
		d.cancel()
	}
	d.mu.Unlock()
	return nil
}
func (d *PollingDiscovery) Candidates(context.Context) ([]Device, error) {
	if d.preferredPort != "" && d.preferredPort != "auto" {
		return []Device{{Port: d.preferredPort, Platform: runtime.GOOS}}, nil
	}
	patterns := map[string][]string{"linux": {"/dev/ttyUSB*", "/dev/ttyACM*", "/dev/serial/by-id/*"}, "darwin": {"/dev/cu.usbserial-*", "/dev/cu.usbmodem*"}}[runtime.GOOS]
	ports := []string{}
	if runtime.GOOS == "windows" {
		all, err := serial.GetPortsList()
		if err != nil {
			return nil, err
		}
		for _, port := range all {
			if strings.HasPrefix(strings.ToUpper(port), "COM") {
				ports = append(ports, port)
			}
		}
	}
	for _, pattern := range patterns {
		matches, _ := filepath.Glob(pattern)
		ports = append(ports, matches...)
	}
	sort.Strings(ports)
	out := make([]Device, 0, len(ports))
	for _, port := range ports {
		out = append(out, Device{Port: port, Platform: runtime.GOOS})
	}
	return out, nil
}
func (d *PollingDiscovery) run(ctx context.Context) {
	ticker := time.NewTicker(d.interval)
	defer ticker.Stop()
	d.scan(ctx)
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			d.scan(ctx)
		}
	}
}
func (d *PollingDiscovery) scan(ctx context.Context) {
	currentList, _ := d.Candidates(ctx)
	current := map[string]Device{}
	for _, device := range currentList {
		current[device.Port] = device
		if _, ok := d.known[device.Port]; !ok {
			d.emit(Event{Type: DeviceAdded, Device: device, At: time.Now()})
		}
	}
	for port, device := range d.known {
		if _, ok := current[port]; !ok {
			d.emit(Event{Type: DeviceRemoved, Device: device, At: time.Now()})
		}
	}
	d.known = current
}
func (d *PollingDiscovery) emit(event Event) {
	select {
	case d.events <- event:
	default:
	}
}

// KnownAdapter reports whether USB metadata is explicitly allowed. Empty VID/PID
// data remains a probe candidate, but never counts as positively identified.
func KnownAdapter(device Device, allowed []string) bool {
	for _, id := range allowed {
		if id == device.VID+":"+device.PID {
			return true
		}
	}
	return false
}
