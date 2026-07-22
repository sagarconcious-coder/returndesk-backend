-- Add CANCELLED as a valid shipment status, and shiprocket_order_id to
-- support cancelling a Shiprocket order (their cancel API needs the
-- order_id, distinct from the shipment_id we already store).
ALTER TABLE rma_shipments
    ADD COLUMN IF NOT EXISTS shiprocket_order_id VARCHAR(50);

ALTER TABLE rma_shipments
    DROP CONSTRAINT IF EXISTS rma_shipments_status_check;

ALTER TABLE rma_shipments
    ADD CONSTRAINT rma_shipments_status_check
    CHECK (status IN ('NOT_SHIPPED', 'SCHEDULED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED_DELIVERY', 'CANCELLED'));

-- Replace the one-inbound-per-RMA unique index so a CANCELLED shipment no
-- longer blocks a fresh pickup request for the same RMA.
DROP INDEX IF EXISTS rma_shipments_one_inbound_per_rma;

CREATE UNIQUE INDEX IF NOT EXISTS rma_shipments_one_active_inbound_per_rma
    ON rma_shipments (rma_id)
    WHERE direction = 'INBOUND' AND status != 'CANCELLED';