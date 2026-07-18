CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE TABLE IF NOT EXISTS dealers (
    id                          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name                   VARCHAR(255)  NOT NULL,
    mobile                      VARCHAR(15)   UNIQUE,
    email                       VARCHAR(255)  UNIQUE NOT NULL,
    business_name                VARCHAR(255)  NOT NULL,
    address_line1                VARCHAR(255)  NOT NULL,
    city                        VARCHAR(100)  NOT NULL,
    state                       VARCHAR(100)  NOT NULL,
    pincode                     VARCHAR(10)   NOT NULL,
    gst_number                  VARCHAR(20)   UNIQUE NOT NULL,
    password                    VARCHAR(255)  NOT NULL,
    status                      VARCHAR(20)   NOT NULL DEFAULT 'PENDING'
                                 CHECK (status IN ('PENDING', 'ACTIVE', 'REJECTED')),
    rejection_reason             TEXT,
    shiprocket_pickup_location   VARCHAR(100),
    created_at                  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);