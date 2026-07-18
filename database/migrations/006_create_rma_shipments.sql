CREATE TABLE IF NOT EXISTS rma_shipments (
    id                     UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    rma_id                 UUID          NOT NULL REFERENCES rmas(id),
    direction              VARCHAR(20)   NOT NULL CHECK (direction IN ('INBOUND', 'OUTBOUND')),
    carrier                VARCHAR(100),
    tracking_number        VARCHAR(100),
    status                 VARCHAR(20)   NOT NULL DEFAULT 'NOT_SHIPPED'
                                          CHECK (status IN ('NOT_SHIPPED', 'SCHEDULED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED_DELIVERY')),
    shipped_at             TIMESTAMPTZ,
    delivered_at           TIMESTAMPTZ,
    shiprocket_shipment_id VARCHAR(50),
    awb_code               VARCHAR(50),
    pickup_error           TEXT,
    pickup_request_id      UUID REFERENCES pickup_requests(id),
    created_at             TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS rma_shipments_one_inbound_per_rma
    ON rma_shipments (rma_id)
    WHERE direction = 'INBOUND';