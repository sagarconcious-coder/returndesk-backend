import pool from "../../config/db.js";

export const createRma = async (data) => {
  const {
    dealer_id,
    product_serial,
    product_name,
    issue_type,
    issue_description,
    purchase_date,
    warranty_status,
    warranty_expiry,
  } = data;
  const result = await pool.query(
    `INSERT INTO rmas (
       dealer_id, product_serial, product_name, issue_type,
       issue_description, purchase_date, warranty_status, warranty_expiry
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [
      dealer_id,
      product_serial,
      product_name,
      issue_type,
      issue_description,
      purchase_date,
      warranty_status,
      warranty_expiry,
    ],
  );
  return result.rows[0];
};

export const createRmaAttachments = async (rma_id, attachments) => {
  const result = await pool.query(
    `INSERT INTO rma_attachments (rma_id, file_name, file_url, kind)
     SELECT $1, a.file_name, a.file_url, a.kind
     FROM UNNEST($2::text[], $3::text[], $4::text[]) AS a(file_name, file_url, kind)
     RETURNING *`,
    [
      rma_id,
      attachments.map((a) => a.file_name),
      attachments.map((a) => a.file_url ?? null),
      attachments.map((a) => a.kind ?? "file"),
    ],
  );
  return result.rows;
};

export const getRmaById = async (id) => {
  const result = await pool.query(
    `SELECT * FROM rmas WHERE id = $1`,
    [id],
  );
  return result.rows[0];
};

export const getRmaByNumber = async (rma_number) => {
  const result = await pool.query(
    `SELECT * FROM rmas WHERE rma_number = $1`,
    [rma_number],
  );
  return result.rows[0];
};

export const getRmasByDealerId = async (dealer_id, status = null) => {
  let query = `SELECT * FROM rmas WHERE dealer_id = $1`;
  const params = [dealer_id];
  if (status) {
    query += ` AND status = $2`;
    params.push(status);
  }
  query += ` ORDER BY created_at DESC`;
  const result = await pool.query(query, params);
  return result.rows;
};

export const getAllRmas = async (status = null) => {
  let query = `SELECT * FROM rmas`;
  const params = [];
  if (status) {
    query += ` WHERE status = $1`;
    params.push(status);
  }
  query += ` ORDER BY created_at DESC`;
  const result = await pool.query(query, params);
  return result.rows;
};

export const updateRmaStatus = async (id, status, rejection_reason = null) => {
  const result = await pool.query(
    `UPDATE rmas
     SET status = $1, rejection_reason = $2, updated_at = NOW()
     WHERE id = $3 RETURNING *`,
    [status, rejection_reason, id],
  );
  return result.rows[0];
};
