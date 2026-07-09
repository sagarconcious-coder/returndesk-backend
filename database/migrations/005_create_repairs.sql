CREATE TABLE IF NOT EXISTS repairs (
    id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    rma_id           UUID          UNIQUE NOT NULL REFERENCES rmas(id),
    technician_name  VARCHAR(255),
    status           VARCHAR(20)   NOT NULL DEFAULT 'PENDING'
                                    CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'UNREPAIRABLE')),
    diagnosis        TEXT,
    parts_used       TEXT,
    repair_notes     TEXT,
    started_at       TIMESTAMPTZ,
    completed_at     TIMESTAMPTZ,
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
