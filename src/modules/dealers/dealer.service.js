import { getDealerByMobile, createOtp, getValidOtp } from "./dealer.model.js";
import logger from "../../config/logger.js";

////////////////////////////////////////// A) requestOtp(mobile)
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
  return { message: "OTP sent" };
};

///////////////////////////////////////// B) verifyOtp(mobile, otp)
const verifyOtp = async (mobile, otp) => {
  // 1. Call getValidOtp(mobile, otp) → throw error if not found

  const otpRecord = await getValidOtp(mobile, otp);
  if (!otpRecord) {
    throw new Error("INVALID OTP");
    return;
  }
  // 2. Call markOtpVerified(otpRecord.id)
  await markOtpVerified(otpRecord.id);

  // 3. Sign a JWT: { mobile, purpose: 'REGISTRATION' }, expires in 15 minutes
  const token = jwt.sign(
    { mobile: mobile, purpose: "REGISTRATION" },
    process.ENV.SECRET_KEY,
    { expiresIn: "15m" },
  );
  // 4. Return { token }
  return { token };
};

// registerDealer(token, data)
// 1. Verify JWT token → extract mobile
// 2. Check dealer doesn't already exist with getDealerByMobile → throw if exists
// 3. Call createDealer({ ...data, mobile })
// 4. Return the new dealer

// getDealers(status)
// → call getAllDealers(status), return result

// getDealerById(id)
// → call getDealerById(id), throw error if not found, return dealer

// approveDealer(id)
// → call updateDealerStatus(id, 'ACTIVE', null), return updated dealer

// rejectDealer(id, reason)
// → call updateDealerStatus(id, 'REJECTED', reason), return updated dealer
