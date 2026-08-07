package main

import (
	"bytes"
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"

	"github.com/mirage-motorworks/telemetry-os/internal/attach"
	"github.com/mirage-motorworks/telemetry-os/internal/discovery"
	"github.com/mirage-motorworks/telemetry-os/internal/obd"
	"github.com/mirage-motorworks/telemetry-os/internal/transport"
)

func main() {
	server := flag.String("server", "http://127.0.0.1:8080", "telemetry service URL")
	flag.Parse()
	args := flag.Args()
	if len(args) < 2 {
		usage()
	}
	switch args[0] + " " + args[1] {
	case "vehicle watch":
		watch(*server)
	case "vehicle probe":
		probe()
	case "vehicle inspect":
		inspect(*server, len(args) > 2 && args[2] == "--json")
	case "capture start":
		post(*server+"/api/capture/start", nil)
	case "capture stop":
		post(*server+"/api/capture/stop", nil)
	default:
		usage()
	}
}
func usage() {
	fmt.Fprintln(os.Stderr, "usage: mirage [--server URL] vehicle watch|probe|inspect [--json]\n       mirage [--server URL] capture start|stop")
	os.Exit(2)
}
func watch(server string) {
	last := attach.State("")
	for {
		snap, err := get(server + "/api/vehicle")
		if err != nil {
			fmt.Println("TELEMETRY SERVICE........... OFFLINE")
			time.Sleep(time.Second)
			continue
		}
		if snap.State != last {
			fmt.Printf("%-30s %s\n", snap.State, snap.Message)
			last = snap.State
		}
		time.Sleep(300 * time.Millisecond)
	}
}
func probe() {
	d := discovery.New(time.Second, "auto")
	items, err := d.Candidates(context.Background())
	if err != nil {
		fatal(err)
	}
	if len(items) == 0 {
		fmt.Println("NO USB SERIAL OBD CANDIDATES DETECTED")
		return
	}
	for _, item := range items {
		fmt.Printf("CANDIDATE................... %s (%s)\n", item.Port, item.Platform)
		serialTransport := transport.NewELMSerial(item.Port, 115200, 2*time.Second)
		adapter := obd.NewELM327Adapter(serialTransport, item.Port, []string{"ATE0", "ATL0", "ATS0", "ATH0", "ATSP0"})
		ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
		if err := adapter.Open(ctx); err != nil {
			fmt.Printf("PROBE........................ FAILED: %v\n", err)
			cancel()
			continue
		}
		info, identifyErr := adapter.Identify(ctx)
		_ = adapter.Close()
		cancel()
		if identifyErr != nil {
			fmt.Printf("PROBE........................ NOT ELM-COMPATIBLE: %v\n", identifyErr)
			continue
		}
		fmt.Printf("ADAPTER...................... %s\nIDENTITY..................... %s\n", info.Name, info.Version)
	}
}
func inspect(server string, raw bool) {
	snap, err := get(server + "/api/vehicle/inspect")
	if err != nil {
		fatal(err)
	}
	if raw {
		data, _ := json.MarshalIndent(snap, "", "  ")
		fmt.Println(string(data))
		return
	}
	fmt.Printf("Adapter..................... %s\nSerial Port.................. %s\nStatus....................... %s\nVIN.......................... %s\nManufacturer................. %s\nVehicle...................... %s\nGeneration................... %s\nProtocol..................... %s\nECU.......................... %v\nSupported Metrics............ %d\nVehicle Profile.............. %s\nProfile Confidence........... %.0f%%\nActive Dashboard OS.......... %s\n", snap.Adapter.Name, snap.Adapter.Port, snap.State, snap.Identity.VIN.Value, snap.Identity.Manufacturer.Value, snap.Identity.Model.Value, snap.Identity.Generation.Value, snap.Adapter.Protocol, snap.ECUConnected, snap.SupportedMetrics, snap.Profile.ProfileID, snap.Profile.Score*100, snap.Profile.OSName)
}
func get(url string) (attach.Snapshot, error) {
	var out attach.Snapshot
	res, err := http.Get(url)
	if err != nil {
		return out, err
	}
	defer res.Body.Close()
	if res.StatusCode != 200 {
		return out, fmt.Errorf("HTTP %d", res.StatusCode)
	}
	err = json.NewDecoder(res.Body).Decode(&out)
	return out, err
}
func post(url string, body any) {
	var reader io.Reader
	if body != nil {
		data, _ := json.Marshal(body)
		reader = bytes.NewReader(data)
	}
	req, _ := http.NewRequest(http.MethodPost, url, reader)
	req.Header.Set("Content-Type", "application/json")
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		fatal(err)
	}
	defer res.Body.Close()
	data, _ := io.ReadAll(res.Body)
	if res.StatusCode >= 300 {
		fatal(fmt.Errorf("HTTP %d: %s", res.StatusCode, data))
	}
	fmt.Print(string(data))
}
func fatal(err error) { fmt.Fprintln(os.Stderr, err); os.Exit(1) }
