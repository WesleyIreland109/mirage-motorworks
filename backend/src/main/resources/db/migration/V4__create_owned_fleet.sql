CREATE TABLE owned_vehicles (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    make TEXT NOT NULL,
    model TEXT NOT NULL,
    trim TEXT NOT NULL DEFAULT '',
    mileage INTEGER NOT NULL CHECK (mileage >= 0),
    vin TEXT,
    primary_use TEXT NOT NULL,
    annual_mileage INTEGER,
    notes TEXT NOT NULL DEFAULT '',
    onboarding_completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE maintenance_tasks (
    id UUID PRIMARY KEY,
    vehicle_id UUID NOT NULL REFERENCES owned_vehicles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    priority TEXT NOT NULL CHECK (priority IN ('verify', 'routine', 'important', 'safety')),
    penalty INTEGER NOT NULL CHECK (penalty >= 0 AND penalty <= 100),
    status TEXT NOT NULL CHECK (status IN ('suggested', 'accepted', 'in_progress', 'completed', 'deferred')),
    source TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    completed_at TIMESTAMPTZ,
    completed_mileage INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE service_records (
    id UUID PRIMARY KEY,
    vehicle_id UUID NOT NULL REFERENCES owned_vehicles(id) ON DELETE CASCADE,
    maintenance_task_id UUID REFERENCES maintenance_tasks(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    mileage INTEGER NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX owned_vehicles_user_id_idx ON owned_vehicles(user_id);
CREATE INDEX maintenance_tasks_vehicle_id_idx ON maintenance_tasks(vehicle_id);
