import { successResponse } from "../../common/utils/response.util.js";
import {
  createShipment,
  getShipmentsByRmaId,
  updateShipmentStatus,
} from "./shipment.service.js";

// POST /api/admin/shipments/:rma_id
export const createShipmentController = async (req, res, next) => {
  try {
    const { rma_id } = req.params;
    const { direction } = req.body;
    const shipment = await createShipment(rma_id, direction);
    successResponse(res, shipment, "Shipment created", 201);
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/shipments/:rma_id
export const getShipmentsByRmaIdController = async (req, res, next) => {
  try {
    const { rma_id } = req.params;
    const shipments = await getShipmentsByRmaId(rma_id);
    successResponse(res, shipments, "Shipments fetched successfully");
  } catch (error) {
    next(error);
  }
};

// PUT /api/admin/shipments/:id
export const updateShipmentController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { carrier, tracking_number, status } = req.body;
    const shipment = await updateShipmentStatus(id, {
      carrier,
      tracking_number,
      status,
    });
    successResponse(res, shipment, "Shipment updated");
  } catch (error) {
    next(error);
  }
};
