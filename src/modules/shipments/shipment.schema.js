import {
  SHIPMENT_DIRECTION,
  SHIPMENT_STATUS,
} from "../../common/constants/status.constants.js";

export const shipmentSchema = {
  table: "rma_shipments",
  columns: {
    id: { type: "UUID", primaryKey: true, default: "gen_random_uuid()" },
    rma_id: { type: "UUID", required: true, references: "rmas(id)" },
    direction: {
      type: "VARCHAR(20)",
      required: true,
      enum: Object.values(SHIPMENT_DIRECTION),
    },
    carrier: { type: "VARCHAR(100)" },
    tracking_number: { type: "VARCHAR(100)" },
    status: {
      type: "VARCHAR(20)",
      default: SHIPMENT_STATUS.NOT_SHIPPED,
      enum: Object.values(SHIPMENT_STATUS),
    },
    shipped_at: { type: "TIMESTAMPTZ" },
    delivered_at: { type: "TIMESTAMPTZ" },
    shiprocket_shipment_id: { type: "VARCHAR(50)" },
    awb_code: { type: "VARCHAR(50)" },
    pickup_error: { type: "TEXT" },
    pickup_request_id: { type: "UUID", references: "pickup_requests(id)" },
    created_at: { type: "TIMESTAMPTZ", default: "NOW()" },
    updated_at: { type: "TIMESTAMPTZ", default: "NOW()" },
  },
};

//////////////////////////////////////// Just for request validation (not a real schema)
export const createShipmentSchema = {
  direction: {
    type: "string",
    required: true,
    enum: Object.values(SHIPMENT_DIRECTION),
  },
};

export const updateShipmentSchema = {
  carrier: { type: "string", required: false },
  tracking_number: { type: "string", required: false },
  status: {
    type: "string",
    required: false,
    enum: Object.values(SHIPMENT_STATUS),
  },
};
