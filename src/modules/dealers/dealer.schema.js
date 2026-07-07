import { DEALER_STATUS } from "../../common/constants/status.constants.js";

export const dealerSchema = {
  table: "dealers",
  columns: {
    id: { type: "UUID", primaryKey: true, default: "gen_random_uuid()" },
    full_name: { type: "VARCHAR(255)", required: true },
    mobile: { type: "VARCHAR(15)", required: true, unique: true },
    email: { type: "VARCHAR(255)", unique: true },
    password: { type: "VARCHAR(255)", required: true },
    business_name: { type: "VARCHAR(255)" },
    business_address: { type: "TEXT" },
    gst_number: { type: "VARCHAR(20)" },
    status: {
      type: "VARCHAR(20)",
      default: DEALER_STATUS.PENDING,
      enum: Object.values(DEALER_STATUS),
    },
    rejection_reason: { type: "TEXT" },
    created_at: { type: "TIMESTAMPTZ", default: "NOW()" },
    updated_at: { type: "TIMESTAMPTZ", default: "NOW()" },
  },
};

export const otpSchema = {
  table: "otps",
  columns: {
    id: { type: "UUID", primaryKey: true, default: "gen_random_uuid()" },
    email: { type: "VARCHAR(255)", required: true, unique: true },
    otp: { type: "VARCHAR(6)", required: true },
    purpose: { type: "VARCHAR(50)", default: "REGISTRATION" },
    expires_at: { type: "TIMESTAMPTZ", required: true },
    verified: { type: "BOOLEAN", default: false },
    created_at: { type: "TIMESTAMPTZ", default: "NOW()" },
  },
};

export const registerDealerSchema = {
  full_name: { type: "string", required: true },
  email: { type: "string", required: false },
  business_name: { type: "string", required: false },
  business_address: { type: "string", required: false },
  gst_number: { type: "string", required: false },
};
