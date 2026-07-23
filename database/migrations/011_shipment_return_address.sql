-- Outbound (warehouse -> dealer) shipments can be sent to a different
-- address than the one the item was picked up from — admin chooses at
-- ship-back time. Mirrors rmas.pickup_same_as_profile / pickup_address_*.
ALTER TABLE rma_shipments
    ADD COLUMN IF NOT EXISTS return_address_same_as_pickup BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE rma_shipments
    ADD COLUMN IF NOT EXISTS return_address_line1 VARCHAR(255);

ALTER TABLE rma_shipments
    ADD COLUMN IF NOT EXISTS return_address_city VARCHAR(100);

ALTER TABLE rma_shipments
    ADD COLUMN IF NOT EXISTS return_address_state VARCHAR(100);

ALTER TABLE rma_shipments
    ADD COLUMN IF NOT EXISTS return_address_pincode VARCHAR(10);
