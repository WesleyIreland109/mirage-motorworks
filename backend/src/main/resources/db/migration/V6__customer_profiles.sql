CREATE TABLE customer_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    phone TEXT NOT NULL DEFAULT '',
    preferred_contact TEXT NOT NULL DEFAULT 'email'
        CHECK (preferred_contact IN ('email', 'phone', 'text')),
    marketing_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO customer_profiles (user_id)
SELECT id FROM users
ON CONFLICT (user_id) DO NOTHING;
