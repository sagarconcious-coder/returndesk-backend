import pool from "../../config/db.js";

export const createPickupRequest = async (dealer_id, client = pool) => {
  const result = await client.query(
    `INSERT INTO pickup_requests (dealer_id) VALUES ($1) RETURNING *`,
    [dealer_id],
  );

  return result.rows[0];
};

export const getPickupRequestById = async (id) => {
  const result = await pool.query(
    `SELECT * FROM pickup_requests WHERE id = $1`,
    [id],
  );
  return result.rows[0];
};

export const updatePickupRequestStatus = async (
  id,
  status,
  shiprocket_pickup_id,
) => {
  const result = await pool.query(
    `
            UPDATE pickup_requests
            SET status = COALESCE($1,status), shiprocket_pickup_id = COALESCE($2,shiprocket_pickup_id)
            WHERE id = $3
            RETURNING *
        `,
    [status ?? null, shiprocket_pickup_id ?? null, id],
  );
  return result.rows[0];
};
