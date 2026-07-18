import {
  SHIPMENT_STATUS,
  SHIPMENT_DIRECTION,
  REPAIR_STATUS,
  RMA_STATUS,
} from "../../common/constants/status.constants.js";
import { createPickupRequest as createPickupRequestInRepo } from "./pickup.repository.js";
import {
  createShipment as createShipmentInRepo,
  createShipmentForPickup as createShipmentForPickupInRepo,
  getAllShipments as getAllShipmentsFromRepo,
  getShipmentsByRmaId as getShipmentsByRmaIdFromRepo,
  getShipmentsByDealerId as getShipmentsByDealerIdFromRepo,
  getShipmentByTrackingNumber as getShipmentByTrackingNumberFromRepo,
  getShipmentById as getShipmentByIdFromRepo,
  getInboundShipmentByRmaId as getInboundShipmentByRmaIdFromRepo,
  updateShipment as updateShipmentInRepo,
  setShipmentShiprocketInfo as setShipmentShiprocketInfoInRepo,
  setShipmentPickupError as setShipmentPickupErrorInRepo,
} from "./shipment.repository.js";
import { getRmaById, getRmaByIdOrNumber } from "../rmas/rma.repository.js";
import { resolvePickupAddress } from "../rmas/rma.service.js";
import { getRepairByRmaId } from "../repairs/repair.repository.js";
import {
  getDealerById,
  updateDealerShiprocketPickupLocation,
} from "../dealers/dealer.repository.js";
import { notifyShipmentUpdated } from "../notifications/notification.service.js";
import { serializeShipment } from "../rmas/rma.serializer.js";
import {
  registerPickupLocation,
  createOrder as createShiprocketOrder,
  assignAwb,
} from "../../common/services/shiprocket.service.js";
import logger from "../../config/logger.js";
import pool from "../../config/db.js";
////////////////////////////////// 0) CREATE SHIPMENT FOR PICKUP

export const createShipmentForPickup = async (rma_id, pickup_request_id) => {
  return createShipmentForPickupInRepo(rma_id, pickup_request_id);
};

//////////////////////////////////// Request pickup for rmas

export const requestPickupForRmas = async (rma_ids) => {
  ////// If rmas array is empty(admin didn't select any rma)
  if (!Array.isArray(rma_ids) || rma_ids.length === 0) {
    const error = new Error("rma_ids must be non empty array");
    error.statusCode = 400;
    throw error;
  }
  /////// Check if all Rmas exists in the database
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
    rma_ids.map((id) => getInboundShipmentByRmaIdFromRepo(id)),
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
  try {
    await client.query("BEGIN");
    const pickupRequest = await createPickupRequestInRepo(dealer_id, client);

    // shipments, paired with the RMA each one belongs to (each RMA may have its own pickup address)
    const shipments = [];
    for (const rma of rmas) {
      const shipment = await createShipmentForPickupInRepo(
        rma.id,
        pickupRequest.id,
        client,
      );
      shipments.push({ shipment, rma });
    }

    await client.query("COMMIT");

    // Shiprocket registration/order-creation happens after commit — it's an
    // external network call and best-effort: the pickup request and shipment
    // rows are already durably created, so a Shiprocket failure here must not
    // roll back or fail the admin's pickup request.
    await registerPickupAndCreateInboundOrders(pickupRequest, shipments);

    return { pickupRequest, shipments: shipments.map((s) => s.shipment) };
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
};

// Helper: registers this RMA's own pickup address as a Shiprocket pickup
// location (reusing the dealer's cached location only when the RMA uses the
// dealer's profile address), creates its inbound Shiprocket order, and marks
// the shipment SCHEDULED only once it has a real AWB — a courier order with
// no AWB isn't actually scheduled, so it's left retryable (status stays
// NOT_SHIPPED, which is what needs_pickup_retry keys off of). Throws on
// failure — callers decide whether to swallow (best-effort batch) or
// surface (explicit retry).
const registerShiprocketInboundOrder = async (rma, shipment) => {
  const dealer = await getDealerById(rma.dealer_id);
  const address = resolvePickupAddress(dealer, rma);

  let pickupLocation =
    rma.pickup_same_as_profile ? dealer.shiprocket_pickup_location : null;
  if (!pickupLocation) {
    const registered = await registerPickupLocation(address);
    pickupLocation = registered.pickup_location;
    if (rma.pickup_same_as_profile) {
      await updateDealerShiprocketPickupLocation(dealer.id, pickupLocation);
    }
  }

  const order = await createShiprocketOrder({
    pickup_location: pickupLocation,
    order_id: shipment.id,
    customer: address,
  });
  await setShipmentShiprocketInfoInRepo(shipment.id, {
    shiprocket_shipment_id: order.shipment_id,
    awb_code: order.awb_code,
  });

  if (order.awb_code) {
    await updateShipmentInRepo(shipment.id, { status: SHIPMENT_STATUS.SCHEDULED });
    await setShipmentPickupErrorInRepo(shipment.id, null);
  } else {
    logger.warn(
      `Shiprocket order created for RMA ${rma.rma_number} but no AWB was assigned — leaving shipment retryable`,
    );
    await setShipmentPickupErrorInRepo(shipment.id, order.error || "Shiprocket did not assign a courier/AWB");
  }
};

// For each { shipment, rma } pair — independently. Each RMA's outcome is
// independent: one succeeding or failing has no effect on the others.
// Best-effort — logs and swallows errors per-shipment so one Shiprocket
// failure doesn't block the rest of the batch or the admin's pickup request.
const registerPickupAndCreateInboundOrders = async (pickupRequest, shipments) => {
  for (const { shipment, rma } of shipments) {
    try {
      await registerShiprocketInboundOrder(rma, shipment);
    } catch (error) {
      logger.error(
        `Shiprocket inbound order creation failed for RMA ${rma.rma_number} (pickup request ${pickupRequest.id}): ${error.message}`,
      );
      const message =
        error.response?.data?.message || error.message || "Shiprocket request failed";
      await setShipmentPickupErrorInRepo(shipment.id, message).catch(() => {});
    }
  }
};

// F) retryPickupForShipment(shipment_id)
// → admin retries Shiprocket registration for an inbound shipment that was
//   already created (via requestPickupForRmas) but never got scheduled —
//   e.g. Shiprocket was down, credentials were wrong, or the pincode was
//   invalid the first time. Does not create any new DB rows; re-runs the
//   same Shiprocket calls against the existing shipment. Throws on failure
//   (unlike the best-effort batch path) so the admin sees the real reason.
export const retryPickupForShipment = async (shipment_id) => {
  const shipment = await getShipmentByIdFromRepo(shipment_id);
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
    const { awb_code, error: awbError } = await assignAwb(
      shipment.shiprocket_shipment_id,
    );
    if (awb_code) {
      await setShipmentShiprocketInfoInRepo(shipment.id, { awb_code });
      await updateShipmentInRepo(shipment.id, { status: SHIPMENT_STATUS.SCHEDULED });
      await setShipmentPickupErrorInRepo(shipment.id, null);
    } else {
      await setShipmentPickupErrorInRepo(
        shipment.id,
        awbError || "Shiprocket did not assign a courier/AWB",
      );
    }
  } else {
    try {
      await registerShiprocketInboundOrder(rma, shipment);
    } catch (error) {
      const message =
        error.response?.data?.message || error.message || "Shiprocket request failed";
      await setShipmentPickupErrorInRepo(shipment.id, message).catch(() => {});
      throw error;
    }
  }

  return getShipmentByIdFromRepo(shipment_id);
};

// A0) getAllShipments(status, direction) — admin list view
export const getAllShipments = async (status, direction) => {
  const shipments = await getAllShipmentsFromRepo(status, direction);
  return shipments.map((s) => ({
    ...serializeShipment(s, s.rma_number),
    dealer: s.business_name,
  }));
};

// A) createShipment(rma_id, direction)
// → admin creates an inbound/outbound shipment record for an RMA
// → an OUTBOUND shipment (item going back to the dealer) requires the repair to be COMPLETED first
export const createShipment = async (rma_id, direction) => {
  const rma = await getRmaById(rma_id);
  if (!rma) {
    const error = new Error("RMA not found");
    error.statusCode = 404;
    throw error;
  }

  if (direction === SHIPMENT_DIRECTION.OUTBOUND) {
    const repair = await getRepairByRmaId(rma_id);
    if (!repair || repair.status !== REPAIR_STATUS.COMPLETED) {
      const error = new Error(
        "Cannot create outbound shipment — repair is not completed",
      );
      error.statusCode = 403;
      throw error;
    }
  }

  const shipment = await createShipmentInRepo(rma_id, direction);

  if (direction === SHIPMENT_DIRECTION.OUTBOUND) {
    // Best-effort, same as the inbound leg — a Shiprocket outage must not
    // block the admin from recording that the outbound shipment exists.
    createOutboundOrder(rma, shipment).catch((error) => {
      logger.error(
        `Shiprocket outbound order creation failed for shipment ${shipment.id}: ${error.message}`,
      );
    });
  }

  return shipment;
};

// Helper: creates the outbound (warehouse -> dealer) Shiprocket order and
// persists the resulting IDs. Pickup is always our fixed warehouse location;
// delivery goes back to the same address the dealer gave as this RMA's
// pickup address (profile address, or the custom one entered for the RMA).
const createOutboundOrder = async (rma, shipment) => {
  const dealer = await getDealerById(rma.dealer_id);
  const address = resolvePickupAddress(dealer, rma);
  const order = await createShiprocketOrder({
    pickup_location: process.env.SHIPROCKET_WAREHOUSE_PICKUP_LOCATION || "warehouse",
    order_id: shipment.id,
    customer: address,
  });
  await setShipmentShiprocketInfoInRepo(shipment.id, {
    shiprocket_shipment_id: order.shipment_id,
    awb_code: order.awb_code,
  });
};

// B) getShipmentsByRmaId(rma_id)
// → returns all shipments (inbound + outbound) tracked for an RMA
export const getShipmentsByRmaId = async (rma_id) => {
  return getShipmentsByRmaIdFromRepo(rma_id);
};

// C) updateShipmentStatus(id, fields)
// → admin updates carrier/tracking/status; auto-stamps shipped_at/delivered_at
//   on the relevant transitions, then notifies the owning dealer
export const updateShipmentStatus = async (id, fields) => {
  const existing = await getShipmentByIdFromRepo(id);
  if (!existing) {
    const error = new Error("Shipment not found");
    error.statusCode = 404;
    throw error;
  }

  const patch = { ...fields };
  if (fields.status === SHIPMENT_STATUS.PICKED_UP && !existing.shipped_at) {
    patch.shipped_at = new Date();
  }
  if (fields.status === SHIPMENT_STATUS.DELIVERED && !existing.delivered_at) {
    patch.delivered_at = new Date();
  }

  const shipment = await updateShipmentInRepo(id, patch);
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

// D) getMyShipments(dealer_id)
// → all shipments across every RMA belonging to the dealer, for the shipments list page
export const getMyShipments = async (dealer_id) => {
  const shipments = await getShipmentsByDealerIdFromRepo(dealer_id);
  return shipments.map((s) => serializeShipment(s, s.rma_number));
};

// E) trackShipmentByNumber(dealer_id, tracking_number)
// → dealer looks up one of their own shipments by tracking number, with a milestone timeline
export const trackShipmentByNumber = async (dealer_id, tracking_number) => {
  const shipment = await getShipmentByTrackingNumberFromRepo(
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
