CREATE TABLE telemetry_intake_sessions (
    id UUID PRIMARY KEY,
    uploaded_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    external_session_id TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL,
    duration_ms BIGINT NOT NULL CHECK (duration_ms >= 0),
    samples BIGINT NOT NULL CHECK (samples >= 0),
    obd_requests BIGINT NOT NULL CHECK (obd_requests >= 0),
    obd_errors BIGINT NOT NULL CHECK (obd_errors >= 0),
    source TEXT NOT NULL CHECK (source IN ('vehicle', 'simulator', 'unknown')),
    metrics_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    recorded_mileage INTEGER CHECK (recorded_mileage IS NULL OR recorded_mileage >= 0),
    detected_year INTEGER,
    detected_make TEXT,
    detected_model TEXT,
    detected_trim TEXT,
    detected_vin TEXT,
    detected_profile_id TEXT,
    status TEXT NOT NULL DEFAULT 'unassigned' CHECK (status IN ('unassigned', 'assigned', 'archived')),
    assigned_vehicle_id UUID REFERENCES owned_vehicles(id) ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX telemetry_intake_status_idx ON telemetry_intake_sessions(status);
CREATE INDEX telemetry_intake_detected_vin_idx ON telemetry_intake_sessions(detected_vin);
