import pool from "../../config/db.js";

export const createNotification = async ({
  dealer_id = null,
  recipient_role = "DEALER",
  type,
  title,
  message,
  reference_id,
}) => {
  const result = await pool.query(
    `INSERT INTO notifications (dealer_id, recipient_role, type, title, message, reference_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [dealer_id, recipient_role, type, title, message, reference_id],
  );
  return result.rows[0];
};

export const getNotificationsByDealerId = async (dealer_id, unreadOnly = false) => {
  let query = `SELECT * FROM notifications WHERE dealer_id = $1`;
  const params = [dealer_id];
  if (unreadOnly) {
    query += ` AND is_read = false`;
  }
  query += ` ORDER BY created_at DESC`;

  const result = await pool.query(query, params);
  return result.rows;
};

export const markNotificationRead = async (id, dealer_id) => {
  const result = await pool.query(
    `UPDATE notifications SET is_read = true
     WHERE id = $1 AND dealer_id = $2
     RETURNING *`,
    [id, dealer_id],
  );
  return result.rows[0];
};

export const markAllNotificationsRead = async (dealer_id) => {
  await pool.query(
    `UPDATE notifications SET is_read = true WHERE dealer_id = $1 AND is_read = false`,
    [dealer_id],
  );
};

export const getAdminNotifications = async (unreadOnly = false) => {
  let query = `SELECT * FROM notifications WHERE recipient_role = 'ADMIN'`;
  if (unreadOnly) {
    query += ` AND is_read = false`;
  }
  query += ` ORDER BY created_at DESC`;

  const result = await pool.query(query);
  return result.rows;
};

export const markAdminNotificationRead = async (id) => {
  const result = await pool.query(
    `UPDATE notifications SET is_read = true
     WHERE id = $1 AND recipient_role = 'ADMIN'
     RETURNING *`,
    [id],
  );
  return result.rows[0];
};

export const markAllAdminNotificationsRead = async () => {
  await pool.query(
    `UPDATE notifications SET is_read = true WHERE recipient_role = 'ADMIN' AND is_read = false`,
  );
};
