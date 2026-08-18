# Raspberry Pi deployment

Build the ARM64 service and dashboard before copying the release to the Pi:

```bash
GOOS=linux GOARCH=arm64 go build -o bin/telemetry-service ./apps/telemetry-service
GOOS=linux GOARCH=arm64 go build -o bin/mirage ./apps/mirage
npm --prefix apps/dashboard run build
```

The production Go service serves the compiled dashboard itself; Vite is not installed or run on the Pi. Install the example systemd unit and create the `mirage` system user. Persistent private state lives under `/var/lib/mirage/`, including VIN cache and drive sessions.

Start Chromium with `chromium --kiosk --noerrdialogs --disable-infobars http://127.0.0.1:8080`. The example service listens on the trusted local network so a development laptop can use `http://mirage.local:8080` and the CLI.

```bash
ssh mirage@mirage.local 'journalctl -fu mirage-telemetry'
bin/mirage --server http://mirage.local:8080 vehicle inspect
bin/mirage --server http://mirage.local:8080 session status
rsync -av mirage@mirage.local:/var/lib/mirage/sessions/ captures/pi-sessions/
```

The service handles SIGTERM for clean shutdown; systemd restarts it after provider or process failure. The UI reconnects when startup order or hardware loss interrupts telemetry. Avoid abrupt power removal; use a shutdown controller or read-only root filesystem for a permanent installation.

For lower-powered hardware, enable the operating system's reduced-motion preference and avoid browser scaling. The UI remains usable with no network or cloud access.
