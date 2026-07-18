import jwt from "jsonwebtoken";
import logger from "../../config/logger.js";
import bcrypt from "bcrypt";
import {
  DEALER_STATUS,
  OTP_PURPOSE,
} from "../../common/constants/status.constants.js";
import { generateOtp, getOtpExpiry } from "../../common/utils/otp.util.js";
import { sendOtpEmail } from "../../common/utils/email.utils.js";
import {
  createOtp,
  getValidOtp,
  markOtpVerified,
  createDealer,
  getDealerByEmail,
  getAllDealers,
  getDealerById as getDealerByIdFromRepo,
  getDealerByIdWithPassword,
  updateDealerStatus,
  updateDealerProfile as updateDealerProfileInRepo,
  updateDealerPassword,
  getLatestOtp,
} from "./dealer.repository.js";

/////////////////////////////////////////////////////////////////////////////////////// A) requestOtp(email)
// → generates OTP, saves to DB, logs it (no email service yet)
const OTP_RESEND_COOLDOWN_SECONDS = 60;

export const requestOtp = async (email) => {
  // 1. Block if dealer is already ACTIVE
  const dealer = await getDealerByEmail(email);
  if (dealer && dealer.status === DEALER_STATUS.ACTIVE) {
    const error = new Error("Dealer is already active");
    error.statusCode = 409;
    throw error;
  }
  // 1 b)
  const existingOtp = await getLatestOtp(email);
  if (existingOtp) {
    const secondsSinceLastSend =
      (Date.now() - new Date(existingOtp.created_at).getTime()) / 1000;
    const cooldown = OTP_RESEND_COOLDOWN_SECONDS;
    if (secondsSinceLastSend < cooldown) {
      const waitseconds = Math.ceil(cooldown - secondsSinceLastSend);
      const error = new Error(
        `Please wait ${waitseconds}s before requesting another OTP`,
      );
      error.statusCode = 429;
      error.retryAfter = waitseconds;
      throw error;
    }
  }

  // 2. Generate OTP and expiry (10 min)
  const otp = generateOtp(); //123456
  const expiresAt = getOtpExpiry(10);

  // 3. Persist OTP
  await createOtp(email, otp, expiresAt);

  try {
    // 4. Log OTP (replace with email integration later)
    // logger.info(`OTP for ${email}: ${otp}`);
    await sendOtpEmail(email, otp);
  } catch {
    const emailError = new Error("Failed to send OTP email, Please Try again");
    emailError.statusCode = 502;
    throw emailError;
  }

  return { message: "OTP sent", retryAfter: OTP_RESEND_COOLDOWN_SECONDS };
};

///////////////////////////////////////////////////////////////////////////////////////  B) verifyOtp(email, otp)
// → validates OTP, marks it verified, returns a short-lived JWT
export const verifyOtp = async (email, otp) => {
  // 1. Fetch valid (unexpired, unverified) OTP record
  const otpRecord = await getValidOtp(email, otp);
  if (!otpRecord) {
    const error = new Error("Invalid or expired OTP");
    error.statusCode = 400;
    throw error;
  }

  // 2. Mark OTP as used so it cannot be replayed
  await markOtpVerified(otpRecord.id);

  // 3. Issue a 15-min registration token
  const token = jwt.sign(
    { email, purpose: OTP_PURPOSE.REGISTRATION },
    process.env.JWT_SECRET,
    { expiresIn: "15m" },
  );
  return { token };
};

/////////////////////////////////////////////////////////////////////////////////////// C) registerDealer(token, data)
// → verifies registration JWT, creates dealer record
export const registerDealer = async (token, data) => {
  // 1. Verify the JWT issued after OTP verification
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    const error = new Error(
      "Registration session expired, please request a new OTP",
    );

    error.statusCode = 401;
    throw error;
  }

  // 2. Ensure token was issued for registration (not some other purpose)
  if (decoded.purpose !== OTP_PURPOSE.REGISTRATION) {
    const error = new Error("Token not valid for registration");
    error.statusCode = 401;
    throw error;
  }

  // 3. Prevent duplicate registration
  const existing = await getDealerByEmail(decoded.email);
  if (existing) {
    const error = new Error("Dealer already registered");
    error.statusCode = 409;
    throw error;
  }
  const hashedPassword = await bcrypt.hash(data.password, 10);
  // 4. Create dealer (email comes from verified token, not request body)
  const dealer = await createDealer({
    ...data,
    email: decoded.email,
    password: hashedPassword,
  });
  return { message: "Registration submitted, pending approval", dealer };
};

/////////////////////////////////////////////////////////////////////////////////////// D) getDealers(status)
// → returns all dealers, optionally filtered by status: PENDING | ACTIVE | REJECTED
export const getDealers = async (status = null) => {
  return getAllDealers(status);
};

// E) getDealerById(id)
// → returns single dealer or throws 404
export const getDealerById = async (id) => {
  const dealer = await getDealerByIdFromRepo(id);
  if (!dealer) {
    const error = new Error("Dealer not found");
    error.statusCode = 404;
    throw error;
  }
  return dealer;
};

// F) approveDealer(id)
// → sets dealer status to ACTIVE
export const approveDealer = async (id) => {
  const dealer = await updateDealerStatus(id, DEALER_STATUS.ACTIVE, null);
  if (!dealer) {
    const error = new Error("Dealer not found");
    error.statusCode = 404;
    throw error;
  }
  return dealer;
};

// G) rejectDealer(id, reason)
// → sets dealer status to REJECTED with a reason
export const rejectDealer = async (id, reason) => {
  const dealer = await updateDealerStatus(id, DEALER_STATUS.REJECTED, reason);
  if (!dealer) {
    const error = new Error("Dealer not found");
    error.statusCode = 404;
    throw error;
  }
  return dealer;
};

/////////////////////////////////////////////////////////////////////////////////////// loginDealer

export const loginDealer = async (email, password) => {
  const dealer = await getDealerByEmail(email);

  //// A) If dealer doens't exist
  if (!dealer) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }
  //// B) If exists, but is not Active (pending)
  if (dealer.status !== DEALER_STATUS.ACTIVE) {
    const error = new Error("Account is not active yet");
    error.statusCode = 401;
    throw error;
  }

  //// C) Check password matches
  const isMathch = await bcrypt.compare(password, dealer.password);
  if (!isMathch) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  const token = jwt.sign(
    {
      dealer_id: dealer.id,
      email: dealer.email,
      role: "dealer",
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" },
  );

  return { token, username: dealer.full_name };
};

/////////////////////////////////////////////////////////////////////////////////////// getMyProfile(dealer_id)
// → returns the dealer's own profile, reshaped for the frontend (full_name -> name)
export const getMyProfile = async (dealer_id) => {
  const dealer = await getDealerById(dealer_id);
  return serializeProfile(dealer);
};

/////////////////////////////////////////////////////////////////////////////////////// updateMyProfile(dealer_id, data)
// → dealer edits their own name/mobile/business info; email and gst_number are not editable here
export const updateMyProfile = async (dealer_id, data) => {
  const {
    full_name,
    mobile,
    business_name,
    address_line1,
    city,
    state,
    pincode,
  } = data;
  const dealer = await updateDealerProfileInRepo(dealer_id, {
    full_name,
    mobile,
    business_name,
    address_line1,
    city,
    state,
    pincode,
  });
  if (!dealer) {
    const error = new Error("Dealer not found");
    error.statusCode = 404;
    throw error;
  }
  return serializeProfile(dealer);
};

/////////////////////////////////////////////////////////////////////////////////////// changeMyPassword(dealer_id, current_password, new_password)
export const changeMyPassword = async (
  dealer_id,
  current_password,
  new_password,
) => {
  const dealer = await getDealerByIdWithPassword(dealer_id);
  if (!dealer) {
    const error = new Error("Dealer not found");
    error.statusCode = 404;
    throw error;
  }

  const isMatch = await bcrypt.compare(current_password, dealer.password);
  if (!isMatch) {
    const error = new Error("Current password is incorrect");
    error.statusCode = 401;
    throw error;
  }

  const hashedPassword = await bcrypt.hash(new_password, 10);
  await updateDealerPassword(dealer_id, hashedPassword);
  return { message: "Password changed successfully" };
};

const serializeProfile = (dealer) => ({
  name: dealer.full_name,
  email: dealer.email,
  mobile: dealer.mobile,
  business_name: dealer.business_name,
  address_line1: dealer.address_line1,
  city: dealer.city,
  state: dealer.state,
  pincode: dealer.pincode,
  gst_number: dealer.gst_number,
});
