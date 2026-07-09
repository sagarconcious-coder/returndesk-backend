import {
  SHIPMENT_STATUS,
  SHIPMENT_DIRECTION,
  REPAIR_STATUS,
} from "../../common/constants/status.constants.js";
import {
  createShipment as createShipmentInRepo,
  getShipmentsByRmaId as getShipmentsByRmaIdFromRepo,
  getShipmentById as getShipmentByIdFromRepo,
  updateShipment as updateShipmentInRepo,
} from "./shipment.repository.js";
import { getRmaById } from "../rmas/rma.repository.js";
import { getRepairByRmaId } from "../repairs/repair.repository.js";
import { notifyShipmentUpdated } from "../notifications/notification.service.js";

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

  return createShipmentInRepo(rma_id, direction);
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
