-- Full audit trail of every shipment status transition. rma_shipments only
-- ever holds the current status plus shipped_at/delivered_at, so
-- intermediate courier states (IN_TRANSIT, OUT_FOR_DELIVERY, etc.) were
-- being lost the moment the next update overwrote them. This table records
-- one row per transition so the RMA status history can show all of them.
CREATE TABLE IF NOT EXISTS shipment_status_history (
    id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    shipment_id  UUID          NOT NULL REFERENCES rma_shipments(id),
    status       VARCHAR(20)   NOT NULL,
    created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS shipment_status_history_shipment_id_idx
    ON shipment_status_history (shipment_id);
