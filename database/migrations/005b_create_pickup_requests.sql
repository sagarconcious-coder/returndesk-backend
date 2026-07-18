CREATE TABLE IF NOT EXISTS pickup_requests (
    id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    dealer_id             UUID          NOT NULL REFERENCES dealers(id),
    shiprocket_pickup_id  VARCHAR(50),
    status                VARCHAR(20)   NOT NULL DEFAULT 'REQUESTED'
                                         CHECK (status IN ('REQUESTED', 'SCHEDULED', 'COMPLETED', 'CANCELLED')),
    requested_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    scheduled_at          TIMESTAMPTZ
);
