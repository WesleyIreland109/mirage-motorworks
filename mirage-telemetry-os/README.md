# Mirage Telemetry OS

A vehicle-agnostic, theme-driven telemetry display platform with automatic USB attachment lifecycle, safe ELM-compatible OBD architecture, realistic 20 Hz simulator, WebSocket dashboard, REST diagnostics, Prometheus metrics, and scored vehicle profiles.

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

`GET /api/health`, `/api/status`, `/api/telemetry/current`, `/api/config/active`, `/api/vehicle`, `/api/vehicle/inspect`, `/api/simulator/scenarios`, `/api/simulator/actions`; development POST controls under `/api/simulator`; capture start/stop APIs; `WS /ws/telemetry`; `GET /metrics`.

Build the CLI with `make build`, then use:

```bash
bin/mirage vehicle watch
bin/mirage vehicle probe
bin/mirage vehicle inspect
bin/mirage vehicle inspect --json
bin/mirage capture start
bin/mirage capture stop
```

`vehicle probe` is the first command to run when the physical vLinker FS arrives. It enumerates only platform USB-serial candidates and performs a safe ELM identity probe. Add its observed VID/PID to `config/obd.yaml`. No Internet or Prometheus process is required at runtime.

See [architecture](docs/architecture.md) and [Raspberry Pi notes](docs/raspberry-pi.md).
