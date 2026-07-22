-- Mirror rma_shipments_one_active_inbound_per_rma for OUTBOUND shipments,
-- so duplicate outbound shipments for the same RMA are rejected at the DB
-- level too, not just by the app-layer check in shipment.service.js.
CREATE UNIQUE INDEX IF NOT EXISTS rma_shipments_one_active_outbound_per_rma
    ON rma_shipments (rma_id)
    WHERE direction = 'OUTBOUND' AND status != 'CANCELLED';
