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
    pickup_same_as_profile,
    pickup_address_line1,
    pickup_city,
    pickup_state,
    pickup_pincode,
  } = data;
  const result = await pool.query(
    `INSERT INTO rmas (
       dealer_id, product_serial, product_name, issue_type,
       issue_description, purchase_date, warranty_status, warranty_expiry,
       pickup_same_as_profile, pickup_address_line1, pickup_city, pickup_state, pickup_pincode
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
    [
      dealer_id,
      product_serial,
      product_name,
      issue_type,
      issue_description,
      purchase_date,
      warranty_status,
      warranty_expiry,
      pickup_same_as_profile ?? true,
      pickup_address_line1 ?? null,
      pickup_city ?? null,
      pickup_state ?? null,
      pickup_pincode ?? null,
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
  const result = await pool.query(`SELECT * FROM rmas WHERE id = $1`, [id]);
  return result.rows[0];
};

export const getRmaAttachments = async (rma_id) => {
  const result = await pool.query(
    `SELECT * FROM rma_attachments WHERE rma_id = $1 ORDER BY created_at ASC`,
    [rma_id],
  );
  return result.rows;
};

export const getRmaByNumber = async (rma_number) => {
  const result = await pool.query(`SELECT * FROM rmas WHERE rma_number = $1`, [
    rma_number,
  ]);
  return result.rows[0];
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Accepts either the UUID id or the human-readable rma_number (e.g. "RMA-2026-000123")
export const getRmaByIdOrNumber = async (identifier) => {
  return UUID_RE.test(identifier)
    ? getRmaById(identifier)
    : getRmaByNumber(identifier);
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

export const getRecentRmasByDealerId = async (dealer_id, limit) => {
  const result = await pool.query(
    `SELECT * FROM rmas WHERE dealer_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [dealer_id, limit],
  );
  return result.rows;
};

export const getAllRmas = async (status = null, dealer_id = null) => {
  const params = [];
  const conditions = [];

  if (status) {
    params.push(status);
    conditions.push(`status = $${params.length}`);
    // query += ` WHERE status = $1`;
  }
  if (dealer_id) {
    // query += ` AND WHERE dealer_id = $2`;
    params.push(dealer_id);
    conditions.push(`dealer_id  = $${params.length}`);
  }
  let query = `SELECT * FROM rmas`;
  if (conditions.length) {
    query += ` WHERE ${conditions.join(" AND ")}`;
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
