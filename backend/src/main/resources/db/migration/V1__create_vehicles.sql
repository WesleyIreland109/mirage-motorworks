CREATE TABLE vehicles (
    id UUID PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    year INTEGER NOT NULL,
    make TEXT NOT NULL,
    model TEXT NOT NULL,
    trim TEXT NOT NULL,
    status TEXT NOT NULL,
    mileage INTEGER NOT NULL,
    exterior_color TEXT NOT NULL,
    interior_color TEXT NOT NULL,
    transmission TEXT NOT NULL,
    drivetrain TEXT NOT NULL,
    engine TEXT NOT NULL,
    asking_price NUMERIC(12, 2) NOT NULL,
    invested_amount NUMERIC(12, 2) NOT NULL,
    projected_profit NUMERIC(12, 2) NOT NULL,
    days_in_inventory INTEGER NOT NULL,
    hero_image TEXT NOT NULL,
    gallery TEXT[] NOT NULL,
    highlights TEXT[] NOT NULL,
    story TEXT NOT NULL,
    inspection_notes TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX vehicles_status_idx ON vehicles(status);
CREATE INDEX vehicles_slug_idx ON vehicles(slug);
