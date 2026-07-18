import { successResponse } from "../../common/utils/response.util.js";
import {
  createShipment,
  getAllShipments,
  getShipmentsByRmaId,
  updateShipmentStatus,
  getMyShipments,
  trackShipmentByNumber,
  requestPickupForRmas,
  retryPickupForShipment,
} from "./shipment.service.js";

// GET /api/admin/shipments?status=IN_TRANSIT&direction=INBOUND
export const getAllShipmentsController = async (req, res, next) => {
  try {
    const { status, direction } = req.query;
    const shipments = await getAllShipments(status, direction);
    successResponse(res, shipments, "Shipments fetched successfully");
  } catch (error) {
    next(error);
  }
};

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

// GET /api/dealers/shipments
export const getMyShipmentsController = async (req, res, next) => {
  try {
    const dealer_id = req.user?.dealerId || req.user?.dealer_id;
    const shipments = await getMyShipments(dealer_id);
    successResponse(res, shipments, "Shipments fetched successfully");
  } catch (error) {
    next(error);
  }
};

// GET /api/dealers/shipments/track/:trackingNumber
export const trackShipmentController = async (req, res, next) => {
  try {
    const dealer_id = req.user?.dealerId || req.user?.dealer_id;
    const { trackingNumber } = req.params;
    const result = await trackShipmentByNumber(dealer_id, trackingNumber);
    successResponse(res, result, "Shipment fetched successfully");
  } catch (error) {
    next(error);
  }
};

// POST /api/admin/shipments/pickup-request

export const requestPickupForRmasController = async (req, res, next) => {
  try {
    const { rma_ids } = req.body;
    const result = await requestPickupForRmas(rma_ids);
    successResponse(res, result, "Pickup requested successfully", 201);
  } catch (error) {
    next(error);
  }
};

// POST /api/admin/shipments/:id/retry-pickup
export const retryPickupForShipmentController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const shipment = await retryPickupForShipment(id);
    successResponse(res, shipment, "Pickup retried successfully");
  } catch (error) {
    next(error);
  }
};
