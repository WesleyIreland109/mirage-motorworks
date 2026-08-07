package server

import (
	"encoding/json"
	"fmt"
	"github.com/gorilla/websocket"
	"github.com/mirage-motorworks/telemetry-os/internal/config"
	"github.com/mirage-motorworks/telemetry-os/internal/simulator"
	"github.com/mirage-motorworks/telemetry-os/internal/telemetry"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"sync"
	"sync/atomic"
	"time"
)

type API struct {
	cfg                                                                                      config.Active
	provider                                                                                 *simulator.Simulator
	dev                                                                                      bool
	started                                                                                  time.Time
	current                                                                                  atomic.Pointer[telemetry.Snapshot]
	clientsMu                                                                                sync.RWMutex
	clients                                                                                  map[chan telemetry.Snapshot]struct{}
	registry                                                                                 *prometheus.Registry
	samples                                                                                  prometheus.Counter
	wsClients                                                                                prometheus.Gauge
	wsMessages                                                                               prometheus.Counter
	rpm, speed, boost, coolant, oil, oilPressure, iat, throttle, battery, connected, latency prometheus.Gauge
	captureMu                                                                                sync.Mutex
	captureFile                                                                              *os.File
}

func New(cfg config.Active, p *simulator.Simulator, dev bool) *API {
	a := &API{cfg: cfg, provider: p, dev: dev, started: time.Now(), clients: map[chan telemetry.Snapshot]struct{}{}, registry: prometheus.NewRegistry()}
	a.initMetrics()
	go a.consume()
	return a
}
func (a *API) initMetrics() {
	gauge := func(name, help string) prometheus.Gauge {
		g := prometheus.NewGauge(prometheus.GaugeOpts{Name: name, Help: help})
		a.registry.MustRegister(g)
		return g
	}
	a.samples = prometheus.NewCounter(prometheus.CounterOpts{Name: "mirage_vehicle_samples_received_total", Help: "Telemetry samples received."})
	a.wsClients = gauge("mirage_backend_websocket_clients", "Connected WebSocket clients.")
	a.wsMessages = prometheus.NewCounter(prometheus.CounterOpts{Name: "mirage_backend_websocket_messages_total", Help: "WebSocket messages sent."})
	a.rpm = gauge("mirage_vehicle_rpm", "Engine speed in RPM.")
	a.speed = gauge("mirage_vehicle_speed_mph", "Vehicle speed in MPH.")
	a.boost = gauge("mirage_vehicle_boost_psi", "Boost pressure in PSI.")
	a.coolant = gauge("mirage_vehicle_coolant_temperature_fahrenheit", "Coolant temperature.")
	a.oil = gauge("mirage_vehicle_oil_temperature_fahrenheit", "Oil temperature.")
	a.oilPressure = gauge("mirage_vehicle_oil_pressure_psi", "Oil pressure.")
	a.iat = gauge("mirage_vehicle_intake_air_temperature_fahrenheit", "Intake air temperature.")
	a.throttle = gauge("mirage_vehicle_throttle_percent", "Throttle opening.")
	a.battery = gauge("mirage_vehicle_battery_voltage", "Battery voltage.")
	a.connected = gauge("mirage_vehicle_provider_connected", "Provider connection state.")
	a.latency = gauge("mirage_vehicle_provider_latency_seconds", "Provider latency.")
	a.registry.MustRegister(a.samples, a.wsMessages, prometheus.NewGaugeFunc(prometheus.GaugeOpts{Name: "mirage_backend_uptime_seconds", Help: "Backend uptime."}, func() float64 { return time.Since(a.started).Seconds() }), prometheus.NewGaugeFunc(prometheus.GaugeOpts{Name: "mirage_backend_build_info", Help: "Build information.", ConstLabels: prometheus.Labels{"version": "0.1.0"}}, func() float64 { return 1 }))
	a.registry.MustRegister(
		prometheus.NewGaugeFunc(prometheus.GaugeOpts{Name: "mirage_vehicle_interface_connected", Help: "Whether an OBD adapter is attached."}, func() float64 {
			if a.provider.Attachment().Snapshot().Adapter.Port != "" {
				return 1
			}
			return 0
		}),
		prometheus.NewGaugeFunc(prometheus.GaugeOpts{Name: "mirage_vehicle_ecu_connected", Help: "Whether a vehicle ECU is connected."}, func() float64 {
			if a.provider.Attachment().Snapshot().ECUConnected {
				return 1
			}
			return 0
		}),
		prometheus.NewGaugeFunc(prometheus.GaugeOpts{Name: "mirage_vehicle_profile_match_confidence", Help: "Selected vehicle profile confidence."}, func() float64 { return a.provider.Attachment().Snapshot().Profile.Score }),
		prometheus.NewGaugeFunc(prometheus.GaugeOpts{Name: "mirage_vehicle_supported_metrics", Help: "Number of supported normalized metrics."}, func() float64 { return float64(a.provider.Attachment().Snapshot().SupportedMetrics) }),
		prometheus.NewGaugeFunc(prometheus.GaugeOpts{Name: "mirage_vehicle_obd_requests_total", Help: "Read-only OBD requests attempted."}, func() float64 { _, requests, _ := a.provider.Attachment().Counts(); return float64(requests) }),
		prometheus.NewGaugeFunc(prometheus.GaugeOpts{Name: "mirage_vehicle_obd_request_errors_total", Help: "Read-only OBD request failures."}, func() float64 { _, _, failures := a.provider.Attachment().Counts(); return float64(failures) }),
		prometheus.NewGaugeFunc(prometheus.GaugeOpts{Name: "mirage_vehicle_reconnects_total", Help: "Vehicle reconnect attempts."}, func() float64 { reconnects, _, _ := a.provider.Attachment().Counts(); return float64(reconnects) }),
		prometheus.NewGaugeFunc(prometheus.GaugeOpts{Name: "mirage_vehicle_telemetry_age_seconds", Help: "Age of the latest telemetry snapshot."}, func() float64 {
			if current := a.current.Load(); current != nil {
				return time.Since(current.Timestamp).Seconds()
			}
			return 0
		}),
	)
}
func set(g prometheus.Gauge, r telemetry.Reading) {
	if r.Available && r.Value != nil {
		g.Set(*r.Value)
	}
}
func (a *API) consume() {
	for snap := range a.provider.Readings() {
		copy := snap
		a.current.Store(&copy)
		a.record(snap)
		a.samples.Inc()
		set(a.rpm, snap.RPM)
		set(a.speed, snap.VehicleSpeedMPH)
		set(a.boost, snap.BoostPSI)
		set(a.coolant, snap.CoolantTempF)
		set(a.oil, snap.OilTempF)
		set(a.oilPressure, snap.OilPressurePSI)
		set(a.iat, snap.IntakeAirTempF)
		set(a.throttle, snap.ThrottlePercent)
		set(a.battery, snap.BatteryVoltage)
		if snap.ProviderConnected {
			a.connected.Set(1)
		} else {
			a.connected.Set(0)
		}
		if snap.ProviderLatencyMS.Value != nil {
			a.latency.Set(*snap.ProviderLatencyMS.Value / 1000)
		}
		a.clientsMu.RLock()
		for ch := range a.clients {
			select {
			case ch <- snap:
			default:
			}
		}
		a.clientsMu.RUnlock()
	}
}
func (a *API) Handler() http.Handler {
	m := http.NewServeMux()
	m.HandleFunc("/api/health", func(w http.ResponseWriter, r *http.Request) {
		a.json(w, map[string]any{"status": "ok", "version": "0.1.0"})
	})
	m.HandleFunc("/api/status", func(w http.ResponseWriter, r *http.Request) {
		a.json(w, map[string]any{"provider": a.provider.Status(), "uptime_seconds": time.Since(a.started).Seconds(), "version": "0.1.0"})
	})
	m.HandleFunc("/api/config/active", func(w http.ResponseWriter, r *http.Request) { a.json(w, a.cfg) })
	m.HandleFunc("/api/telemetry/current", func(w http.ResponseWriter, r *http.Request) {
		if s := a.current.Load(); s != nil {
			a.json(w, s)
			return
		}
		http.Error(w, "telemetry not ready", http.StatusServiceUnavailable)
	})
	m.HandleFunc("/api/simulator/scenarios", func(w http.ResponseWriter, r *http.Request) { a.json(w, simulator.Scenarios) })
	m.HandleFunc("/api/simulator/scenario", a.scenario)
	m.HandleFunc("/api/simulator/actions", func(w http.ResponseWriter, r *http.Request) { a.json(w, simulator.Actions) })
	m.HandleFunc("/api/simulator/action", a.action)
	m.HandleFunc("/api/vehicle", func(w http.ResponseWriter, r *http.Request) { a.json(w, a.provider.Attachment().Snapshot()) })
	m.HandleFunc("/api/vehicle/inspect", func(w http.ResponseWriter, r *http.Request) { a.json(w, a.provider.Attachment().Snapshot()) })
	m.HandleFunc("/api/capture/start", a.captureStart)
	m.HandleFunc("/api/capture/stop", a.captureStop)
	m.HandleFunc("/ws/telemetry", a.websocket)
	m.Handle("/metrics", promhttp.HandlerFor(a.registry, promhttp.HandlerOpts{}))
	return cors(m)
}
func (a *API) scenario(w http.ResponseWriter, r *http.Request) {
	if !a.dev {
		http.Error(w, "development controls disabled", http.StatusNotFound)
		return
	}
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", 405)
		return
	}
	var body struct {
		Scenario string `json:"scenario"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1024)).Decode(&body); err != nil {
		http.Error(w, "invalid JSON", 400)
		return
	}
	if err := a.provider.SetScenario(body.Scenario); err != nil {
		http.Error(w, err.Error(), 400)
		return
	}
	a.json(w, a.provider.Status())
}
func (a *API) action(w http.ResponseWriter, r *http.Request) {
	if !a.dev {
		http.Error(w, "development controls disabled", http.StatusNotFound)
		return
	}
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var body struct {
		Action string `json:"action"`
	}
	if json.NewDecoder(http.MaxBytesReader(w, r.Body, 1024)).Decode(&body) != nil {
		http.Error(w, "invalid JSON", http.StatusBadRequest)
		return
	}
	if err := a.provider.Action(body.Action); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	a.json(w, a.provider.Attachment().Snapshot())
}
func (a *API) captureStart(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	a.captureMu.Lock()
	defer a.captureMu.Unlock()
	if a.captureFile != nil {
		http.Error(w, "capture already active", http.StatusConflict)
		return
	}
	if err := os.MkdirAll("captures", 0700); err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	path := filepath.Join("captures", fmt.Sprintf("capture-%s.jsonl", time.Now().UTC().Format("20060102T150405Z")))
	file, err := os.OpenFile(path, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0600)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	a.captureFile = file
	a.json(w, map[string]string{"status": "recording", "path": path})
}
func (a *API) captureStop(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	a.captureMu.Lock()
	defer a.captureMu.Unlock()
	if a.captureFile == nil {
		http.Error(w, "capture not active", http.StatusConflict)
		return
	}
	_ = a.captureFile.Close()
	a.captureFile = nil
	a.json(w, map[string]string{"status": "stopped"})
}
func (a *API) record(snapshot telemetry.Snapshot) {
	a.captureMu.Lock()
	defer a.captureMu.Unlock()
	if a.captureFile == nil {
		return
	}
	snapshot.Attachment.Identity.VIN.Value = "REDACTED"
	_ = json.NewEncoder(a.captureFile).Encode(snapshot)
}
func (a *API) websocket(w http.ResponseWriter, r *http.Request) {
	up := websocket.Upgrader{CheckOrigin: func(r *http.Request) bool {
		origin := r.Header.Get("Origin")
		if origin == "" {
			return true
		}
		u, err := url.Parse(origin)
		return err == nil && (u.Host == r.Host || u.Host == "localhost:5173" || u.Host == "127.0.0.1:5173")
	}}
	conn, err := up.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	defer conn.Close()
	ch := make(chan telemetry.Snapshot, 1)
	a.clientsMu.Lock()
	a.clients[ch] = struct{}{}
	a.wsClients.Inc()
	a.clientsMu.Unlock()
	defer func() { a.clientsMu.Lock(); delete(a.clients, ch); a.wsClients.Dec(); a.clientsMu.Unlock() }()
	for snap := range ch {
		if err := conn.WriteJSON(snap); err != nil {
			return
		}
		a.wsMessages.Inc()
	}
}
func (a *API) json(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(v)
}
func cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "http://localhost:5173")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(204)
			return
		}
		next.ServeHTTP(w, r)
	})
}
