import pool from "../../config/db.js";

export const createOtp = async (email, otp, expiresAt) => {
  const result = await pool.query(
    `INSERT INTO otps (email, otp, expires_at, verified, attempts)
     VALUES ($1, $2, $3, false, 0)
     ON CONFLICT (email)
     DO UPDATE SET otp = $2, expires_at = $3, verified = false, attempts = 0
     RETURNING *`,
    [email, otp, expiresAt],
  );
  return result.rows[0];
};

// Returns the pending (unverified, unexpired) OTP record for this email
// regardless of whether the submitted code matches — callers need this to
// track/increment wrong-attempt counts even on a mismatch.
export const getPendingOtp = async (email) => {
  const result = await pool.query(
    `SELECT * FROM otps
     WHERE email = $1 AND verified = false AND expires_at > NOW()`,
    [email],
  );
  return result.rows[0];
};

export const incrementOtpAttempts = async (id) => {
  const result = await pool.query(
    `UPDATE otps SET attempts = attempts + 1 WHERE id = $1 RETURNING *`,
    [id],
  );
  return result.rows[0];
};

export const getLatestOtp = async (email) => {
  const result = await pool.query(`SELECT * FROM otps WHERE email=$1`, [email]);
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
    address_line1,
    city,
    state,
    pincode,
    gst_number,
    password,
  } = data;
  const result = await pool.query(
    `INSERT INTO dealers (full_name, mobile, email, business_name,   address_line1,
    city,
    state,
    pincode, gst_number,password)
     VALUES ($1, $2, $3, $4, $5, $6,$7,$8,$9,$10)
      RETURNING id, full_name ,mobile, email, business_name,  address_line1,
      city,
      state,
      pincode, gst_number, status, created_at, updated_at`,
    [
      full_name,
      mobile,
      email,
      business_name,
      address_line1,
      city,
      state,
      pincode,
      gst_number,
      password,
    ],
  );
  return result.rows[0];
};

////////////////////////////////////////////////////////////// Get dealer by mobile
export const getDealerByMobile = async (mobile) => {
  const result = await pool.query(
    `SELECT id, full_name ,mobile, email, business_name, address_line1, city, state, pincode, gst_number, status, created_at, updated_at FROM dealers WHERE mobile = $1
    `,
    [mobile],
  );
  return result.rows[0];
};

////////////////////////////////////////////////////////////// Get dealer by Email

export const getDealerByEmail = async (email) => {
  //TODO:don't return dealer's password not  a good practice
  const result = await pool.query(`SELECT * FROM dealers WHERE email = $1 `, [
    email,
  ]);
  return result.rows[0];
};

////////////////////////////////////////////////////////////// Get All dealers

export const getAllDealers = async (status = null) => {
  let query = `SELECT id, full_name ,mobile, email, business_name, address_line1, city, state, pincode, gst_number, status, created_at, updated_at FROM dealers`;
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
    `SELECT id, full_name ,mobile, email, business_name, address_line1, city, state, pincode, gst_number, status, created_at, updated_at FROM dealers WHERE id = $1 `,
    [id],
  );
  return result.rows[0];
};

////////////////////////////////////////////////////////////// Store the dealer's registered Shiprocket pickup location nickname
export const updateDealerShiprocketPickupLocation = async (
  id,
  shiprocket_pickup_location,
) => {
  const result = await pool.query(
    `UPDATE dealers SET shiprocket_pickup_location = $1, updated_at = NOW() WHERE id = $2 RETURNING id, shiprocket_pickup_location`,
    [shiprocket_pickup_location, id],
  );
  return result.rows[0];
};

// Includes the password hash — internal use only (e.g. change-password verification), never returned to a client
export const getDealerByIdWithPassword = async (id) => {
  const result = await pool.query(`SELECT * FROM dealers WHERE id = $1`, [id]);
  return result.rows[0];
};

/////////////////////////////////////////////// UPDATE DEALER'S STATUS
export const updateDealerStatus = async (
  id,
  status,
  rejectionReason = null,
) => {
  const result = await pool.query(
    `UPDATE dealers
     SET status = $1, rejection_reason = $2, updated_at = NOW()
     WHERE id = $3 RETURNING id, full_name ,mobile, email, business_name, address_line1, city, state, pincode, gst_number, status, created_at, updated_at`,
    [status, rejectionReason, id],
  );
  return result.rows[0];
};

////////////////////////////////////////////////////////////// Update dealer profile fields
export const updateDealerProfile = async (id, fields) => {
  const {
    full_name,
    mobile,
    business_name,
    address_line1,
    city,
    state,
    pincode,
  } = fields;
  const result = await pool.query(
    `UPDATE dealers
     SET full_name = COALESCE($1, full_name),
         mobile = COALESCE($2, mobile),
         business_name = COALESCE($3, business_name),
         address_line1 = COALESCE($4,address_line1),
         city = COALESCE($5,city),
         state = COALESCE($6,state), 
         pincode=COALESCE($7,pincode),
         updated_at = NOW()
     WHERE id = $8
     RETURNING id, full_name, mobile, email, business_name, address_line1, city, state, pincode, gst_number, status, created_at, updated_at`,
    [
      full_name ?? null,
      mobile ?? null,
      business_name ?? null,
      address_line1 ?? null,
      city ?? null,
      state ?? null,
      pincode ?? null,
      id,
    ],
  );
  return result.rows[0];
};

////////////////////////////////////////////////////////////// Update dealer password (expects an already-hashed value)
export const updateDealerPassword = async (id, hashedPassword) => {
  const result = await pool.query(
    `UPDATE dealers SET password = $1, updated_at = NOW() WHERE id = $2 RETURNING id`,
    [hashedPassword, id],
  );
  return result.rows[0];
};
