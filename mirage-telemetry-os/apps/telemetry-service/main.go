package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/mirage-motorworks/telemetry-os/internal/attach"
	"github.com/mirage-motorworks/telemetry-os/internal/config"
	"github.com/mirage-motorworks/telemetry-os/internal/discovery"
	"github.com/mirage-motorworks/telemetry-os/internal/liveobd"
	"github.com/mirage-motorworks/telemetry-os/internal/obd"
	"github.com/mirage-motorworks/telemetry-os/internal/server"
	"github.com/mirage-motorworks/telemetry-os/internal/simulator"
	"github.com/mirage-motorworks/telemetry-os/internal/transport"
	"github.com/mirage-motorworks/telemetry-os/internal/vehicle"
)

func main() {
	profile := flag.String("vehicle-profile", env("VEHICLE_PROFILE", "fk8"), "vehicle profile id")
	root := flag.String("config-dir", env("CONFIG_DIR", "config"), "configuration directory")
	addr := flag.String("listen", env("LISTEN_ADDR", "127.0.0.1:8080"), "HTTP listen address")
	flag.Parse()

	cfg, err := config.Load(*root, *profile, env("UI_THEME", "mirage-retro"), env("CLIENT_BRANDING", "mirage-motorworks"))
	if err != nil {
		log.Fatalf("configuration: %v", err)
	}
	provider := simulator.New(50 * time.Millisecond)
	api := server.New(cfg, provider, env("DEV_MODE", "false") == "true")
	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer cancel()
	if err := provider.Start(ctx); err != nil {
		log.Fatal(err)
	}
	if cfg.OBD.AutoDiscovery {
		discoverer := discovery.New(time.Second, cfg.OBD.PreferredPort)
		if err := discoverer.Start(ctx); err != nil {
			log.Printf("device discovery: %v", err)
		} else {
			go watchDevices(ctx, discoverer, provider, api, cfg)
		}
		defer discoverer.Stop(context.Background())
	}
	log.Printf("MIRAGE VEHICLE INTERFACE\n----------------------------------------\nTelemetry Service........... ONLINE\nDashboard................... ONLINE\nMetrics..................... ONLINE\n\nVehicle Interface........... WAITING\n\nConnect OBD-II interface...")
	go func() {
		for event := range provider.Attachment().Events() {
			log.Printf("VEHICLE INTERFACE // %-28s %s", event.State, event.Message)
		}
	}()
	httpServer := &http.Server{Addr: *addr, Handler: api.Handler(), ReadHeaderTimeout: 5 * time.Second}
	go func() {
		log.Printf("Mirage Telemetry OS listening on http://%s (%s, %s)", *addr, cfg.Vehicle.OSName, cfg.Theme.Name)
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal(err)
		}
	}()
	<-ctx.Done()
	shutdown, done := context.WithTimeout(context.Background(), 5*time.Second)
	defer done()
	_ = httpServer.Shutdown(shutdown)
	_ = provider.Stop(shutdown)
}

func watchDevices(ctx context.Context, discoverer discovery.DeviceDiscovery, provider *simulator.Simulator, api *server.API, cfg config.Active) {
	for {
		select {
		case <-ctx.Done():
			return
		case event := <-discoverer.Events():
			if event.Type == discovery.DeviceRemoved {
				provider.SetLive(false)
				provider.Attachment().RemoveAdapter()
				continue
			}
			go probeDevice(ctx, event.Device.Port, provider, api, cfg)
		}
	}
}
func probeDevice(ctx context.Context, port string, provider *simulator.Simulator, api *server.API, cfg config.Active) {
	log.Printf("OBD USB // candidate detected // port=%s baud=%d", port, cfg.OBD.BaudRate)
	serialTransport := transport.NewELMSerial(port, cfg.OBD.BaudRate, time.Duration(cfg.OBD.ConnectionTimeoutSecs)*time.Second)
	adapter := obd.NewELM327Adapter(serialTransport, port, cfg.OBD.Initialization)
	probeCtx, cancel := context.WithTimeout(ctx, 12*time.Second)
	defer cancel()
	if err := adapter.Open(probeCtx); err != nil {
		log.Printf("OBD USB // open failed // port=%s error=%v", port, err)
		return
	}
	log.Printf("OBD USB // serial port open // port=%s", port)
	defer adapter.Close()
	if err := adapter.Initialize(probeCtx); err != nil {
		provider.Attachment().Fail("adapter initialization failed: " + err.Error())
		log.Printf("OBD ADAPTER // initialization failed // error=%v", err)
		return
	}
	log.Printf("OBD ADAPTER // initialized // commands=%s", strings.Join(cfg.OBD.Initialization, ","))
	info, err := adapter.Identify(probeCtx)
	if err != nil {
		log.Printf("OBD ADAPTER // identity probe failed // error=%v", err)
		return
	}
	log.Printf("OBD ADAPTER // ATI response // %s", info.Version)
	provider.Attachment().AttachAdapter(port)
	provider.Attachment().SetAdapterInfo(info)
	log.Printf("ADAPTER READY // %s // %s", info.Version, port)
	attempt := 0
	for {
		select {
		case <-ctx.Done():
			return
		case <-time.After(2 * time.Second):
		}
		attempt++
		provider.Attachment().Transition(attach.NegotiatingProtocol, fmt.Sprintf("ECU probe attempt %d: requesting supported PIDs", attempt))
		for _, command := range []string{"ATSP0", "ATCAF1", "ATH0"} {
			if _, resetErr := serialTransport.Exchange(ctx, command); resetErr != nil {
				log.Printf("OBD ECU PROBE // attempt=%d // adapter setup %s failed // error=%v", attempt, command, resetErr)
			}
		}
		voltageLines, voltageErr := serialTransport.Exchange(ctx, "ATRV")
		if voltageErr != nil {
			log.Printf("OBD ECU PROBE // attempt=%d // adapter voltage unavailable // error=%v", attempt, voltageErr)
		} else {
			log.Printf("OBD ECU PROBE // attempt=%d // adapter voltage=%s", attempt, strings.Join(voltageLines, " "))
		}
		protocolBefore, protocolBeforeErr := adapter.DetectProtocol(ctx)
		if protocolBeforeErr != nil {
			log.Printf("OBD ECU PROBE // attempt=%d // protocol query failed // error=%v", attempt, protocolBeforeErr)
		} else {
			log.Printf("OBD ECU PROBE // attempt=%d // protocol=%s // sending Mode 01 PID 00", attempt, protocolBefore.Name)
		}
		mode := liveobd.ModeLegacy
		supported, queryErr := obd.DiscoverSupported(ctx, adapter)
		provider.Attachment().RecordRequest(queryErr)
		if queryErr != nil {
			log.Printf("OBD ECU PROBE // attempt=%d // legacy OBD unavailable // trying SAE J1979-2 // error=%v", attempt, queryErr)
			provider.Attachment().Transition(attach.NegotiatingProtocol, fmt.Sprintf("ECU probe attempt %d: trying OBD-on-UDS", attempt))
			var setupErr error
			for _, command := range []string{"ATSP7", "ATCAF1", "ATH0", "ATSH18DB33F1"} {
				if _, err := serialTransport.Exchange(ctx, command); err != nil {
					setupErr = fmt.Errorf("%s: %w", command, err)
					break
				}
			}
			if setupErr == nil {
				supported, queryErr = obd.DiscoverSupportedUDS(ctx, adapter)
				provider.Attachment().RecordRequest(queryErr)
				mode = liveobd.ModeUDS
			} else {
				queryErr = setupErr
			}
			if queryErr != nil {
				message := fmt.Sprintf("ECU probe %d failed for legacy OBD and OBD-on-UDS: %v", attempt, queryErr)
				provider.Attachment().Transition(attach.WaitingForVehicle, message)
				log.Printf("OBD ECU PROBE // attempt=%d // no vehicle response // error=%v", attempt, queryErr)
				continue
			}
		}
		if len(supported) == 0 {
			provider.Attachment().Transition(attach.WaitingForVehicle, fmt.Sprintf("ECU probe %d returned no supported PIDs", attempt))
			log.Printf("OBD ECU PROBE // attempt=%d // response decoded but no PIDs were advertised", attempt)
			continue
		}
		log.Printf("OBD ECU DETECTED // attempt=%d // supported-pids=%d", attempt, len(supported))
		provider.Attachment().Transition(attach.IdentifyingVehicle, "ECU responded; reading standardized VIN")
		var vinResponse obd.Response
		var vinErr error
		if mode == liveobd.ModeUDS {
			vinResponse, vinErr = adapter.Query(ctx, obd.Request{Service: 0x22, Parameters: []byte{0xF8, 0x02}, Operation: obd.ReadOnly, Description: "OBD-on-UDS VIN"})
		} else {
			vinPID := byte(0x02)
			vinResponse, vinErr = adapter.Query(ctx, obd.Request{Service: 0x09, PID: &vinPID, Operation: obd.ReadOnly, Description: "VIN"})
		}
		provider.Attachment().RecordRequest(vinErr)
		vin := ""
		if vinErr == nil {
			if mode == liveobd.ModeUDS {
				vin, vinErr = obd.DecodeUDSVINResponse(vinResponse.Raw)
			} else {
				vin, vinErr = obd.DecodeVINResponse(vinResponse.Raw)
			}
		}
		if vinErr != nil {
			log.Printf("OBD VIN // unavailable // error=%v // continuing with configured profile evidence", vinErr)
		} else {
			log.Printf("OBD VIN // received and validated // characters=%d", len(vin))
		}
		protocol, protocolErr := adapter.DetectProtocol(ctx)
		if protocolErr != nil {
			protocol.Name = "UNKNOWN"
		}
		log.Printf("OBD ECU // negotiated protocol=%s // telemetry mode=%s", protocol.Name, mode)
		evidence := vehicle.Evidence{VIN: vin, Protocol: protocol.Name, SupportedPIDs: map[string]bool{}}
		if mode == liveobd.ModeUDS {
			evidence.TelemetrySource = "obd-on-uds"
			protocol.Name += " / SAE J1979-2"
			evidence.Protocol = protocol.Name
		}
		var decoders vehicle.ChainDecoder
		if databaseURL := env("VPIC_DATABASE_URL", ""); databaseURL != "" {
			decoders = append(decoders, vehicle.PostgresVINDecoder{DSN: databaseURL})
		}
		if env("VIN_LOOKUP_MODE", "cache-first") != "offline" {
			decoders = append(decoders, vehicle.VPICVINDecoder{})
		}
		var fallback vehicle.VINDecoder
		if len(decoders) > 0 {
			fallback = decoders
		}
		decoder := &vehicle.CacheDecoder{Path: env("VIN_CACHE_PATH", "data/vin-cache.json"), Fallback: fallback}
		if decoded, decodeErr := decoder.Decode(ctx, vin); decodeErr == nil {
			evidence.ManufacturerHint = decoded.Manufacturer
			if evidence.ManufacturerHint == "" {
				evidence.ManufacturerHint = decoded.Make
			}
			evidence.ModelHint = decoded.Model
			evidence.TrimHint = decoded.Trim
			evidence.ModelYearHint = decoded.ModelYear
			log.Printf("OBD VIN PROFILE // local/cache-first decode // make=%s model=%s year=%d", decoded.Make, decoded.Model, decoded.ModelYear)
		} else {
			log.Printf("OBD VIN PROFILE // detailed decode unavailable; continuing with offline WMI/year // %v", decodeErr)
		}
		_ = provider.Attachment().ConnectEvidence(evidence, supported, protocol.Name)
		provider.SetLive(true)
		if env("AUTO_RECORD_SESSIONS", "true") == "true" && api.ActiveSession() == nil {
			label := provider.Attachment().Snapshot().Profile.OSName
			if summary, sessionErr := api.StartSession(label); sessionErr != nil {
				log.Printf("DRIVE SESSION // automatic start failed // %v", sessionErr)
			} else {
				log.Printf("DRIVE SESSION // recording // id=%s path=%s", summary.ID, summary.Path)
				defer func() {
					if stopped, stopErr := api.StopSession(); stopErr == nil {
						log.Printf("DRIVE SESSION // complete // id=%s samples=%d duration=%dms", stopped.ID, stopped.Samples, stopped.DurationMS)
					}
				}()
			}
		}
		serialTransport.SetTimeout(time.Duration(cfg.OBD.LiveTimeoutSecs) * time.Second)
		log.Printf("LIVE OBD TELEMETRY // %d supported metrics // capture with: bin/mirage capture start", provider.Attachment().Snapshot().SupportedMetrics)
		poller := liveobd.Poller{Adapter: adapter, Attachment: provider.Attachment(), Publish: provider.PublishLive, Interval: 50 * time.Millisecond, Mode: mode, Observe: func(observation liveobd.Observation) {
			_ = api.RecordOBD(observation, observation.Error != "")
		}}
		if pollErr := poller.Run(ctx, supported); pollErr != nil && ctx.Err() == nil {
			provider.SetLive(false)
			provider.Attachment().IgnitionOff()
			log.Printf("LIVE OBD TELEMETRY STOPPED // %v", pollErr)
		}
		return
	}
}

func env(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
