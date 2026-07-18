import pool from "../../config/db.js";

export const getAdminByEmail = async (email) => {
  const result = await pool.query(`SELECT * FROM admins WHERE email = $1`, [
    email,
  ]);
  return result.rows[0];
};

export const getDashboardCounts = async () => {
  const result = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM dealers WHERE status = 'PENDING')      AS pending_dealers,
      (SELECT COUNT(*) FROM rmas WHERE status = 'PENDING')         AS pending_rmas,
      (SELECT COUNT(*) FROM repairs WHERE status = 'IN_PROGRESS')  AS active_repairs,
      (SELECT COUNT(*) FROM rma_shipments
        WHERE status NOT IN ('DELIVERED', 'FAILED_DELIVERY'))      AS open_shipments
  `);
  return result.rows[0];
};

export const createAdmin = async ({ name, email, password, role }) => {
  const result = await pool.query(
    `INSERT INTO admins (name,email,password,role)
     VALUES ($1,$2,$3,$4)
     RETURNING id,name,email,role,status,created_at,updated_at
`,
    [name, email, password, role],
  );
  return result.rows[0];
};

export const getAllAdmins = async () => {
  const result = await pool.query(`
      SELECT id,name,email,role,status,created_at,updated_at 
      FROM admins ORDER BY created_at DESC
    `);
  return result.rows;
};

export const getAdminById = async (id) => {
  const result = await pool.query(
    `
      SELECT id,name,email,role,status,created_at,updated_at
      FROM admins WHERE id=$1
    `,
    [id],
  );
  return result.rows[0];
};

export const updateAdminStatus = async (id, status) => {
  const result = await pool.query(
    `
      UPDATE admins SET status = $1,updated_at = NOW()
      WHERE id = $2
      RETURNING id,name,email,role,status,created_at,updated_at
    `,
    [status, id],
  );
  return result.rows[0];
};

export const updateAdminRole = async (id, role) => {
  const result = await pool.query(
    `
      UPDATE admins SET role = $1 , updated_at = NOW()
      WHERE id = $2
    `,
    [role, id],
  );
  return result.rows[0];
};
