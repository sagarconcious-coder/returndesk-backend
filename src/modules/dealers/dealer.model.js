import pool from "../../config/db.js";

// createOtp(mobile, otp, expiresAt)

export const createOtp = async (mobile, otp, expiresAt) => {
  // → INSERT into otps table
  const result = await pool.query(
    `INSERT INTO otps (mobile,otp,expires_at) VALUES ($1,$2,$3) RETURNING *`,
    [mobile, otp, expiresAt],
  );
  return result.rows[0];
};

// getValidOtp(mobile, otp)

export const getValidOtp = async (mobile, otp) => {
  // → SELECT where mobile=? AND otp=? AND verified=false AND expires_at > NOW()

  const result = await pool.query(
    `SELECT * FROM otps
        WHERE mobile=$1 AND otp=$2 AND 
        verified=false AND
        expires_at > Now()
        `,
    [mobile, otp],
  );
  return result.rows[0];
};

// markOtpVerified(id)
export const markOtpVerified = async (id) => {
  // → UPDATE otps SET verified=true WHERE id=?

  const result = await pool.query(
    `UPDATE otps 
         SET verified=true
         WHERE id=$1`,
    [id],
  );
  return result.rows[0];
};

// createDealer(data)
export const createDealer = async (data) => {
  const {
    full_name,
    mobile,
    email,
    business_name,
    business_address,
    gst_number,
  } = data;
  // → INSERT into dealers (full_name, mobile, email, business_name, business_address, gst_number)

  const result = await pool.query(
    `INSERT INTO dealers
        (full_name,mobile,email,business_name,business_address,gst_number)
        VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
    [full_name, mobile, email, business_name, business_address, gst_number],
  );
  return result.rows[0];
};

// getDealerByMobile(mobile)
export const getDealerByMobile = async (mobile) => {
  // → SELECT from dealers WHERE mobile=?

  const result = await pool.query(
    `SELECT * FROM dealers
        WHERE mobile=$1`,
    [mobile],
  );
  return result.rows[0];
};

// getAllDealers(status)
export const getAllDealers = async (status) => {
  // → SELECT from dealers WHERE status=? (optional filter)

  const result = await pool.query(
    `SELECT  * FROM dealers
        WHERE status=$1`,
    [status],
  );
  return result.rows;
};

//////////////////////////////////////// getDealerById(id)
export const getDealerById = async (id) => {
  // → SELECT from dealers WHERE id=?

  const result = await pool.query(
    `SELECT * FROM dealers
        WHERE id=$1`,
    [id],
  );
  return result.rows[0];
};

// updateDealerStatus(id, status, rejectionReason)
export const updateDealerStatus = async (id, status, rejectionReason) => {
  // → UPDATE dealers SET status=?, rejection_reason=?, updated_at=NOW() WHERE id=?

  const result = await pool.query(
    `UPDATE dealers
        SET status=$1,rejection_reason=$2,updated_at=NOW()
        WHERE id=$3 RETURNING *`,
    [status, rejectionReason, id],
  );
  return result.rows[0];
};
