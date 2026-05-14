-- CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CREATE TABLE dealers(
--     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--     full_name VARCHAR(255) NOT NULL,
--     mobile VARCHAR(15) UNIQUE NOT NULL,
--     email VARCHAR(255) UNIQUE,

--     business_name VARCHAR(255),
--     business_address TEXT,
--     gst_number VARCHAR(20),
--     status VARCHAR(20) DEFAULT 'PENDING' CHECK(status IN ('PENDING','ACTIVE','REJECTED')),
--     rejection_reason TEXT,
--     created_at TIMESTAMPTZ DEFAULT NOW(),
--     updated_at TIMESTAMPTZ DEFAULT NOW()

-- );


-- CREATE TABLE otps(
--     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--     mobile VARCHAR(15) NOT NULL,
--     otp VARCHAR(6) NOT NULL,
--     purpose VARCHAR(50) DEFAULT 'REGISTRATION',
--     expires_at TIMESTAMPTZ NOT NULL,
--     verified BOOLEAN DEFAULT FALSE,
--     created_at TIMESTAMPTZ DEFAULT NOW()

-- );


CREATE TABLE rmas(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rma_number VARCHAR(50) UNIQUE NOT NULL,
    dealer_id UUID NOT NULL REFERENCES dealers(id),
    product_serial VARCHAR(100) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    issue_description TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVAL','REJECTED')),
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
)