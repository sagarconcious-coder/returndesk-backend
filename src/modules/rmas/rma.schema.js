import { RMA_STATUS } from "../../common/constants/status.constants.js";

export const WARRANTY_STATUS = {
  UNDER_WARRANTY: "Under Warranty",
  OUT_OF_WARRANTY: "Out of Warranty",
};

export const rmaSchema = {
  table: "rmas",
  columns: {
    id: {
      type: "UUID",
      primaryKey: true,
      default: "gen_random_uuid()",
    },
    rma_number: {
      type: "VARCHAR(50)",
      required: true,
      unique: true,
      default: `
        'RMA-' ||
        EXTRACT(YEAR FROM CURRENT_DATE)::text ||
        '-' ||
        LPAD(nextval('rma_number_seq')::text, 6, '0')
      `,
    },
    dealer_id: {
      type: "UUID",
      required: true,
      references: "dealers(id)",
    },
    product_serial: { type: "VARCHAR(100)", required: true },
    product_name: { type: "VARCHAR(255)", required: true },
    issue_type: { type: "VARCHAR(50)" },
    issue_description: { type: "TEXT", required: true },
    purchase_date: { type: "DATE" },
    warranty_status: {
      type: "VARCHAR(20)",
      enum: Object.values(WARRANTY_STATUS),
    },
    warranty_expiry: { type: "DATE" },
    status: {
      type: "VARCHAR(30)",
      default: RMA_STATUS.PENDING,
      enum: Object.values(RMA_STATUS),
    },
    rejection_reason: { type: "TEXT" },
    pickup_same_as_profile: { type: "BOOLEAN", default: true },
    pickup_address_line1: { type: "VARCHAR(255)" },
    pickup_city: { type: "VARCHAR(100)" },
    pickup_state: { type: "VARCHAR(100)" },
    pickup_pincode: { type: "VARCHAR(10)" },
    created_at: { type: "TIMESTAMPTZ", default: "NOW()" },
    updated_at: { type: "TIMESTAMPTZ", default: "NOW()" },
  },
};

export const rmaAttachmentSchema = {
  table: "rma_attachments",
  columns: {
    id: { type: "UUID", primaryKey: true, default: "gen_random_uuid()" },
    rma_id: { type: "UUID", required: true, references: "rmas(id)" },
    file_name: { type: "VARCHAR(255)", required: true },
    file_url: { type: "TEXT" },
    kind: { type: "VARCHAR(20)", default: "file", enum: ["file", "audio"] },
    created_at: { type: "TIMESTAMPTZ", default: "NOW()" },
  },
};

//////////////////////////////////////// Just for request validation (not a real schema)
export const createRmaSchema = {
  dealer_id: { type: "string", required: true },
  product_serial: { type: "string", required: true },
  product_name: { type: "string", required: true },
  issue_type: { type: "string", required: false },
  issue_description: { type: "string", required: true },
  purchase_date: { type: "string", required: false },
  warranty_status: {
    type: "string",
    required: false,
    enum: Object.values(WARRANTY_STATUS),
  },
  warranty_expiry: { type: "string", required: false },
  attachments: { type: "array", required: false },
  pickup_same_as_profile: { type: "boolean", required: false },
  pickup_address_line1: { type: "string", required: false },
  pickup_city: { type: "string", required: false },
  pickup_state: { type: "string", required: false },
  pickup_pincode: { type: "string", required: false },
};
