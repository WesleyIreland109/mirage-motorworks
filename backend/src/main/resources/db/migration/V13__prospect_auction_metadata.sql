ALTER TABLE prospect_reports
    ADD COLUMN auction_status TEXT NOT NULL DEFAULT 'unknown',
    ADD COLUMN auction_ends_at TIMESTAMPTZ;

CREATE INDEX prospect_reports_auction_status_idx ON prospect_reports(auction_status);
CREATE INDEX prospect_reports_auction_ends_at_idx ON prospect_reports(auction_ends_at);
