import { REPAIR_STATUS } from "../../common/constants/status.constants.js";

export const repairSchema = {
  table: "repairs",
  columns: {
    id: {
      type: "UUID",
      primaryKey: true,
      default: "gen_random_uuid()",
    },
    rma_id: {
      type: "UUID",
      required: true,
      unique: true,
      references: "rmas(id)",
    },
    technician_name: { type: "VARCHAR(255)" },
    status: {
      type: "VARCHAR(20)",
      default: REPAIR_STATUS.PENDING,
      enum: Object.values(REPAIR_STATUS),
    },
    diagnosis: { type: "TEXT" },
    parts_used: { type: "TEXT" },
    repair_notes: { type: "TEXT" },
    started_at: { type: "TIMESTAMPTZ" },
    completed_at: { type: "TIMESTAMPTZ" },
    created_at: { type: "TIMESTAMPTZ", default: "NOW()" },
    updated_at: { type: "TIMESTAMPTZ", default: "NOW()" },
  },
};

//////////////////////////////////////// Just for request validation (not a real schema)
export const startRepairSchema = {
  technician_name: { type: "string", required: false },
};

export const updateRepairSchema = {
  technician_name: { type: "string", required: false },
  diagnosis: { type: "string", required: false },
  parts_used: { type: "string", required: false },
  repair_notes: { type: "string", required: false },
};

export const completeRepairSchema = {
  repair_notes: { type: "string", required: false },
};
