import {
  SHIPMENT_STATUS,
  SHIPMENT_DIRECTION,
  REPAIR_STATUS,
} from "../../common/constants/status.constants.js";
import * as shipmentRepo from "./shipment.repository.js";
import { getRmaByIdOrNumber, getRmaById } from "../rmas/rma.repository.js";
import { resolveReturnAddress } from "./shipment-address.helper.js";
import { resolveWarehousePickupLocation } from "./warehouse-address.helper.js";
import {
  getRepairByRmaId,
  createRepair,
} from "../repairs/repair.repository.js";
import { getDealerById } from "../dealers/dealer.repository.js";
import { notifyShipmentUpdated } from "../notifications/notification.service.js";
import { serializeShipment } from "../rmas/rma.serializer.js";
import {
  createOrder as createShiprocketOrder,
  assignAwb,
} from "../../common/services/shiprocket.service.js";
import logger from "../../config/logger.js";

// A) getAllShipments(status, direction) — admin list view
export const getAllShipments = async (status, direction) => {
  const shipments = await shipmentRepo.getAllShipments(status, direction);
  return shipments.map((s) => ({
    ...serializeShipment(s, s.rma_number),
    dealer: s.business_name,
  }));
};

// B) createShipment(rma_id, direction, returnAddress)
// → admin creates an inbound/outbound shipment record for an RMA
// → an OUTBOUND shipment (item going back to the dealer) requires the repair
//   to be finished first — either COMPLETED (fixed) or UNREPAIRABLE (still
//   goes back to the dealer, just unfixed)
// → returnAddress (OUTBOUND only): { return_address_same_as_pickup, return_address_line1/city/state/pincode }
//   — admin's choice of where to ship the repaired item back to; defaults to the original pickup address
export const createShipment = async (rma_id, direction, returnAddress = {}) => {
  const rma = await getRmaByIdOrNumber(rma_id);
  if (!rma) {
    const error = new Error("RMA not found");
    error.statusCode = 404;
    throw error;
  }

  if (direction === SHIPMENT_DIRECTION.OUTBOUND) {
    const repair = await getRepairByRmaId(rma.id);
    const finished =
      repair?.status === REPAIR_STATUS.COMPLETED ||
      repair?.status === REPAIR_STATUS.UNREPAIRABLE;
    if (!finished) {
      const error = new Error(
        "Cannot create outbound shipment — repair is not completed",
      );
      error.statusCode = 403;
      throw error;
    }
  }

  const existingShipment = await shipmentRepo.getActiveShipmentByRmaId(
    rma.id,
    direction,
  );
  if (existingShipment) {
    const error = new Error(
      `RMA already has an active ${direction.toLowerCase()} shipment`,
    );
    error.statusCode = 409;
    throw error;
  }

  let shipment;
  try {
    shipment = await shipmentRepo.createShipment(rma.id, direction, returnAddress);
  } catch (error) {
    if (error.code === "23505") {
      const conflict = new Error(
        `RMA already has an active ${direction.toLowerCase()} shipment`,
      );
      conflict.statusCode = 409;
      throw conflict;
    }
    throw error;
  }

  if (direction === SHIPMENT_DIRECTION.OUTBOUND) {
    // Awaited (unlike the inbound batch path) — Ship Back is a single admin
    // action, not a batch, so the admin should see the real Shiprocket
    // outcome (AWB assigned, or a pickup_error to retry) in the response
    // rather than a "created" message that says nothing about whether it
    // actually shipped. The shipment row itself is never rolled back on
    // failure — only the Shiprocket registration step can fail/retry.
    try {
      await createOutboundOrder(rma, shipment);
    } catch (error) {
      const message =
        error.response?.data?.message || error.message || "Shiprocket request failed";
      logger.error(
        `Shiprocket outbound order creation failed for shipment ${shipment.id}: ${message}`,
      );
      await shipmentRepo.setShipmentPickupError(shipment.id, message).catch(() => {});
    }
    return shipmentRepo.getShipmentById(shipment.id);
  }

  return shipment;
};

// Helper: creates the outbound (warehouse -> dealer) Shiprocket order and
// persists the resulting IDs. Pickup is always our fixed warehouse location;
// delivery goes to the shipment's chosen return address (same as pickup, or
// the admin-entered override — see resolveReturnAddress). Leaves the
// shipment retryable (no pickup_error thrown here — the caller decides
// whether to swallow it, same split as pickup.service.js's inbound path).
const createOutboundOrder = async (rma, shipment) => {
  const dealer = await getDealerById(rma.dealer_id);
  const address = resolveReturnAddress(dealer, rma, shipment);
  const pickupLocation = await resolveWarehousePickupLocation();
  const order = await createShiprocketOrder({
    pickup_location: pickupLocation,
    order_id: shipment.id,
    customer: address,
  });
  await shipmentRepo.setShipmentShiprocketInfo(shipment.id, {
    shiprocket_shipment_id: order.shipment_id,
    shiprocket_order_id: order.order_id,
    awb_code: order.awb_code,
  });

  if (order.awb_code) {
    await shipmentRepo.setShipmentPickupError(shipment.id, null);
  } else {
    logger.warn(
      `Shiprocket outbound order created for RMA ${rma.rma_number} but no AWB was assigned — leaving shipment retryable`,
    );
    await shipmentRepo.setShipmentPickupError(
      shipment.id,
      order.error || "Shiprocket did not assign a courier/AWB",
    );
  }
};

// H) retryOutboundShipment(shipment_id)
// → admin retries Shiprocket registration for an outbound shipment that
//   failed or never got an AWB assigned. Mirrors pickup.service.js's
//   retryPickupForShipment for the inbound leg. Throws on failure (unlike
//   the best-effort creation path) so the admin sees the real reason.
export const retryOutboundShipment = async (shipment_id) => {
  const shipment = await shipmentRepo.getShipmentById(shipment_id);
  if (!shipment) {
    const error = new Error("Shipment not found");
    error.statusCode = 404;
    throw error;
  }
  if (shipment.direction !== SHIPMENT_DIRECTION.OUTBOUND) {
    const error = new Error("Only outbound (return) shipments can be retried");
    error.statusCode = 400;
    throw error;
  }
  if (shipment.awb_code) {
    const error = new Error("This shipment already has an AWB assigned");
    error.statusCode = 409;
    throw error;
  }

  const rma = await getRmaByIdOrNumber(shipment.rma_id);
  if (!rma) {
    const error = new Error("RMA not found");
    error.statusCode = 404;
    throw error;
  }

  // If the Shiprocket order already exists (previous attempt got that far
  // but failed on courier assignment), just retry the AWB step instead of
  // re-creating the order.
  if (shipment.shiprocket_shipment_id) {
    const { awb_code, error: awbError } = await assignAwb(shipment.shiprocket_shipment_id);
    if (awb_code) {
      await shipmentRepo.setShipmentShiprocketInfo(shipment.id, { awb_code });
      await shipmentRepo.setShipmentPickupError(shipment.id, null);
    } else {
      await shipmentRepo.setShipmentPickupError(
        shipment.id,
        awbError || "Shiprocket did not assign a courier/AWB",
      );
    }
  } else {
    try {
      await createOutboundOrder(rma, shipment);
    } catch (error) {
      const message =
        error.response?.data?.message || error.message || "Shiprocket request failed";
      await shipmentRepo.setShipmentPickupError(shipment.id, message).catch(() => {});
      throw error;
    }
  }

  return shipmentRepo.getShipmentById(shipment_id);
};

// C) getShipmentsByRmaId(rma_id)
// → returns all shipments (inbound + outbound) tracked for an RMA
export const getShipmentsByRmaId = async (rma_id) => {
  return shipmentRepo.getShipmentsByRmaId(rma_id);
};

// C2) getShipmentsByRmaIdWithHistory(rma_id)
// → same as above, but each shipment also carries its full status_history
//   timeline (for the RMA detail page's Status History tab)
export const getShipmentsByRmaIdWithHistory = async (rma_id) => {
  const shipments = await shipmentRepo.getShipmentsByRmaId(rma_id);
  return Promise.all(
    shipments.map(async (shipment) => ({
      ...shipment,
      status_history: await shipmentRepo.getShipmentStatusHistory(shipment.id),
    })),
  );
};

// Allowed forward transitions for a shipment's status. DELIVERED,
// FAILED_DELIVERY, and CANCELLED are terminal — FAILED_DELIVERY can retry
// back out to OUT_FOR_DELIVERY, but nothing leaves DELIVERED/CANCELLED.
// CANCELLED is only reachable from the two pre-pickup states, matching
// pickup.service.js's CANCELLABLE_STATUSES.
const SHIPMENT_TRANSITIONS = {
  [SHIPMENT_STATUS.NOT_SHIPPED]: [
    SHIPMENT_STATUS.SCHEDULED,
    SHIPMENT_STATUS.CANCELLED,
  ],
  [SHIPMENT_STATUS.SCHEDULED]: [
    SHIPMENT_STATUS.PICKED_UP,
    SHIPMENT_STATUS.CANCELLED,
  ],
  [SHIPMENT_STATUS.PICKED_UP]: [SHIPMENT_STATUS.IN_TRANSIT],
  [SHIPMENT_STATUS.IN_TRANSIT]: [
    SHIPMENT_STATUS.OUT_FOR_DELIVERY,
    SHIPMENT_STATUS.FAILED_DELIVERY,
  ],
  [SHIPMENT_STATUS.OUT_FOR_DELIVERY]: [
    SHIPMENT_STATUS.DELIVERED,
    SHIPMENT_STATUS.FAILED_DELIVERY,
  ],
  [SHIPMENT_STATUS.FAILED_DELIVERY]: [SHIPMENT_STATUS.OUT_FOR_DELIVERY],
  [SHIPMENT_STATUS.DELIVERED]: [],
  [SHIPMENT_STATUS.CANCELLED]: [],
};

// D) updateShipmentStatus(id, fields)
// → admin updates carrier/tracking/status; auto-stamps shipped_at/delivered_at
//   on the relevant transitions, then notifies the owning dealer
export const updateShipmentStatus = async (id, fields) => {
  ////////// Check if the shipment even exists or not
  const existing = await shipmentRepo.getShipmentById(id);
  if (!existing) {
    const error = new Error("Shipment not found");
    error.statusCode = 404;
    throw error;
  }

  if (fields.status && fields.status !== existing.status) {
    const allowed = SHIPMENT_TRANSITIONS[existing.status] || [];
    if (!allowed.includes(fields.status)) {
      const error = new Error(
        `Cannot change shipment status from ${existing.status} to ${fields.status}`,
      );
      error.statusCode = 409;
      throw error;
    }
  }

  const patch = { ...fields };
  if (fields.status === SHIPMENT_STATUS.PICKED_UP && !existing.shipped_at) {
    patch.shipped_at = new Date();
  }
  if (fields.status === SHIPMENT_STATUS.DELIVERED && !existing.delivered_at) {
    patch.delivered_at = new Date();
  }

  const shipment = await shipmentRepo.updateShipment(id, patch);
  if (fields.status && fields.status !== existing.status) {
    await shipmentRepo.insertShipmentStatusHistory(id, fields.status);
  }

  // Item has physically arrived at aeidth from the dealer — kick off the
  // repair record (PENDING) so it shows up for an admin to pick up and start.
  if (
    existing.direction === SHIPMENT_DIRECTION.INBOUND &&
    fields.status === SHIPMENT_STATUS.DELIVERED
  ) {
    const repair = await getRepairByRmaId(shipment.rma_id);
    if (!repair) {
      await createRepair(shipment.rma_id);
    }
  }

  const rma = await getRmaById(shipment.rma_id);
  await notifyShipmentUpdated(rma, shipment);
  return shipment;
};

const MILESTONE_ORDER = [
  { status: SHIPMENT_STATUS.PICKED_UP, label: "Picked Up" },
  { status: SHIPMENT_STATUS.IN_TRANSIT, label: "In Transit" },
  { status: SHIPMENT_STATUS.OUT_FOR_DELIVERY, label: "Out for Delivery" },
  { status: SHIPMENT_STATUS.DELIVERED, label: "Delivered" },
];

const buildMilestones = (shipment) => {
  const reachedIndex = MILESTONE_ORDER.findIndex(
    (m) => m.status === shipment.status,
  );
  return [
    { label: "Pickup Scheduled", date: null, done: true },
    ...MILESTONE_ORDER.map((m, i) => ({
      label: m.label,
      date:
        m.status === SHIPMENT_STATUS.DELIVERED
          ? shipment.delivered_at
          : shipment.shipped_at,
      done: reachedIndex >= 0 && i <= reachedIndex,
    })),
  ];
};

// E) getMyShipments(dealer_id)
// → all shipments across every RMA belonging to the dealer, for the shipments list page
export const getMyShipments = async (dealer_id) => {
  const shipments = await shipmentRepo.getShipmentsByDealerId(dealer_id);
  return shipments.map((s) => serializeShipment(s, s.rma_number));
};

// F) trackShipmentByNumber(dealer_id, tracking_number)
// → dealer looks up one of their own shipments by tracking number, with a milestone timeline
export const trackShipmentByNumber = async (dealer_id, tracking_number) => {
  const shipment = await shipmentRepo.getShipmentByTrackingNumber(
    dealer_id,
    tracking_number,
  );
  if (!shipment) {
    const error = new Error("Shipment not found");
    error.statusCode = 404;
    throw error;
  }
  return {
    ...serializeShipment(shipment, shipment.rma_number),
    milestones: buildMilestones(shipment),
  };
};
