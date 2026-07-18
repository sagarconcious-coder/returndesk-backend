CREATE TABLE IF NOT EXISTS admins (
    id         UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    name       VARCHAR(255)  NOT NULL,
    email      VARCHAR(255)  UNIQUE NOT NULL,
    password   VARCHAR(255)  NOT NULL,
    role       VARCHAR(20)   NOT NULL DEFAULT 'ADMIN'
                              CHECK (role IN ('ADMIN', 'SUPER_ADMIN')),
    status     VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE'
                              CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);