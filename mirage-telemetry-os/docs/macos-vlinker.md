# macOS + Vgate vLinker FS bring-up

The pictured adapter is a **Vgate vLinker FS USB**. Mirage uses it only through its ELM/STN-compatible serial command interface and enforces read-only OBD services. It does not use FORScan programming features, MS-CAN switching commands, or ECU writes.

## First connection

1. Connect the vLinker to the Mac with a data-capable USB cable or adapter. It does not need to be connected to the car for the USB serial device to enumerate.
2. Run `mirage-probe`. A successful macOS attachment should create a device such as `/dev/cu.usbserial-*`, `/dev/cu.wchusbserial*`, or `/dev/cu.SLAB_USBtoUART*`.
3. Record the reported USB VID/PID. Add it to `knownUSBIDs` in `config/obd.yaml` after it has been verified.
4. Connect the vLinker to the vehicle's OBD-II port, switch ignition on without starting the engine for the first test, and run `mirage-dev` plus `mirage-watch` in another terminal.
5. When the state reaches `CONNECTED`, run `mirage-inspect` and confirm the VIN-derived manufacturer, protocol, supported metric count, and selected vehicle profile. An unknown vehicle must remain usable through the generic, capability-driven profile.

`mirage-probe` requires exclusive access to the serial port. Stop `mirage-dev` first; a “Serial port busy” result while the telemetry service is running is expected, because automatic discovery already owns the adapter.

If no USB serial device appears, do not install a guessed driver. Open System Information → USB and note the product, vendor ID, and product ID. The vLinker FS requires a USB-serial driver on systems that do not already support its bridge chipset; use the chipset/vendor-matched macOS driver only.

## Live telemetry and captures

After attachment, Mirage tries classic SAE J1979 followed by SAE J1979-2 OBD-on-UDS. Real readings replace simulator output only after the ECU answers. Unsupported values remain unavailable rather than falling back to fake numbers. Polling currently covers RPM, speed, throttle, manifold pressure/derived boost, coolant, intake air, module voltage, engine load, oil temperature, lambda/AFR, fuel level, and ignition timing when the ECU reports support.

Start a supervised normalized capture before a drive or stationary test:

```bash
cd "$MIRAGE_ROOT"
bin/mirage --label "friend vehicle dry run" session record
```

The command stops automatically after 15 minutes. Pressing `Ctrl+C` sooner safely finalizes the recording and prints its session ID, path, counts, and replay command. Do not force-quit the terminal or disconnect power while it says `FINALIZING`.

After parking, list or replay the saved session:

```bash
bin/mirage session list
bin/mirage session replay SESSION_ID
```

The friend-car convenience flow is:

```bash
# Terminal 1
make dev

# Terminal 2
make short-test FRIEND="Alex Smith"
make record FRIEND="Alex Smith"

# Later: resolves automatically when only one recording matches
bin/mirage session replay "Alex Smith"

# Or use timestamp-aware completion
mirage session replay <Tab>
```

Each recording directory is named with a UTC timestamp ID. Multiple short tests and drives for the same friend are therefore retained independently.

Sessions contain timestamped normalized telemetry and raw OBD JSONL with source and availability metadata. VIN and GPS are redacted. Keep the first tests stationary, secure the laptop, and never interact with it while driving.

## Vehicle compatibility test

Stop `mirage-dev` so the test has exclusive access to the adapter. Start the engine, leave the vehicle safely parked, and run:

```bash
bin/mirage --vehicle "2026 Honda HR-V" --state engine-running vehicle raw-probe
```

The test waits 15 seconds, performs automatic and explicit classic-CAN negotiation, tries standard J1979-2 identifiers, listens passively for five seconds, and writes a timestamped report under `captures/diagnostics/`. It ends with a classification including:

- `CLASSIC OBD-II ECU RESPONSE RECEIVED`: proceed with the normal telemetry service and a normalized drive capture.
- `OBD-ON-UDS ECU RESPONSE RECEIVED`: the vehicle answers standardized data identifiers through Service 22; proceed with normal telemetry.
- `CAN TRAFFIC PRESENT, STANDARD OBD REQUEST UNANSWERED`: investigate diagnostic addressing or a newer protocol stack.
- `ADAPTER POWERED, NO CLASSIC CAN TRAFFIC RECEIVED`: verify the ignition/connector path and compare with a known-compatible commercial scan tool before changing application parsing.

Run the same stationary test once per vehicle and state (`ignition-on` and `engine-running`). If connected telemetry is stable, a commute capture can be started before departure and stopped only after parking. Never operate the computer while the vehicle is moving.

Current baseline evidence: the Atlas answers classic Mode 01 and Mode 09 over ISO 15765-4 CAN at 500 kbit/s. The 2026 HR-V answers SAE J1979-2 requests over 29-bit/500 kbit/s CAN using functional header `18DB33F1`. Its validated standardized channels include RPM, speed, throttle, fuel level, module voltage, supported-data maps, and VIN. The dashboard derives its model name from the VIN and displays only channels the connected ECU actually advertises.

## Safety boundary

Mirage permits only read-only OBD services `01`, `03`, `07`, `09`, and `22`. The live poller uses Service `01` for classic SAE J1979 or standardized `F4xx` data identifiers through Service `22` for SAE J1979-2. Vehicle identification uses Mode 09 PID 02 or DID `F802`. Programming, actuator tests, configuration changes, and arbitrary vehicle writes are outside this milestone.
