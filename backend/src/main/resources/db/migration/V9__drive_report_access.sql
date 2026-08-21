ALTER TABLE drive_reports
    ADD COLUMN visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('private', 'customer', 'public')),
    ADD COLUMN viewer_user_id UUID REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE drive_reports ALTER COLUMN visibility SET DEFAULT 'private';
CREATE INDEX drive_reports_viewer_user_id_idx ON drive_reports(viewer_user_id);
