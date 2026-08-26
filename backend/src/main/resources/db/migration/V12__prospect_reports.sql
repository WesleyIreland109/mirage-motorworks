CREATE TABLE prospect_reports (
    id UUID PRIMARY KEY,
    created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    listing_url TEXT NOT NULL,
    vehicle_label TEXT NOT NULL,
    asking_price_cents BIGINT,
    mileage INTEGER,
    location TEXT NOT NULL DEFAULT '',
    seller_name TEXT NOT NULL DEFAULT '',
    vin TEXT,
    status TEXT NOT NULL DEFAULT 'new',
    summary TEXT NOT NULL DEFAULT '',
    checklist_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    obd_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    estimated_repair_cents BIGINT,
    recommended_offer_cents BIGINT,
    value_notes TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX prospect_reports_status_idx ON prospect_reports(status);
CREATE INDEX prospect_reports_created_by_user_id_idx ON prospect_reports(created_by_user_id);
