import pool from "../../config/db.js";

export const createRepair = async (rma_id) => {
  //TODO: Change the function in future
  const result = await pool.query(
    `INSERT INTO repairs (rma_id) VALUES ($1) RETURNING *`,
    [rma_id],
  );
  return result.rows[0];
};

/////////////////////// GET REPAIR BY SPECIFIC RMA_ID

export const getRepairByRmaId = async (rma_id) => {
  const result = await pool.query(`SELECT * FROM repairs WHERE rma_id=$1`, [
    rma_id,
  ]);
  return result.rows[0];
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
export const updateRepair = async (rma_id, fields) => {
  //TODO: Change the function in future

  const {
    technician_name,
    status,
    diagnosis,
    parts_used,
    repair_notes,
    started_at,
    created_at,
  } = fields;
  const result = await pool.query(
    `
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
    RETURNING *
    `,
    [
      technician_name ?? null,
      status ?? null,
      diagnosis ?? null,
      parts_used ?? null,
      repair_notes ?? null,
      started_at ?? null,
      completed_at ?? null,
      rma_id,
    ],
  );
  return result.rows[0];
};
