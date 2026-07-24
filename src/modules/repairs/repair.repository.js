import pool from "../../config/db.js";

export const createRepair = async (rma_id, client = pool) => {
  //TODO: Change the function in future
  // ON CONFLICT DO NOTHING guards the repairs.rma_id UNIQUE constraint —
  // concurrent callers (e.g. duplicate Shiprocket webhook deliveries) racing
  // to auto-create the repair row for the same RMA no longer throw an
  // unhandled 23505; the loser just gets no row back.
  const result = await client.query(
    `INSERT INTO repairs (rma_id) VALUES ($1) ON CONFLICT (rma_id) DO NOTHING RETURNING *`,
    [rma_id],
  );
  return result.rows[0];
};

/////////////////////// GET REPAIR BY SPECIFIC RMA_ID

export const getRepairByRmaId = async (rma_id, client = pool) => {
  const result = await client.query(`SELECT * FROM repairs WHERE rma_id=$1`, [
    rma_id,
  ]);
  return result.rows[0];
};

/////////////////////// GET ALL REPAIRS (admin list), optionally filtered by status
export const getAllRepairs = async (status = null) => {
  const params = [];
  let query = `
    SELECT repairs.*, rmas.rma_number, rmas.product_name, rmas.product_serial
    FROM repairs
    JOIN rmas ON rmas.id = repairs.rma_id
  `;
  if (status) {
    params.push(status);
    query += ` WHERE repairs.status = $1`;
  }
  query += ` ORDER BY repairs.created_at DESC`;
  const result = await pool.query(query, params);
  return result.rows;
};

/////////////////////// GET ALL REPAIRS DONE FOR SPECIFIC DEALER
export const getRepairsByDealerId = async (dealer_id) => {
  const result = await pool.query(
    ` SELECT repairs.*
          FROM repairs
          JOIN rmas ON rmas.id = repairs.rma_id
          WHERE rmas.dealer_id = $1
          ORDER BY repairs.created_at DESC
        `,
    [dealer_id],
  );
  return result.rows;
};

///////////////////////// UPDATE REPAIR INFO
// expectedStatus (optional): when set, the UPDATE only applies if the repair's
// *current* status still matches it — an atomic compare-and-swap guard against
// two concurrent admin actions (or a duplicate webhook-triggered call) racing
// the same status transition, mirroring the pattern already used for
// rmas.status (rma.repository.js updateRmaStatus) and shipment transitions.
// Returns undefined if the row didn't match (either wrong rma_id or stale status).
export const updateRepair = async (rma_id, fields, expectedStatus = null) => {
  //TODO: Change the function in future

  const {
    technician_name,
    status,
    diagnosis,
    parts_used,
    repair_notes,
    started_at,
    completed_at,
  } = fields;
  const params = [
    technician_name ?? null,
    status ?? null,
    diagnosis ?? null,
    parts_used ?? null,
    repair_notes ?? null,
    started_at ?? null,
    completed_at ?? null,
    rma_id,
  ];
  let query = `
    UPDATE repairs
    SET technician_name = COALESCE($1,technician_name),
    status = COALESCE($2,status),
    diagnosis = COALESCE($3,diagnosis),
    parts_used = COALESCE($4,parts_used),
    repair_notes = COALESCE($5,repair_notes),
    started_at = COALESCE($6,started_at),
    completed_at = COALESCE($7, completed_at),
    updated_at = NOW()
    WHERE rma_id = $8
  `;
  if (expectedStatus) {
    params.push(expectedStatus);
    query += ` AND status = $${params.length}`;
  }
  query += ` RETURNING *`;
  const result = await pool.query(query, params);
  return result.rows[0];
};
