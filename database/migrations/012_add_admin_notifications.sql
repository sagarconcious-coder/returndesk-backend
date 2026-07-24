ALTER TABLE notifications ALTER COLUMN dealer_id DROP NOT NULL;
ALTER TABLE notifications ADD COLUMN recipient_role VARCHAR(10) NOT NULL DEFAULT 'DEALER' CHECK (recipient_role IN ('DEALER', 'ADMIN'));
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_role ON notifications(recipient_role);
