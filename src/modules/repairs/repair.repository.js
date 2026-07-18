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
export const updateRepair = async (rma_id, fields) => {
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
