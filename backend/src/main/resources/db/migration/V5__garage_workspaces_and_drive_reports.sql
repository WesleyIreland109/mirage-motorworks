ALTER TABLE owned_vehicles
    ADD COLUMN purpose TEXT NOT NULL DEFAULT 'personal'
        CHECK (purpose IN ('personal', 'working_on', 'flip')),
    ADD COLUMN owner_name TEXT,
    ADD COLUMN acquisition_price_cents BIGINT,
    ADD COLUMN target_sale_price_cents BIGINT,
    ADD COLUMN acquired_at DATE;

CREATE TABLE telemetry_sessions (
    id UUID PRIMARY KEY,
    vehicle_id UUID NOT NULL REFERENCES owned_vehicles(id) ON DELETE CASCADE,
    external_session_id TEXT NOT NULL,
    label TEXT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL,
    duration_ms BIGINT NOT NULL CHECK (duration_ms >= 0),
    samples BIGINT NOT NULL CHECK (samples >= 0),
    obd_requests BIGINT NOT NULL CHECK (obd_requests >= 0),
    obd_errors BIGINT NOT NULL CHECK (obd_errors >= 0),
    source TEXT NOT NULL CHECK (source IN ('vehicle', 'simulator', 'unknown')),
    metrics_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (vehicle_id, external_session_id)
);

CREATE TABLE drive_reports (
    id UUID PRIMARY KEY,
    session_id UUID NOT NULL UNIQUE REFERENCES telemetry_sessions(id) ON DELETE CASCADE,
    public_token TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    overview TEXT NOT NULL,
    observations_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'revoked')),
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX telemetry_sessions_vehicle_id_idx ON telemetry_sessions(vehicle_id);
CREATE INDEX drive_reports_public_token_idx ON drive_reports(public_token);
