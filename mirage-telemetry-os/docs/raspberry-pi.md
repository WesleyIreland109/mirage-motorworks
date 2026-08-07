# Raspberry Pi deployment

Build for ARM64 with `GOOS=linux GOARCH=arm64 go build ./apps/telemetry-service`, or build the multi-architecture Docker image on the Pi. Install the example systemd unit, keep the API bound to loopback, and serve the dashboard locally.

Start Chromium with `chromium --kiosk --noerrdialogs --disable-infobars http://127.0.0.1:5173`. Configure the OS display mode for 1280×800. The service handles SIGTERM for clean shutdown; systemd restarts it after provider or process failure. The UI reconnects when startup order or hardware loss interrupts telemetry. Avoid abrupt power removal; use a shutdown controller or read-only root filesystem for a permanent installation.

For lower-powered hardware, enable the operating system's reduced-motion preference and avoid browser scaling. The UI remains usable with no network or cloud access.
