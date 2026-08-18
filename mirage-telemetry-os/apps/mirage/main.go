package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/mirage-motorworks/telemetry-os/internal/attach"
	"github.com/mirage-motorworks/telemetry-os/internal/discovery"
	"github.com/mirage-motorworks/telemetry-os/internal/obd"
	"github.com/mirage-motorworks/telemetry-os/internal/transport"
	"github.com/mirage-motorworks/telemetry-os/internal/vehicle"
)

func main() {
	server := flag.String("server", "http://127.0.0.1:8080", "telemetry service URL")
	vehicleLabel := flag.String("vehicle", "unlabeled", "vehicle label stored in diagnostic reports")
	vehicleState := flag.String("state", "engine-running", "vehicle state: engine-running, ignition-on, or accessory")
	sampleDuration := flag.Duration("duration", 2*time.Minute, "duration for a read-only vehicle sample")
	sessionLabel := flag.String("label", "", "drive session label")
	replaySpeed := flag.Float64("speed", 1, "session replay speed multiplier")
	vinCache := flag.String("vin-cache", "data/vin-cache.json", "private local VIN decoder cache")
	vpicDatabase := flag.String("vpic-database", "", "local NHTSA vPIC PostgreSQL URL")
	onlineVIN := flag.Bool("online", false, "allow NHTSA vPIC fallback and cache the result")
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
	case "vehicle raw-probe":
		rawProbe(*vehicleLabel, *vehicleState)
	case "vehicle bus-scan":
		busScan(*vehicleLabel, *vehicleState)
	case "vehicle uds-sample":
		udsSample(*vehicleLabel, *vehicleState, *sampleDuration)
	case "vehicle inspect":
		inspect(*server, len(args) > 2 && args[2] == "--json")
	case "session start", "capture start":
		post(*server+"/api/session/start", map[string]string{"label": *sessionLabel})
	case "session stop", "capture stop":
		post(*server+"/api/session/stop", nil)
	case "session status":
		printURL(*server + "/api/session/status")
	case "session list":
		printURL(*server + "/api/sessions")
	case "session replay":
		if len(args) < 3 {
			fatal(fmt.Errorf("session replay requires a session id"))
		}
		post(*server+"/api/session/replay", map[string]any{"id": args[2], "speed": *replaySpeed})
	case "vin decode":
		if len(args) < 3 {
			fatal(fmt.Errorf("vin decode requires a VIN"))
		}
		decodeVIN(args[2], *vinCache, *vpicDatabase, *onlineVIN)
	case "vin cache-status":
		cache := &vehicle.CacheDecoder{Path: *vinCache}
		count, err := cache.Status()
		if err != nil {
			fatal(err)
		}
		fmt.Printf("VIN cache................... %s\nCached vehicles............. %d\n", *vinCache, count)
	default:
		usage()
	}
}
func usage() {
	fmt.Fprintln(os.Stderr, "usage: mirage [flags] vehicle watch|probe|raw-probe|bus-scan|uds-sample|inspect [--json]\n       mirage [--server URL] [--label LABEL] session start|stop|status|list\n       mirage [--server URL] [--speed N] session replay SESSION_ID\n       mirage [--vin-cache PATH] [--online] vin decode VIN|cache-status")
	os.Exit(2)
}

func udsSample(vehicleLabel, vehicleState string, duration time.Duration) {
	if duration <= 0 || duration > 30*time.Minute {
		fatal(fmt.Errorf("duration must be greater than zero and no more than 30 minutes"))
	}
	started := time.Now()
	diagnosticsDir := filepath.Join("captures", "diagnostics")
	if err := os.MkdirAll(diagnosticsDir, 0o755); err != nil {
		fatal(fmt.Errorf("create diagnostics directory: %w", err))
	}
	logPath := filepath.Join(diagnosticsDir, "obdonuds-sample-"+started.Format("20060102-150405")+".log")
	logFile, err := os.OpenFile(logPath, os.O_CREATE|os.O_WRONLY|os.O_EXCL, 0o600)
	if err != nil {
		fatal(fmt.Errorf("create OBD-on-UDS sample log: %w", err))
	}
	defer logFile.Close()
	out := io.MultiWriter(os.Stdout, logFile)
	fmt.Fprintf(out, "MIRAGE OBD-ON-UDS READ-ONLY SAMPLE\nSTARTED..................... %s\nVEHICLE LABEL............... %s\nDECLARED VEHICLE STATE...... %s\nDURATION.................... %s\nLOG FILE.................... %s\nSAFETY...................... SAE J1979-2 ReadDataByIdentifier only\n", started.Format(time.RFC3339), sanitizeLabel(vehicleLabel), sanitizeLabel(vehicleState), duration, logPath)
	defer func() { fmt.Fprintf(out, "FINISHED.................... %s\n", time.Now().Format(time.RFC3339)) }()

	items, err := discovery.New(time.Second, "auto").Candidates(context.Background())
	if err != nil || len(items) == 0 {
		fmt.Fprintf(out, "DISCOVERY ERROR............. %s\n", valueOrError(err, "no USB serial OBD candidate detected"))
		return
	}
	serialTransport := transport.NewELMSerial(items[0].Port, 115200, 3*time.Second)
	ctx := context.Background()
	if err := serialTransport.Open(ctx); err != nil {
		fmt.Fprintf(out, "SERIAL OPEN ERROR........... %v\n", err)
		return
	}
	defer serialTransport.Close()
	for _, command := range []string{"ATZ", "ATE0", "ATL0", "ATS0", "ATH1", "ATCAF1", "ATSP7", "ATSH18DB33F1", "ATRV"} {
		printExchange(out, ctx, serialTransport, command)
	}
	dids := []struct{ command, name string }{
		{"22F40C", "rpm"}, {"22F40D", "vehicle-speed"}, {"22F405", "coolant-temperature"},
		{"22F411", "throttle-position"}, {"22F42F", "fuel-level"}, {"22F442", "control-module-voltage"},
	}
	deadline := time.Now().Add(duration)
	requestCount, responseCount := 0, 0
	for time.Now().Before(deadline) {
		for _, did := range dids {
			if time.Now().After(deadline) {
				break
			}
			requestCount++
			lines, queryErr := serialTransport.Exchange(ctx, did.command)
			timestamp := time.Now().Format(time.RFC3339Nano)
			if queryErr != nil {
				fmt.Fprintf(out, "%s %-26s ERROR: %v\n", timestamp, did.name, queryErr)
			} else {
				if hasUDSReply(lines) {
					responseCount++
				}
				fmt.Fprintf(out, "%s %-26s %s\n", timestamp, did.name, strings.Join(lines, " | "))
			}
			time.Sleep(250 * time.Millisecond)
		}
	}
	fmt.Fprintf(out, "SUMMARY..................... requests=%d responses=%d\n", requestCount, responseCount)
}

func busScan(vehicleLabel, vehicleState string) {
	started := time.Now()
	diagnosticsDir := filepath.Join("captures", "diagnostics")
	if err := os.MkdirAll(diagnosticsDir, 0o755); err != nil {
		fatal(fmt.Errorf("create diagnostics directory: %w", err))
	}
	logPath := filepath.Join(diagnosticsDir, "passive-bus-"+started.Format("20060102-150405")+".log")
	logFile, err := os.OpenFile(logPath, os.O_CREATE|os.O_WRONLY|os.O_EXCL, 0o600)
	if err != nil {
		fatal(fmt.Errorf("create passive bus log: %w", err))
	}
	defer logFile.Close()
	out := io.MultiWriter(os.Stdout, logFile)
	fmt.Fprintf(out, "MIRAGE PASSIVE VEHICLE BUS SCAN\nSTARTED..................... %s\nVEHICLE LABEL............... %s\nDECLARED VEHICLE STATE...... %s\nLOG FILE.................... %s\nSAFETY...................... passive receive only; no vehicle requests\n", started.Format(time.RFC3339), sanitizeLabel(vehicleLabel), sanitizeLabel(vehicleState), logPath)
	defer func() { fmt.Fprintf(out, "FINISHED.................... %s\n", time.Now().Format(time.RFC3339)) }()

	items, err := discovery.New(time.Second, "auto").Candidates(context.Background())
	if err != nil || len(items) == 0 {
		fmt.Fprintf(out, "DISCOVERY ERROR............. %v\n", valueOrError(err, "no USB serial OBD candidate detected"))
		return
	}
	item := items[0]
	serialTransport := transport.NewELMSerial(item.Port, 115200, 5*time.Second)
	ctx := context.Background()
	if err := serialTransport.Open(ctx); err != nil {
		fmt.Fprintf(out, "SERIAL OPEN ERROR........... %v\n", err)
		return
	}
	defer serialTransport.Close()
	for _, command := range []string{"ATZ", "ATE0", "ATL0", "ATS0", "ATH1", "ATCAF0", "ATI", "STI", "ATRV"} {
		printExchange(out, ctx, serialTransport, command)
	}
	type bus struct{ name, preset string }
	buses := []bus{{"HS-CAN RAW // pins 6/14 // 500 kbit", "STP31"}, {"MS-CAN RAW // pins 3/11 // 125 kbit", "STP51"}, {"SW-CAN RAW // pin 1 // 33.3 kbit", "STP61"}}
	traffic := false
	for _, candidate := range buses {
		fmt.Fprintf(out, "\n%s\n", candidate.name)
		presetLines := exchangeAndPrint(out, ctx, serialTransport, candidate.preset)
		if containsResponse(presetLines, "?") {
			fmt.Fprintln(out, "RESULT...................... adapter does not support this preset")
			continue
		}
		printExchange(out, ctx, serialTransport, "STPRS")
		printExchange(out, ctx, serialTransport, "STPBRR")
		lines, monitorErr := serialTransport.Monitor(ctx, "ATMA", 10*time.Second)
		if monitorErr != nil {
			fmt.Fprintf(out, "ATMA........................ ERROR: %v\n", monitorErr)
			continue
		}
		if !hasCANFrame(lines) {
			fmt.Fprintln(out, "ATMA........................ NO RAW FRAMES OBSERVED")
			continue
		}
		traffic = true
		fmt.Fprintf(out, "ATMA........................ RAW TRAFFIC RECEIVED // lines=%d\n", len(lines))
		for index, line := range lines {
			if index >= 100 {
				fmt.Fprintf(out, "CAN......................... %d additional lines omitted from console summary\n", len(lines)-index)
				break
			}
			fmt.Fprintf(out, "CAN......................... %s\n", line)
		}
	}
	fmt.Fprintln(out, "\nPASSIVE SCAN RESULT")
	if traffic {
		fmt.Fprintln(out, "CLASSIFICATION.............. VEHICLE BUS TRAFFIC RECEIVED")
	} else {
		fmt.Fprintln(out, "CLASSIFICATION.............. NO TRAFFIC ON STN1170-SUPPORTED BUS CHANNELS")
	}
}

func containsResponse(lines []string, value string) bool {
	for _, line := range lines {
		if strings.Contains(line, value) {
			return true
		}
	}
	return false
}

func valueOrError(err error, fallback string) string {
	if err != nil {
		return err.Error()
	}
	return fallback
}

func rawProbe(vehicleLabel, vehicleState string) {
	started := time.Now()
	diagnosticsDir := filepath.Join("captures", "diagnostics")
	if err := os.MkdirAll(diagnosticsDir, 0o755); err != nil {
		fatal(fmt.Errorf("create diagnostics directory: %w", err))
	}
	logPath := filepath.Join(diagnosticsDir, "raw-obd-"+started.Format("20060102-150405")+".log")
	logFile, err := os.OpenFile(logPath, os.O_CREATE|os.O_WRONLY|os.O_EXCL, 0o600)
	if err != nil {
		fatal(fmt.Errorf("create diagnostic log: %w", err))
	}
	defer logFile.Close()
	out := io.MultiWriter(os.Stdout, logFile)
	fmt.Fprintf(out, "MIRAGE VEHICLE COMPATIBILITY TEST\nSTARTED..................... %s\nVEHICLE LABEL............... %s\nDECLARED VEHICLE STATE...... %s\nLOG FILE.................... %s\nSAFETY...................... read-only OBD and OBD-on-UDS requests only\n", started.Format(time.RFC3339), sanitizeLabel(vehicleLabel), sanitizeLabel(vehicleState), logPath)
	defer func() {
		fmt.Fprintf(out, "FINISHED.................... %s\n", time.Now().Format(time.RFC3339))
	}()

	d := discovery.New(time.Second, "auto")
	items, err := d.Candidates(context.Background())
	if err != nil {
		fmt.Fprintf(out, "DISCOVERY ERROR............. %v\n", err)
		return
	}
	if len(items) == 0 {
		fmt.Fprintln(out, "DISCOVERY ERROR............. no USB serial OBD candidate detected")
		return
	}
	item := items[0]
	serialTransport := transport.NewELMSerial(item.Port, 115200, 15*time.Second)
	ctx := context.Background()
	if err := serialTransport.Open(ctx); err != nil {
		fmt.Fprintf(out, "SERIAL OPEN ERROR........... %v\n", err)
		return
	}
	defer serialTransport.Close()
	fmt.Fprintf(out, "ADAPTER..................... %s // USB %s:%s\n", item.Port, valueOr(item.VID, "UNKNOWN"), valueOr(item.PID, "UNKNOWN"))
	commands := []string{"ATZ", "ATE0", "ATL0", "ATS0", "ATH1", "ATI", "STI", "ATRV", "ATDPN", "ATCS"}
	for _, command := range commands {
		printExchange(out, ctx, serialTransport, command)
	}
	fmt.Fprintln(out, "\nVEHICLE WAKE/SETTLE......... waiting 15 seconds")
	time.Sleep(15 * time.Second)
	fmt.Fprintln(out, "\nAUTOMATIC PROTOCOL DISCOVERY")
	printExchange(out, ctx, serialTransport, "ATSP0")
	printExchange(out, ctx, serialTransport, "ATAT2")
	printExchange(out, ctx, serialTransport, "ATSTFF")
	autoLines := exchangeAndPrint(out, ctx, serialTransport, "0100")
	obdReplyReceived := hasOBDReply(autoLines)
	printExchange(out, ctx, serialTransport, "ATDP")
	printExchange(out, ctx, serialTransport, "ATDPN")
	printExchange(out, ctx, serialTransport, "0902")
	printExchange(out, ctx, serialTransport, "ATCS")
	for _, protocol := range []string{"6", "7", "8", "9"} {
		fmt.Fprintf(out, "\nCAN PROTOCOL %s\n", protocol)
		printExchange(out, ctx, serialTransport, "ATSP"+protocol)
		printExchange(out, ctx, serialTransport, "ATDP")
		printExchange(out, ctx, serialTransport, "ATCS")
		protocolLines := exchangeAndPrint(out, ctx, serialTransport, "0100")
		obdReplyReceived = obdReplyReceived || hasOBDReply(protocolLines)
		printExchange(out, ctx, serialTransport, "0902")
		printExchange(out, ctx, serialTransport, "ATCS")
	}
	fmt.Fprintln(out, "\nOBD-ON-UDS // SAE J1979-2 READ-ONLY DISCOVERY")
	udsReplyReceived := false
	for _, target := range []struct{ protocol, header, label string }{
		{"6", "7DF", "11-bit functional addressing // 500 kbit"},
		{"7", "18DB33F1", "29-bit functional addressing // 500 kbit"},
	} {
		fmt.Fprintf(out, "\n%s\n", target.label)
		printExchange(out, ctx, serialTransport, "ATSP"+target.protocol)
		printExchange(out, ctx, serialTransport, "ATCAF1")
		printExchange(out, ctx, serialTransport, "ATSH"+target.header)
		for _, request := range []string{"22F400", "22F40C", "22F802"} {
			lines := exchangeAndPrint(out, ctx, serialTransport, request)
			udsReplyReceived = udsReplyReceived || hasUDSReply(lines)
		}
		printExchange(out, ctx, serialTransport, "ATCS")
	}
	fmt.Fprintln(out, "\nPASSIVE CAN LISTEN // protocol 6 // 5 seconds")
	printExchange(out, ctx, serialTransport, "ATSP6")
	printExchange(out, ctx, serialTransport, "ATCAF0")
	lines, err := serialTransport.Monitor(ctx, "ATMA", 5*time.Second)
	if err != nil {
		fmt.Fprintf(out, "ATMA........................ ERROR: %v\n", err)
		return
	}
	canTrafficReceived := hasCANFrame(lines)
	if !canTrafficReceived {
		fmt.Fprintln(out, "ATMA........................ NO RAW CAN FRAMES OBSERVED")
	} else {
		for _, line := range lines {
			fmt.Fprintf(out, "CAN......................... %s\n", line)
		}
	}
	fmt.Fprintln(out, "\nCOMPATIBILITY RESULT")
	switch {
	case obdReplyReceived:
		fmt.Fprintln(out, "CLASSIFICATION.............. CLASSIC OBD-II ECU RESPONSE RECEIVED")
		fmt.Fprintln(out, "NEXT STEP................... run the telemetry service and start a normalized drive capture")
	case udsReplyReceived:
		fmt.Fprintln(out, "CLASSIFICATION.............. OBD-ON-UDS ECU RESPONSE RECEIVED")
		fmt.Fprintln(out, "NEXT STEP................... add SAE J1979-2 capability discovery and live-data decoding")
	case canTrafficReceived:
		fmt.Fprintln(out, "CLASSIFICATION.............. CAN TRAFFIC PRESENT, STANDARD OBD REQUEST UNANSWERED")
		fmt.Fprintln(out, "NEXT STEP................... inspect addressing/diagnostic protocol support; do not add write commands")
	default:
		fmt.Fprintln(out, "CLASSIFICATION.............. ADAPTER POWERED, NO CLASSIC CAN TRAFFIC RECEIVED")
		fmt.Fprintln(out, "NEXT STEP................... verify ignition state and connector/pin path, then compare with a known-compatible scan tool or CAN-FD/J2534 interface")
	}
}

func hasUDSReply(lines []string) bool {
	for _, line := range lines {
		compact := strings.ToUpper(strings.NewReplacer(" ", "", "\t", "").Replace(line))
		if strings.Contains(compact, "62F4") || strings.Contains(compact, "62F8") {
			return true
		}
	}
	return false
}

func printExchange(out io.Writer, ctx context.Context, serialTransport *transport.ELMSerial, command string) {
	exchangeAndPrint(out, ctx, serialTransport, command)
}

func exchangeAndPrint(out io.Writer, ctx context.Context, serialTransport *transport.ELMSerial, command string) []string {
	lines, err := serialTransport.Exchange(ctx, command)
	if err != nil {
		fmt.Fprintf(out, "%-28s ERROR: %v\n", command, err)
		return nil
	}
	if len(lines) == 0 {
		lines = []string{"<EMPTY>"}
	}
	fmt.Fprintf(out, "%-28s %s\n", command, strings.Join(lines, " | "))
	return lines
}

func hasOBDReply(lines []string) bool {
	for _, line := range lines {
		compact := strings.ToUpper(strings.NewReplacer(" ", "", "\t", "").Replace(line))
		if strings.Contains(compact, "4100") || strings.Contains(compact, "4902") {
			return true
		}
	}
	return false
}

func hasCANFrame(lines []string) bool {
	for _, line := range lines {
		compact := strings.ToUpper(strings.NewReplacer(" ", "", "\t", "").Replace(line))
		if compact == "" || compact == "STOPPED" || compact == "OK" || strings.Contains(compact, "NODATA") || strings.Contains(compact, "CANERROR") {
			continue
		}
		if len(compact) >= 5 {
			isHex := true
			for _, char := range compact {
				if !strings.ContainsRune("0123456789ABCDEF", char) {
					isHex = false
					break
				}
			}
			if isHex {
				return true
			}
		}
	}
	return false
}

func sanitizeLabel(value string) string {
	value = strings.TrimSpace(strings.NewReplacer("\r", " ", "\n", " ").Replace(value))
	if value == "" {
		return "unlabeled"
	}
	return value
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
		fmt.Println("Connect the vLinker FS to USB, then rerun this command.")
		fmt.Println("On macOS, verify that a /dev/cu.usbserial*, /dev/cu.wchusbserial*, or /dev/cu.SLAB_USBtoUART* device appears.")
		return
	}
	for _, item := range items {
		fmt.Printf("CANDIDATE................... %s (%s)\nUSB ID...................... %s:%s\nSERIAL...................... %s\n", item.Port, item.Platform, valueOr(item.VID, "UNKNOWN"), valueOr(item.PID, "UNKNOWN"), valueOr(item.Serial, "UNKNOWN"))
		serialTransport := transport.NewELMSerial(item.Port, 115200, 12*time.Second)
		adapter := obd.NewELM327Adapter(serialTransport, item.Port, []string{"ATZ", "ATE0", "ATL0", "ATS0", "ATH0", "ATSP0"})
		ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
		if err := adapter.Open(ctx); err != nil {
			fmt.Printf("PROBE........................ FAILED: %v\n", err)
			cancel()
			continue
		}
		initializeErr := adapter.Initialize(ctx)
		info, identifyErr := adapter.Identify(ctx)
		_ = adapter.Close()
		cancel()
		if initializeErr != nil {
			fmt.Printf("PROBE........................ INITIALIZATION FAILED: %v\n", initializeErr)
			continue
		}
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
func printURL(url string) {
	res, err := http.Get(url)
	if err != nil {
		fatal(err)
	}
	defer res.Body.Close()
	data, _ := io.ReadAll(res.Body)
	if res.StatusCode >= 300 {
		fatal(fmt.Errorf("HTTP %d: %s", res.StatusCode, data))
	}
	var value any
	if json.Unmarshal(data, &value) == nil {
		formatted, _ := json.MarshalIndent(value, "", "  ")
		fmt.Println(string(formatted))
		return
	}
	fmt.Print(string(data))
}
func decodeVIN(vin, path, databaseURL string, online bool) {
	var chain vehicle.ChainDecoder
	if databaseURL != "" {
		chain = append(chain, vehicle.PostgresVINDecoder{DSN: databaseURL})
	}
	if online {
		chain = append(chain, vehicle.VPICVINDecoder{})
	}
	var fallback vehicle.VINDecoder
	if len(chain) > 0 {
		fallback = chain
	}
	decoder := &vehicle.CacheDecoder{Path: path, Fallback: fallback}
	decoded, err := decoder.Decode(context.Background(), vin)
	if err != nil {
		if errors.Is(err, vehicle.ErrVINNotCached) {
			fatal(fmt.Errorf("VIN is not cached; rerun once with --online while Internet is available"))
		}
		fatal(err)
	}
	data, _ := json.MarshalIndent(decoded, "", "  ")
	fmt.Println(string(data))
}
func fatal(err error) { fmt.Fprintln(os.Stderr, err); os.Exit(1) }
func valueOr(value, fallback string) string {
	if value == "" {
		return fallback
	}
	return value
}
