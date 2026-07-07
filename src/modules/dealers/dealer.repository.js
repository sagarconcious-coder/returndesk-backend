import pool from "../../config/db.js";

export const createOtp = async (email, otp, expiresAt) => {
  const result = await pool.query(
    `INSERT INTO otps (email, otp, expires_at, verified)
     VALUES ($1, $2, $3, false)
     ON CONFLICT (email)
     DO UPDATE SET otp = $2, expires_at = $3, verified = false
     RETURNING *`,
    [email, otp, expiresAt],
  );
  return result.rows[0];
};

export const getValidOtp = async (email, otp) => {
  const result = await pool.query(
    `SELECT * FROM otps
     WHERE email = $1 AND otp = $2 AND verified = false AND expires_at > NOW()`,
    [email, otp],
  );
  return result.rows[0];
};

export const markOtpVerified = async (id) => {
  const result = await pool.query(
    `UPDATE otps SET verified = true WHERE id = $1 RETURNING *`,
    [id],
  );
  return result.rows[0];
};

export const createDealer = async (data) => {
  const {
    full_name,
    mobile,
    email,
    business_name,
    business_address,
    gst_number,
    password,
  } = data;
  const result = await pool.query(
    `INSERT INTO dealers (full_name, mobile, email, business_name, business_address, gst_number,password)
     VALUES ($1, $2, $3, $4, $5, $6,$7)
      RETURNING id, full_name ,mobile, email, business_name, business_address, gst_number, status, created_at, updated_at`,
    [
      full_name,
      mobile,
      email,
      business_name,
      business_address,
      gst_number,
      password,
    ],
  );
  return result.rows[0];
};

////////////////////////////////////////////////////////////// Get dealer by mobile
export const getDealerByMobile = async (mobile) => {
  const result = await pool.query(
    `SELECT id, full_name ,mobile, email, business_name, business_address, gst_number, status, created_at, updated_at FROM dealers WHERE mobile = $1
    `,
    [mobile],
  );
  return result.rows[0];
};

////////////////////////////////////////////////////////////// Get dealer by Email

export const getDealerByEmail = async (email) => {
  const result = await pool.query(`SELECT * FROM dealers WHERE email = $1 `, [
    email,
  ]);
  return result.rows[0];
};

////////////////////////////////////////////////////////////// Get All dealers

export const getAllDealers = async (status = null) => {
  let query = `SELECT id, full_name ,mobile, email, business_name, business_address, gst_number, status, created_at, updated_at FROM dealers`;
  const params = [];
  if (status) {
    query += ` WHERE status = $1`;
    params.push(status);
  }
  query += ` ORDER BY created_at DESC 
`;

  const result = await pool.query(query, params);
  return result.rows;
};

////////////////////////////////////////////////////////////// Get dealer by Id

export const getDealerById = async (id) => {
  const result = await pool.query(
    `SELECT id, full_name ,mobile, email, business_name, business_address, gst_number, status, created_at, updated_at FROM dealers WHERE id = $1 `,
    [id],
  );
  return result.rows[0];
};

export const updateDealerStatus = async (
  id,
  status,
  rejectionReason = null,
) => {
  const result = await pool.query(
    `UPDATE dealers
     SET status = $1, rejection_reason = $2, updated_at = NOW()
     WHERE id = $3 RETURNING id, full_name ,mobile, email, business_name, business_address, gst_number, status, created_at, updated_at`,
    [status, rejectionReason, id],
  );
  return result.rows[0];
};
