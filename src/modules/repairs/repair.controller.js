import { successResponse } from "../../common/utils/response.util.js";
import {
  startRepair,
  getRepairByRmaId,
  updateRepairProgress,
  completeRepair,
  markUnrepairable,
} from "./repair.service.js";

// POST /api/admin/repairs/:rma_id/start
export const startRepairController = async (req, res, next) => {
  try {
    const { rma_id } = req.params;
    const { technician_name } = req.body;
    const repair = await startRepair(rma_id, technician_name);
    successResponse(res, repair, "Repair started", 201);
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/repairs/:rma_id
export const getRepairController = async (req, res, next) => {
  try {
    const { rma_id } = req.params;
    const repair = await getRepairByRmaId(rma_id);
    successResponse(res, repair, "Repair fetched successfully");
  } catch (error) {
    next(error);
  }
};

// PUT /api/admin/repairs/:rma_id
export const updateRepairController = async (req, res, next) => {
  try {
    const { rma_id } = req.params;
    const { technician_name, diagnosis, parts_used, repair_notes } = req.body;
    const repair = await updateRepairProgress(rma_id, {
      technician_name,
      diagnosis,
      parts_used,
      repair_notes,
    });
    successResponse(res, repair, "Repair updated");
  } catch (error) {
    next(error);
  }
};

// PUT /api/admin/repairs/:rma_id/complete
export const completeRepairController = async (req, res, next) => {
  try {
    const { rma_id } = req.params;
    const { repair_notes } = req.body;
    const repair = await completeRepair(rma_id, repair_notes);
    successResponse(res, repair, "Repair marked as completed");
  } catch (error) {
    next(error);
  }
};

// PUT /api/admin/repairs/:rma_id/unrepairable
export const markUnrepairableController = async (req, res, next) => {
  try {
    const { rma_id } = req.params;
    const { repair_notes } = req.body;
    const repair = await markUnrepairable(rma_id, repair_notes);
    successResponse(res, repair, "Repair marked as unrepairable");
  } catch (error) {
    next(error);
  }
};
