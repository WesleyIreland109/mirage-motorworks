package main

import (
	"context"
	"flag"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/mirage-motorworks/telemetry-os/internal/config"
	"github.com/mirage-motorworks/telemetry-os/internal/discovery"
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
			go watchDevices(ctx, discoverer, provider, cfg)
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

func watchDevices(ctx context.Context, discoverer discovery.DeviceDiscovery, provider *simulator.Simulator, cfg config.Active) {
	for {
		select {
		case <-ctx.Done():
			return
		case event := <-discoverer.Events():
			if event.Type == discovery.DeviceRemoved {
				provider.Attachment().RemoveAdapter()
				continue
			}
			go probeDevice(ctx, event.Device.Port, provider, cfg)
		}
	}
}
func probeDevice(ctx context.Context, port string, provider *simulator.Simulator, cfg config.Active) {
	serialTransport := transport.NewELMSerial(port, cfg.OBD.BaudRate, 2*time.Second)
	adapter := obd.NewELM327Adapter(serialTransport, port, cfg.OBD.Initialization)
	probeCtx, cancel := context.WithTimeout(ctx, 12*time.Second)
	defer cancel()
	if err := adapter.Open(probeCtx); err != nil {
		return
	}
	defer adapter.Close()
	info, err := adapter.Identify(probeCtx)
	if err != nil {
		return
	}
	if err = adapter.Initialize(probeCtx); err != nil {
		provider.Attachment().Fail("adapter initialization failed: " + err.Error())
		return
	}
	provider.Attachment().AttachAdapter(port)
	log.Printf("ADAPTER READY // %s // %s", info.Version, port)
	for {
		select {
		case <-ctx.Done():
			return
		case <-time.After(2 * time.Second):
		}
		pid := byte(0)
		response, queryErr := adapter.Query(ctx, obd.Request{Service: 0x01, PID: &pid, Operation: obd.ReadOnly, Description: "supported PID discovery"})
		provider.Attachment().RecordRequest(queryErr)
		if queryErr != nil {
			continue
		}
		data := obd.HexBytes(response.Raw)
		supported := map[byte]bool{}
		for i := 0; i+5 < len(data); i++ {
			if data[i] == 0x41 && data[i+1] == 0x00 {
				supported = obd.DecodeSupportedPIDs(0, data[i+2:i+6])
				break
			}
		}
		if len(supported) == 0 {
			continue
		}
		vinPID := byte(0x02)
		vinResponse, vinErr := adapter.Query(ctx, obd.Request{Service: 0x09, PID: &vinPID, Operation: obd.ReadOnly, Description: "VIN"})
		provider.Attachment().RecordRequest(vinErr)
		vin := ""
		if vinErr == nil {
			vin, _ = obd.DecodeVINPayload(obd.HexBytes(vinResponse.Raw))
		}
		protocol, protocolErr := adapter.DetectProtocol(ctx)
		if protocolErr != nil {
			protocol.Name = "UNKNOWN"
		}
		_ = provider.Attachment().ConnectEvidence(vehicle.Evidence{VIN: vin, Protocol: protocol.Name, SupportedPIDs: map[string]bool{}}, supported, protocol.Name)
		return
	}
}

func env(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
