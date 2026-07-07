CREATE SEQUENCE IF NOT EXISTS rma_number_seq;

CREATE TABLE IF NOT EXISTS rmas (
    id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    rma_number        VARCHAR(50)   UNIQUE NOT NULL DEFAULT (
                                        'RMA-' ||
                                        EXTRACT(YEAR FROM CURRENT_DATE)::text ||
                                        '-' ||
                                        LPAD(nextval('rma_number_seq')::text, 6, '0')
                                    ),
    dealer_id         UUID          NOT NULL REFERENCES dealers(id),
    product_serial    VARCHAR(100)  NOT NULL,
    product_name      VARCHAR(255)  NOT NULL,
    issue_type        VARCHAR(50),
    issue_description TEXT          NOT NULL,
    purchase_date     DATE,
    warranty_status   VARCHAR(20)   CHECK (warranty_status IN ('Under Warranty', 'Out of Warranty')),
    warranty_expiry   DATE,
    status            VARCHAR(20)   NOT NULL DEFAULT 'PENDING'
                                    CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    rejection_reason  TEXT,
    created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rma_attachments (
    id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    rma_id     UUID         NOT NULL REFERENCES rmas(id),
    file_name  VARCHAR(255) NOT NULL,
    file_url   TEXT,
    kind       VARCHAR(20)  NOT NULL DEFAULT 'file' CHECK (kind IN ('file', 'audio')),
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
