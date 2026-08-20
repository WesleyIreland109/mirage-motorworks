ALTER TABLE telemetry_sessions ADD COLUMN recorded_mileage INTEGER;
ALTER TABLE telemetry_sessions ADD CONSTRAINT telemetry_recorded_mileage_nonnegative CHECK (recorded_mileage IS NULL OR recorded_mileage >= 0);
