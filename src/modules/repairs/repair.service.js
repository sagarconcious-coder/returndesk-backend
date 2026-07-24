import { REPAIR_STATUS } from "../../common/constants/status.constants.js";
import {
  createRepair as createRepairInRepo,
  getRepairByRmaId as getRepairByRmaIdFromRepo,
  getAllRepairs as getAllRepairsFromRepo,
  updateRepair as updateRepairInRepo,
} from "./repair.repository.js";
import { getRmaByIdOrNumber } from "../rmas/rma.repository.js";
import {
  notifyRepairStarted,
  notifyRepairCompleted,
  notifyRepairUnrepairable,
} from "../notifications/notification.service.js";

// Admin starts a repair — the repair row is auto-created (PENDING) when the
// inbound shipment is marked DELIVERED, so this just promotes it to
// IN_PROGRESS. Rejects if the item hasn't arrived yet (no repair row) or if
// it's already past PENDING.
export const startRepair = async (rma_id, technician_name) => {
  const rma = await getRmaByIdOrNumber(rma_id);
  if (!rma) {
    const error = new Error("RMA not found");
    error.statusCode = 404;
    throw error;
  }

  const existing = await getRepairByRmaIdFromRepo(rma.id);
  if (!existing) {
    const error = new Error(
      "Cannot start repair — item has not been delivered yet",
    );
    error.statusCode = 403;
    throw error;
  }
  if (existing.status !== REPAIR_STATUS.PENDING) {
    const error = new Error("Repair already started for this RMA");
    error.statusCode = 409;
    throw error;
  }

  // expectedStatus=PENDING makes this an atomic compare-and-swap: two
  // concurrent "start repair" calls can both pass the check above, but only
  // one UPDATE actually matches (the other finds status already flipped to
  // IN_PROGRESS and updates zero rows).
  const updated = await updateRepairInRepo(
    rma.id,
    {
      technician_name,
      status: REPAIR_STATUS.IN_PROGRESS,
      started_at: new Date(),
    },
    REPAIR_STATUS.PENDING,
  );
  if (!updated) {
    const error = new Error("Repair already started for this RMA");
    error.statusCode = 409;
    throw error;
  }
  await notifyRepairStarted(rma);
  return updated;
};

//////////////////////////// Admin list of all repairs, optionally filtered by status
export const getAllRepairs = async (status) => {
  return getAllRepairsFromRepo(status);
};

//////////////////////////// Search for repair (using rma_id or rma_number)
export const getRepairByRmaId = async (rma_id) => {
  const rma = await getRmaByIdOrNumber(rma_id);
  const repair = rma ? await getRepairByRmaIdFromRepo(rma.id) : null;
  if (!repair) {
    const error = new Error("Repair not found");
    error.statusCode = 404;
    throw error;
  }
  return repair;
};

// Same lookup, but returns null instead of throwing — for callers assembling
// a composite view (e.g. RMA detail) where "no repair yet" is a valid state
export const getRepairByRmaIdOrNull = async (rma_id) => {
  const repair = await getRepairByRmaIdFromRepo(rma_id);
  return repair ?? null;
};

// Admin updates repair progress (diagnosis, parts, notes) without changing terminal status
export const updateRepairProgress = async (rma_id, fields) => {
  const rma = await getRmaByIdOrNumber(rma_id);
  if (!rma) {
    const error = new Error("RMA not found");
    error.statusCode = 404;
    throw error;
  }
  const repair = await updateRepairInRepo(rma.id, fields);
  if (!repair) {
    const error = new Error("Repair not found");
    error.statusCode = 404;
    throw error;
  }
  return repair;
};

////////////////// Mark a repair as complete
export const completeRepair = async (rma_id, repair_notes) => {
  const rma = await getRmaByIdOrNumber(rma_id);
  if (!rma) {
    const error = new Error("RMA not found");
    error.statusCode = 404;
    throw error;
  }
  const existing = await getRepairByRmaIdFromRepo(rma.id);
  if (!existing) {
    const error = new Error("Repair not found");
    error.statusCode = 404;
    throw error;
  }
  if (existing.status !== REPAIR_STATUS.IN_PROGRESS) {
    const error = new Error(
      `Cannot complete repair — current status is ${existing.status}, expected IN_PROGRESS`,
    );
    error.statusCode = 409;
    throw error;
  }

  const repair = await updateRepairInRepo(
    rma.id,
    {
      status: REPAIR_STATUS.COMPLETED,
      repair_notes,
      completed_at: new Date(),
    },
    REPAIR_STATUS.IN_PROGRESS,
  );
  if (!repair) {
    const error = new Error(
      `Cannot complete repair — current status is no longer IN_PROGRESS`,
    );
    error.statusCode = 409;
    throw error;
  }
  await notifyRepairCompleted(rma);
  return repair;
};

////////////////// Mark a repair as Unrepairable

export const markUnrepairable = async (rma_id, repair_notes) => {
  const rma = await getRmaByIdOrNumber(rma_id);
  if (!rma) {
    const error = new Error("RMA not found");
    error.statusCode = 404;
    throw error;
  }
  const existing = await getRepairByRmaIdFromRepo(rma.id);
  if (!existing) {
    const error = new Error("Repair not found");
    error.statusCode = 404;
    throw error;
  }
  if (existing.status !== REPAIR_STATUS.IN_PROGRESS) {
    const error = new Error(
      `Cannot mark unrepairable — current status is ${existing.status}, expected IN_PROGRESS`,
    );
    error.statusCode = 409;
    throw error;
  }

  const repair = await updateRepairInRepo(
    rma.id,
    {
      status: REPAIR_STATUS.UNREPAIRABLE,
      repair_notes,
      completed_at: new Date(),
    },
    REPAIR_STATUS.IN_PROGRESS,
  );
  if (!repair) {
    const error = new Error(
      `Cannot mark unrepairable — current status is no longer IN_PROGRESS`,
    );
    error.statusCode = 409;
    throw error;
  }
  await notifyRepairUnrepairable(rma);
  return repair;
};
