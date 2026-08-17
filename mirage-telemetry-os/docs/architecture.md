# Architecture

Mirage Telemetry OS keeps vehicle I/O below every presentation and observability layer:

```text
USB discovery → serial transport → ELM-compatible adapter → OBD discovery
→ vehicle identification → capability map → profile matcher
→ normalized telemetry provider → telemetry core → WebSocket / Prometheus
```

## Attachment lifecycle

`internal/attach.Controller` is the single source of connection truth. Both simulated controls and the physical discovery runtime drive it through the same states: `STARTING`, `WAITING_FOR_ADAPTER`, `ADAPTER_DETECTED`, `INITIALIZING_ADAPTER`, `WAITING_FOR_VEHICLE`, `NEGOTIATING_PROTOCOL`, `IDENTIFYING_VEHICLE`, `DISCOVERING_CAPABILITIES`, `MATCHING_PROFILE`, and `CONNECTED`. Adapter removal and ECU loss return to the appropriate waiting state without terminating the backend.

The attachment snapshot is embedded in normalized telemetry snapshots, so existing WebSocket clients receive lifecycle changes without a second transport. REST inspection and Prometheus read the same controller.

## Replaceable layers

- `internal/discovery`: platform-aware USB serial candidate events. Linux and macOS restrict candidates to USB serial/modem device families; Windows uses `COM*`. Manual ports remain available.
- `internal/transport.ELMSerial`: baud rate, prompt framing, timeouts, and serial I/O.
- `internal/obd.ELM327Adapter`: adapter identity, configurable terminal initialization, protocol detection, and safety-checked queries.
- `internal/obd`: supported-PID bitmaps, normalized standard capability definitions, response helpers, and the OEM extension contract.
- `internal/vehicle`: VIN validation, offline fallback plus NHTSA vPIC decoding, evidence fields with independent confidence/source, and scored/dynamic profile matching.
- `internal/simulator`: drives the real controller through adapter, ignition, vehicle, error, and partial-capability events before producing normalized readings.

React, Prometheus, profiles, and themes never access serial devices.

## Safety boundary

Every adapter query carries an `OperationClass`. The current policy accepts only `ReadOnly` requests and only OBD services `01`, `03`, `07`, and `09`. Mutation/programming classifications and services such as Mode `04` are rejected before reaching transport. ELM `AT` commands configure the adapter terminal; no automatic DTC clearing, reset, coding, actuator, or programming path exists.

## Identity and profiles

Standard OBD does not claim make/model/trim. VIN evidence is validated locally and, when Internet access is available, resolved through the official NHTSA vPIC service. The local WMI/year decoder remains the offline fallback. Missing fields stay `UNKNOWN`; an unknown Honda cannot select FK8. Exact profiles still require specific evidence, while a decoded but previously unknown model receives a capability-driven model-named profile. Identity, profile, dashboard OS name, layout, theme, and client branding remain separate.

## Availability and capture

Readings carry `AVAILABLE`, `UNAVAILABLE`, `STALE`, `ERROR`, or `UNKNOWN` status. Unsupported PIDs are not intended for polling. Research captures are permission-restricted JSONL files under ignored `captures/`; full VIN is redacted by default. Prometheus never uses VIN, serial number, GPS, arbitrary errors, or client names as labels.

## Physical adapter seam

The Vgate-specific USB VID/PID belongs only in `config/obd.yaml`. Serial timing/framing differences belong in `internal/transport/serial.go`; ELM/STN command behavior belongs in `internal/obd/obd.go`; response decoding belongs in the OBD layer. Vehicle-specific PIDs must be added only through a researched `OEMTelemetryExtension`, never guessed in profiles or UI code.
