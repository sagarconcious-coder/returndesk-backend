import { randomInt } from "crypto";

export const generateOtp = () => {
  return randomInt(100000, 1000000).toString();
};

export const getOtpExpiry = (minutes = 10) => {
  return new Date(Date.now() + minutes * 60 * 1000);
};
