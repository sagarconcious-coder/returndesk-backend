import {
  REPAIR_STATUS,
  RMA_STATUS,
} from "../../common/constants/status.constants.js";
import {
  createRepair as createRepairInRepo,
  getRepairByRmaId as getRepairByRmaIdFromRepo,
  updateRepair as updateRepairInRepo,
} from "./repair.repository.js";
import { getRmaById } from "../rmas/rma.repository.js";
import {
  notifyRepairStarted,
  notifyRepairCompleted,
  notifyRepairUnrepairable,
} from "../notifications/notification.service.js";

// Admin starts a repair — RMA must be APPROVED, and no repair should exist yet
export const startRepair = async (rma_id, technician_name) => {
  const rma = await getRmaById(rma_id);
  if (!rma) {
    const error = new Error("RMA not found");
    error.statusCode = 404;
    throw error;
  }
  if (rma.status !== RMA_STATUS.APPROVED) {
    const error = new Error(
      `Cannot start repair — RMA status is ${rma.status}`,
    );
    error.statusCode = 403;
    throw error;
  }

  const existing = await getRepairByRmaIdFromRepo(rma_id);
  if (existing) {
    const error = new Error("Repair already exists for this RMA");
    error.statusCode = 409;
    throw error;
  }

  const repair = await createRepairInRepo(rma_id);
  const updated = await updateRepairInRepo(rma_id, {
    technician_name,
    status: REPAIR_STATUS.IN_PROGRESS,
    started_at: new Date(),
  });
  await notifyRepairStarted(rma);
  return updated;
};

//////////////////////////// Search for repair (using rma_id)
export const getRepairByRmaId = async (rma_id) => {
  const repair = await getRepairByRmaIdFromRepo(rma_id);
  if (!repair) {
    const error = new Error("Repair not found");
    error.statusCode = 404;
    throw error;
  }
  return repair;
};

// Admin updates repair progress (diagnosis, parts, notes) without changing terminal status
export const updateRepairProgress = async (rma_id, fields) => {
  const repair = await updateRepairInRepo(rma_id, fields);
  if (!repair) {
    const error = new Error("Repair not found");
    error.statusCode = 404;
    throw error;
  }
  return repair;
};

////////////////// Mark a repair as complete
export const completeRepair = async (rma_id, repair_notes) => {
  const repair = await updateRepairInRepo(rma_id, {
    status: REPAIR_STATUS.COMPLETED,
    repair_notes,
    completed_at: new Date(),
  });
  if (!repair) {
    const error = new Error("Repair not found");
    error.statusCode = 404;
    throw error;
  }
  const rma = await getRmaById(rma_id);
  await notifyRepairCompleted(rma);
  return repair;
};

////////////////// Mark a repair as Unrepairable

export const markUnrepairable = async (rma_id, repair_notes) => {
  const repair = await updateRepairInRepo(rma_id, {
    status: REPAIR_STATUS.UNREPAIRABLE,
    repair_notes,
    completed_at: new Date(),
  });
  if (!repair) {
    const error = new Error("Repair not found");
    error.statusCode = 404;
    throw error;
  }
  const rma = await getRmaById(rma_id);
  await notifyRepairUnrepairable(rma);
  return repair;
};
