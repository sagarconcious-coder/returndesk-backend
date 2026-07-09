CREATE TABLE IF NOT EXISTS rma_shipments (
    id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    rma_id          UUID          NOT NULL REFERENCES rmas(id),
    direction       VARCHAR(20)   NOT NULL CHECK (direction IN ('INBOUND', 'OUTBOUND')),
    carrier         VARCHAR(100),
    tracking_number VARCHAR(100),
    status          VARCHAR(20)   NOT NULL DEFAULT 'NOT_SHIPPED'
                                   CHECK (status IN ('NOT_SHIPPED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED_DELIVERY')),
    shipped_at      TIMESTAMPTZ,
    delivered_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
