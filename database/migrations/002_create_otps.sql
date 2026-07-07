CREATE TABLE IF NOT EXISTS otps (
    id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    email      VARCHAR(255) NOT NULL UNIQUE,
    otp        VARCHAR(6)   NOT NULL,
    purpose    VARCHAR(50)  NOT NULL DEFAULT 'REGISTRATION',
    expires_at TIMESTAMPTZ  NOT NULL,
    verified   BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
