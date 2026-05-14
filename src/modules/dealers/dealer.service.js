import {
  getDealerByMobile,
  createOtp,
  getValidOtp,
  markOtpVerified,
  createDealer,
  getAllDealers,
  getDealerById as getDealerFromDb,
  updateDealerStatus,
} from "./dealer.model.js";
import logger from "../../config/logger.js";
import jwt from "jsonwebtoken";

//////////////////////////////////////////////////////////////// A) requestOtp(mobile)
export const requestOtp = async (mobile) => {
  // 1. Check if dealer already ACTIVE with getDealerByMobile → throw error if yes
  const dealer = await getDealerByMobile(mobile);
  if (dealer && dealer.status === "ACTIVE") {
    throw new Error("Dealer already ACTIVE");
  }

  // 2. Generate 6-digit OTP: Math.floor(1_00_000 + Math.random() * 9_00_000).toString()
  const otp = Math.floor(Math.random() * 9_00_000 + 1_00_000).toString();

  // 3. Set expiresAt = new Date(Date.now() + 10 * 60 * 1000)  ← 10 minutes
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  // 4. Call createOtp(mobile, otp, expiresAt)
  const result = await createOtp(mobile, otp, expiresAt);

  // 5. Log OTP using logger (no SMS yet)
  logger.info(`OTP for ${mobile}: ${otp}`);

  // 6. Return { message: 'OTP sent' }
  return { message: "OTP sent", otp };
};

////////////////////////////////////////////////////////// B) verifyOtp(mobile, otp)
export const verifyOtp = async (mobile, otp) => {
  // 1. Call getValidOtp(mobile, otp) → throw error if not found

  const otpRecord = await getValidOtp(mobile, otp);
  if (!otpRecord) {
    throw new Error("INVALID OTP");
  }
  // 2. Call markOtpVerified(otpRecord.id)
  await markOtpVerified(otpRecord.id);

  // 3. Sign a JWT: { mobile, purpose: 'REGISTRATION' }, expires in 15 minutes
  const token = jwt.sign(
    { mobile: mobile, purpose: "REGISTRATION" },
    process.env.JWT_SECRET,
    { expiresIn: "15m" },
  );
  // 4. Return { token }
  return { token };
};

//////////////////////////////////////////////////////// C) registerDealer(token, data)
export const registerDealer = async (token, data) => {
  // 1. Verify JWT token → extract mobile
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new Error("Invalid or expired token");
  }
  const { mobile } = decoded;
  // 2. Check dealer doesn't already exist with getDealerByMobile → throw if exists

  const dealer = await getDealerByMobile(mobile);
  if (dealer) {
    throw new Error("Dealer already exists");
  }
  // 3. Call createDealer({ ...data, mobile })
  const newDealer = await createDealer({ ...data, mobile });

  // 4. Return the new dealer
  return { message: "Dealer registered successfully", dealer: newDealer };
};

///////////////////////////////////////////////// D) getDealers(status['ACTIVE','PENDING','INACTIVE'])

export const getDealers = async (status = null) => {
  // → call getAllDealers(status), return result
  const dealers = await getAllDealers(status);
  return dealers;
};

//////////////////////////////////////////////////////// E) getDealerById(id)
export const getDealerById = async (id) => {
  // → call getDealerById(id), throw error if not found, return dealer

  const dealer = await getDealerFromDb(id);
  if (!dealer) {
    throw new Error(`Dealer doesn't exist `);
  }
  return dealer;
};

///////////////////////////////////////////////////////////// F) approveDealer(id)
// → call updateDealerStatus(id, 'ACTIVE', null), return updated dealer
export const approveDealer = async (id) => {
  const dealer = await updateDealerStatus(id, "ACTIVE", null);

  return dealer;
};

/////////////////////////////////////////////// G) rejectDealer(id, reason)
export const rejectDealer = async (id, reason) => {
  // → call updateDealerStatus(id, 'REJECTED', reason), return updated dealer

  const dealer = await updateDealerStatus(id, "REJECTED", reason);
  return dealer;
};
