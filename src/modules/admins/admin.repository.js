import pool from "../../config/db.js";

export const getAdminByEmail = async (email) => {
  const result = await pool.query(`SELECT * FROM admins WHERE email = $1`, [
    email,
  ]);
  return result.rows[0];
};
