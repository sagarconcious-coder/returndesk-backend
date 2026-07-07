CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS dealers (
    id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name        VARCHAR(255)  NOT NULL,
    mobile           VARCHAR(15)   UNIQUE,
    email            VARCHAR(255)  UNIQUE NOT NULL,
    business_name    VARCHAR(255)  NOT NULL,
    business_address TEXT          NOT NULL,
    gst_number       VARCHAR(20)   UNIQUE NOT NULL,
    password         VARCHAR(255)  NOT NULL,
    status           VARCHAR(20)   NOT NULL DEFAULT 'PENDING'
                                   CHECK (status IN ('PENDING', 'ACTIVE', 'REJECTED')),
    rejection_reason TEXT,
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
