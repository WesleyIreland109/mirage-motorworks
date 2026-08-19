# Mirage Telemetry OS

A vehicle-agnostic, theme-driven telemetry display platform with automatic USB attachment lifecycle, safe ELM-compatible OBD and OBD-on-UDS telemetry, WebSocket dashboard, session capture, REST diagnostics, Prometheus metrics, and VIN-derived vehicle profiles.

This directory is intentionally isolated from the existing Mirage Motorworks website in the parent repository.

## Run locally

Requirements: Go 1.23+ and Node 22+.

```bash
make install
make dev
```

Open `http://127.0.0.1:5173`. The API is at `http://127.0.0.1:8080`; metrics are at `/metrics`.

The system intentionally starts at `WAITING_FOR_ADAPTER`. Use the dashboard developer controls or:

```bash
curl -X POST -H 'Content-Type: application/json' -d '{"action":"attach-adapter"}' http://127.0.0.1:8080/api/simulator/action
curl -X POST -H 'Content-Type: application/json' -d '{"action":"attach-fk8"}' http://127.0.0.1:8080/api/simulator/action
```

Replace the second action with `attach-fl5`, `attach-bronco`, or `attach-generic`. Additional actions cover removal, ignition-off, unsupported VIN, timeout, partial PIDs, and adapter failure.

Run each side separately:

```bash
make backend
make frontend
```

Or use Docker without installing Go:

```bash
docker compose up --build
```

## Configuration

```bash
VEHICLE_PROFILE=fk8 UI_THEME=mirage-retro CLIENT_BRANDING=mirage-motorworks DEV_MODE=true make dev
```

`LISTEN_ADDR` defaults to `127.0.0.1:8080`; use `0.0.0.0:8080` only on a trusted LAN. Development mutation APIs are disabled unless `DEV_MODE=true`. Profiles, themes, and client branding live under `config/` and are validated during startup. Unavailable sensors are represented explicitly, never as zero.

## API

`GET /api/health`, `/api/status`, `/api/device`, `/api/mobile/bootstrap`, `/api/telemetry/current`, `/api/config/active`, `/api/vehicle`, `/api/vehicle/inspect`, `/api/sessions`; session start/stop/status/replay plus redacted normalized/raw download APIs; development controls under `/api/simulator`; `WS /ws/telemetry`; `GET /metrics`.

Build the CLI with `make build`, then use:

```bash
bin/mirage vehicle watch
bin/mirage vehicle probe
bin/mirage vehicle inspect
bin/mirage vehicle inspect --json
bin/mirage --vehicle "2026 Honda HR-V" --state engine-running vehicle raw-probe
bin/mirage --vehicle "2026 Honda HR-V" --duration 2m vehicle uds-sample
bin/mirage --label "friend car dry run" session record
bin/mirage session list
bin/mirage --speed 4 session replay SESSION_ID
bin/mirage --online vin decode VIN_HERE
bin/mirage vin cache-status
```

`session record` is the preferred drive workflow. It records for at most 15 minutes and finalizes the summary, normalized telemetry, and raw OBD files when the limit is reached or `Ctrl+C` is pressed. If vehicle attachment already started an automatic session, the command supervises and finalizes that session instead of discarding it. The telemetry service also finalizes an active session during graceful shutdown.

Use `--max-duration` for a shorter stationary test; values over 15 minutes are rejected:

```bash
bin/mirage --label "stationary check" --max-duration 2m session record
```

`vehicle probe` is the first command to run when the physical vLinker FS arrives. It enumerates only platform USB-serial candidates and performs a safe ELM identity probe. Add its observed VID/PID to `config/obd.yaml`. No Internet or Prometheus process is required at runtime.

See [architecture](docs/architecture.md), [offline VIN decoding](docs/offline-vin.md), and [Raspberry Pi notes](docs/raspberry-pi.md).

For the physical Vgate adapter, follow the [macOS vLinker FS bring-up guide](docs/macos-vlinker.md). Once attached, Mirage first attempts classic SAE J1979 and then SAE J1979-2 OBD-on-UDS. Only channels advertised by the ECU are shown; unavailable values stay blank rather than falling back to simulator data. The standardized VIN is resolved through NHTSA vPIC when Internet access is available so an unknown vehicle can receive a model-named profile such as `HR-V OS` or `ATLAS OS`.
