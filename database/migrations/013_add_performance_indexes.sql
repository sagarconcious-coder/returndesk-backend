-- Performance indexes for hot-path queries identified in production readiness review.
-- NOTE: these use plain CREATE INDEX (not CONCURRENTLY) because migrate.js runs every
-- file inside a single transaction, and Postgres forbids CONCURRENTLY inside a
-- transaction block. That's fine while these tables are small; if this migration is
-- ever re-run against a large production rma_shipments/rmas table, apply the
-- CONCURRENTLY equivalents manually outside a transaction instead.

-- rmas.dealer_id — hit on every dealer dashboard/list load (getRmasByDealerId,
-- getRecentRmasByDealerId) and joined from repairs/rma_shipments dealer-scoped queries.
-- Composite with created_at covers the ORDER BY created_at DESC these queries also do.
CREATE INDEX IF NOT EXISTS idx_rmas_dealer_id_created_at ON rmas (dealer_id, created_at DESC);

-- rmas.status — admin list filter (getAllRmas), also composite for its ORDER BY.
CREATE INDEX IF NOT EXISTS idx_rmas_status_created_at ON rmas (status, created_at DESC);

-- rma_shipments.rma_id — plain lookup used by getShipmentsByRmaId with no
-- direction/status filter, not covered by the existing partial unique indexes.
CREATE INDEX IF NOT EXISTS idx_rma_shipments_rma_id ON rma_shipments (rma_id);

-- rma_shipments.awb_code — looked up on every inbound Shiprocket webhook delivery.
CREATE INDEX IF NOT EXISTS idx_rma_shipments_awb_code ON rma_shipments (awb_code);

-- rma_shipments(status, direction) — admin list filter (getAllShipments).
CREATE INDEX IF NOT EXISTS idx_rma_shipments_status_direction ON rma_shipments (status, direction);

-- rma_shipments.tracking_number — dealer shipment-tracking lookup.
CREATE INDEX IF NOT EXISTS idx_rma_shipments_tracking_number ON rma_shipments (tracking_number);

-- dealers.status — admin dealer-approval queue (getAllDealers), with its ORDER BY.
CREATE INDEX IF NOT EXISTS idx_dealers_status_created_at ON dealers (status, created_at DESC);

-- notifications(dealer_id, is_read) — dealer notification list/unread filter, not
-- fully covered by the existing single-column dealer_id index.
CREATE INDEX IF NOT EXISTS idx_notifications_dealer_id_is_read ON notifications (dealer_id, is_read, created_at DESC);

-- notifications(recipient_role, is_read) — admin notification list/unread filter.
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_role_is_read ON notifications (recipient_role, is_read, created_at DESC);

-- rma_attachments.rma_id — attachments lookup for RMA detail view.
CREATE INDEX IF NOT EXISTS idx_rma_attachments_rma_id ON rma_attachments (rma_id);

-- repairs.status — admin repairs list filter (getAllRepairs).
CREATE INDEX IF NOT EXISTS idx_repairs_status ON repairs (status);
