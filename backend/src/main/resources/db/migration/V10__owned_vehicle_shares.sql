CREATE TABLE owned_vehicle_shares (
    id UUID PRIMARY KEY,
    vehicle_id UUID NOT NULL REFERENCES owned_vehicles(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invited_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission TEXT NOT NULL DEFAULT 'editor' CHECK (permission IN ('viewer', 'editor')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (vehicle_id, user_id)
);

CREATE INDEX owned_vehicle_shares_user_id_idx ON owned_vehicle_shares(user_id);
CREATE INDEX owned_vehicle_shares_vehicle_id_idx ON owned_vehicle_shares(vehicle_id);
