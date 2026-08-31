ALTER TABLE telemetry_sessions
    ADD COLUMN status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'archived')),
    ADD COLUMN archived_at TIMESTAMPTZ;

CREATE INDEX telemetry_sessions_status_idx ON telemetry_sessions(status);
