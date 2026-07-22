import { SHIPMENT_STATUS, SHIPMENT_DIRECTION, RMA_STATUS } from "../../common/constants/status.constants.js";
import { createPickupRequest } from "./pickup.repository.js";
import {
  createShipmentForPickup,
  getInboundShipmentByRmaId,
  getShipmentById,
  getShipmentByAwb,
  updateShipment,
  setShipmentShiprocketInfo,
  setShipmentPickupError,
} from "./shipment.repository.js";
import { getRmaById } from "../rmas/rma.repository.js";
import { getDealerById } from "../dealers/dealer.repository.js";
import {
  resolvePickupAddress,
  resolveShiprocketPickupLocation,
} from "./shipment-address.helper.js";
import {
  createOrder as createShiprocketOrder,
  assignAwb,
  cancelOrder as cancelShiprocketOrder,
} from "../../common/services/shiprocket.service.js";
import { updateShipmentStatus } from "./shipment.service.js";
import logger from "../../config/logger.js";
import pool from "../../config/db.js";

// A) requestPickupForRmas(rma_ids)
// → admin selects one or more APPROVED RMAs (same dealer) and requests a
//   courier pickup for all of them at once
export const requestPickupForRmas = async (rma_ids) => {
  if (!Array.isArray(rma_ids) || rma_ids.length === 0) {
    const error = new Error("rma_ids must be non empty array");
    error.statusCode = 400;
    throw error;
  }

  const rmas = await Promise.all(rma_ids.map((id) => getRmaById(id)));

  const missingIndex = rmas.findIndex((rma) => !rma);
  if (missingIndex !== -1) {
    const error = new Error(`RMA not found: ${rma_ids[missingIndex]}`);
    error.statusCode = 404;
    throw error;
  }

  const dealerIds = new Set(rmas.map((rma) => rma.dealer_id));
  if (dealerIds.size > 1) {
    const error = new Error("All selected RMAs must belong to the same dealer");
    error.statusCode = 400;
    throw error;
  }

  const notApproved = rmas.find((rma) => rma.status !== RMA_STATUS.APPROVED);
  if (notApproved) {
    const error = new Error(
      `RMA ${notApproved.rma_number} is not approved (status: ${notApproved.status})`,
    );
    error.statusCode = 400;
    throw error;
  }

  const existingShipments = await Promise.all(
    rma_ids.map((id) => getInboundShipmentByRmaId(id)),
  );
  const alreadyRequestedIndex = existingShipments.findIndex(Boolean);
  if (alreadyRequestedIndex !== -1) {
    const error = new Error(
      `RMA ${rmas[alreadyRequestedIndex].rma_number} already has a pickup requested`,
    );
    error.statusCode = 409;
    throw error;
  }

  const dealer_id = rmas[0].dealer_id;
  const client = await pool.connect();
  let pickupRequest;
  let shipments;
  try {
    await client.query("BEGIN");
    pickupRequest = await createPickupRequest(dealer_id, client);

    // shipments, paired with the RMA each one belongs to (each RMA may have its own pickup address)
    shipments = [];
    for (const rma of rmas) {
      const shipment = await createShipmentForPickup(rma.id, pickupRequest.id, client);
      shipments.push({ shipment, rma });
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    if (error.code === "23505") {
      const conflict = new Error(
        "One or more selected RMAs already have a pickup requested",
      );
      conflict.statusCode = 409;
      throw conflict;
    }
    throw error;
  } finally {
    client.release();
  }

  // Shiprocket registration/order-creation happens after commit — it's an
  // external network call and best-effort: the pickup request and shipment
  // rows are already durably created, so a Shiprocket failure here must not
  // roll back or fail the admin's pickup request.
  await createInboundOrdersForBatch(pickupRequest, shipments);

  return { pickupRequest, shipments: shipments.map((s) => s.shipment) };
};

// B) retryPickupForShipment(shipment_id)
// → admin retries Shiprocket registration for an inbound shipment that was
//   already created (via requestPickupForRmas) but never got scheduled —
//   e.g. Shiprocket was down, credentials were wrong, or the pincode was
//   invalid the first time. Does not create any new DB rows; re-runs the
//   same Shiprocket calls against the existing shipment. Throws on failure
//   (unlike the best-effort batch path) so the admin sees the real reason.
export const retryPickupForShipment = async (shipment_id) => {
  const shipment = await getShipmentById(shipment_id);
  if (!shipment) {
    const error = new Error("Shipment not found");
    error.statusCode = 404;
    throw error;
  }
  if (shipment.direction !== SHIPMENT_DIRECTION.INBOUND) {
    const error = new Error("Only inbound (pickup) shipments can be retried");
    error.statusCode = 400;
    throw error;
  }
  if (shipment.awb_code) {
    const error = new Error("This shipment already has an AWB assigned");
    error.statusCode = 409;
    throw error;
  }

  const rma = await getRmaById(shipment.rma_id);
  if (!rma) {
    const error = new Error("RMA not found");
    error.statusCode = 404;
    throw error;
  }

  // If the Shiprocket order already exists (previous attempt got that far but
  // failed on courier assignment), just retry the AWB step instead of
  // re-registering the pickup location and re-creating the order.
  if (shipment.shiprocket_shipment_id) {
    await retryAwbAssignment(shipment);
  } else {
    try {
      await createInboundOrder(rma, shipment);
    } catch (error) {
      const message =
        error.response?.data?.message || error.message || "Shiprocket request failed";
      await setShipmentPickupError(shipment.id, message).catch(() => {});
      throw error;
    }
  }

  return getShipmentById(shipment_id);
};

// Statuses at which a pickup can still be called off. Once the courier has
// actually scanned the package (PICKED_UP or later) it's physically in
// transit — cancelling our record wouldn't stop the courier, so that's not
// allowed here.
const CANCELLABLE_STATUSES = [SHIPMENT_STATUS.NOT_SHIPPED, SHIPMENT_STATUS.SCHEDULED];

// C) cancelPickupForShipment(shipment_id)
// → admin calls off a pickup that was requested by mistake or is no longer
//   needed. Cancels the Shiprocket order (if one was ever created) and marks
//   the shipment CANCELLED; the RMA itself is untouched, and a cancelled
//   shipment no longer blocks requesting a fresh pickup for the same RMA
//   (see the partial unique index on rma_shipments).
export const cancelPickupForShipment = async (shipment_id) => {
  const shipment = await getShipmentById(shipment_id);
  if (!shipment) {
    const error = new Error("Shipment not found");
    error.statusCode = 404;
    throw error;
  }
  if (shipment.direction !== SHIPMENT_DIRECTION.INBOUND) {
    const error = new Error("Only inbound (pickup) shipments can be cancelled");
    error.statusCode = 400;
    throw error;
  }
  if (!CANCELLABLE_STATUSES.includes(shipment.status)) {
    const error = new Error(
      `Cannot cancel — shipment status is already ${shipment.status}`,
    );
    error.statusCode = 409;
    throw error;
  }

  if (shipment.shiprocket_order_id) {
    try {
      await cancelShiprocketOrder(shipment.shiprocket_order_id);
    } catch (error) {
      const message =
        error.response?.data?.message || error.message || "Shiprocket cancel request failed";
      const wrapped = new Error(`Failed to cancel Shiprocket order: ${message}`);
      wrapped.statusCode = 502;
      throw wrapped;
    }
  }

  await updateShipment(shipment_id, { status: SHIPMENT_STATUS.CANCELLED });
  await setShipmentPickupError(shipment_id, null);

  return getShipmentById(shipment_id);
};

// Helper: registers this RMA's own pickup address as a Shiprocket pickup
// location, creates its inbound Shiprocket order, and marks the shipment
// SCHEDULED only once it has a real AWB — a courier order with no AWB isn't
// actually scheduled, so it's left retryable (status stays NOT_SHIPPED,
// which is what needs_pickup_retry keys off of). Throws on failure — callers
// decide whether to swallow (best-effort batch) or surface (explicit retry).
const createInboundOrder = async (rma, shipment) => {
  const dealer = await getDealerById(rma.dealer_id);
  const address = resolvePickupAddress(dealer, rma);
  const pickupLocation = await resolveShiprocketPickupLocation(dealer, rma, address);

  const order = await createShiprocketOrder({
    pickup_location: pickupLocation,
    order_id: shipment.id,
    customer: address,
  });
  await setShipmentShiprocketInfo(shipment.id, {
    shiprocket_shipment_id: order.shipment_id,
    shiprocket_order_id: order.order_id,
    awb_code: order.awb_code,
  });

  if (order.awb_code) {
    await markShipmentScheduled(shipment.id);
  } else {
    logger.warn(
      `Shiprocket order created for RMA ${rma.rma_number} but no AWB was assigned — leaving shipment retryable`,
    );
    await setShipmentPickupError(shipment.id, order.error || "Shiprocket did not assign a courier/AWB");
  }
};

// Helper: retries just the AWB-assignment step against an already-created
// Shiprocket order (used when the order exists but no courier was assigned).
const retryAwbAssignment = async (shipment) => {
  const { awb_code, error: awbError } = await assignAwb(shipment.shiprocket_shipment_id);
  if (awb_code) {
    await setShipmentShiprocketInfo(shipment.id, { awb_code });
    await markShipmentScheduled(shipment.id);
  } else {
    await setShipmentPickupError(shipment.id, awbError || "Shiprocket did not assign a courier/AWB");
  }
};

const markShipmentScheduled = async (shipment_id) => {
  await updateShipment(shipment_id, { status: SHIPMENT_STATUS.SCHEDULED });
  await setShipmentPickupError(shipment_id, null);
};

// For each { shipment, rma } pair — independently. Each RMA's outcome is
// independent: one succeeding or failing has no effect on the others.
// Best-effort — logs and swallows errors per-shipment so one Shiprocket
// failure doesn't block the rest of the batch or the admin's pickup request.
const createInboundOrdersForBatch = async (pickupRequest, shipments) => {
  for (const { shipment, rma } of shipments) {
    try {
      await createInboundOrder(rma, shipment);
    } catch (error) {
      logger.error(
        `Shiprocket inbound order creation failed for RMA ${rma.rma_number} (pickup request ${pickupRequest.id}): ${error.message}`,
      );
      const message =
        error.response?.data?.message || error.message || "Shiprocket request failed";
      await setShipmentPickupError(shipment.id, message).catch(() => {});
    }
  }
};

// Maps Shiprocket's "current_status" webhook field to our own SHIPMENT_STATUS
// enum. Statuses Shiprocket sends that we don't track (e.g. "Cancelled",
// "RTO") resolve to null, and the webhook handler ignores those events.
const SHIPROCKET_STATUS_MAP = {
  "PICKUP SCHEDULED": SHIPMENT_STATUS.SCHEDULED,
  "PICKED UP": SHIPMENT_STATUS.PICKED_UP,
  "IN TRANSIT": SHIPMENT_STATUS.IN_TRANSIT,
  "OUT FOR DELIVERY": SHIPMENT_STATUS.OUT_FOR_DELIVERY,
  DELIVERED: SHIPMENT_STATUS.DELIVERED,
  "UNDELIVERED": SHIPMENT_STATUS.FAILED_DELIVERY,
  "DELIVERY FAILED": SHIPMENT_STATUS.FAILED_DELIVERY,
};

// C) handleShiprocketTrackingWebhook(payload)
// → called by the webhook route whenever Shiprocket pushes a courier status
//   update. Looks the shipment up by AWB (Shiprocket doesn't know our
//   internal shipment id) and, if the status maps to one we track, applies
//   it via the same updateShipmentStatus used for manual admin edits — so
//   shipped_at/delivered_at stamping and the dealer notification happen
//   exactly the same way regardless of who/what triggered the change.
export const handleShiprocketTrackingWebhook = async (payload) => {
  const awb_code = payload?.awb || payload?.awb_code;
  const shiprocketStatus = (payload?.current_status || "").trim().toUpperCase();

  if (!awb_code) {
    logger.warn(`Shiprocket webhook received with no AWB: ${JSON.stringify(payload)}`);
    return { handled: false, reason: "missing_awb" };
  }

  const mappedStatus = SHIPROCKET_STATUS_MAP[shiprocketStatus];
  if (!mappedStatus) {
    logger.info(`Shiprocket webhook for AWB ${awb_code}: unmapped status "${payload?.current_status}" — ignored`);
    return { handled: false, reason: "unmapped_status" };
  }

  const shipment = await getShipmentByAwb(awb_code);
  if (!shipment) {
    logger.warn(`Shiprocket webhook for unknown AWB ${awb_code} — no matching shipment`);
    return { handled: false, reason: "shipment_not_found" };
  }

  try {
    await updateShipmentStatus(shipment.id, { status: mappedStatus });
  } catch (error) {
    if (error.statusCode === 409) {
      // Out-of-order or duplicate courier update (e.g. a stale webhook
      // replay) — not an error on Shiprocket's end, just ignore it.
      logger.info(
        `Shiprocket webhook for shipment ${shipment.id}: ignored invalid transition to ${mappedStatus} (current status ${shipment.status})`,
      );
      return { handled: false, reason: "invalid_transition" };
    }
    throw error;
  }
  return { handled: true, shipment_id: shipment.id, status: mappedStatus };
};