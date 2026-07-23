import { successResponse, errorResponse } from "../../common/utils/response.util.js";
import {
  createShipment,
  getAllShipments,
  getShipmentsByRmaId,
  updateShipmentStatus,
  getMyShipments,
  trackShipmentByNumber,
  retryOutboundShipment,
} from "./shipment.service.js";
import {
  requestPickupForRmas,
  retryPickupForShipment,
  cancelPickupForShipment,
  handleShiprocketTrackingWebhook,
} from "./pickup.service.js";

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
    const {
      direction,
      return_address_same_as_pickup,
      return_address_line1,
      return_address_city,
      return_address_state,
      return_address_pincode,
    } = req.body;
    const shipment = await createShipment(rma_id, direction, {
      return_address_same_as_pickup,
      return_address_line1,
      return_address_city,
      return_address_state,
      return_address_pincode,
    });
    const message =
      direction === "OUTBOUND" && !shipment.awb_code
        ? `Shipment created, but courier assignment failed: ${shipment.pickup_error || "no AWB assigned"}`
        : "Shipment created";
    successResponse(res, shipment, message, 201);
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

// POST /api/admin/shipments/:id/retry-outbound
export const retryOutboundShipmentController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const shipment = await retryOutboundShipment(id);
    successResponse(res, shipment, "Outbound shipment retried successfully");
  } catch (error) {
    next(error);
  }
};

// POST /api/admin/shipments/:id/cancel-pickup
export const cancelPickupForShipmentController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const shipment = await cancelPickupForShipment(id);
    successResponse(res, shipment, "Pickup cancelled successfully");
  } catch (error) {
    next(error);
  }
};

// POST /api/admin/shipments/webhook/shiprocket
// → called by Shiprocket (not an admin), so it's verified via a shared
//   secret header instead of the usual JWT auth middleware
export const shiprocketWebhookController = async (req, res, next) => {
  try {
    const providedSecret = req.headers["x-webhook-secret"];
    if (
      !process.env.SHIPROCKET_WEBHOOK_SECRET ||
      providedSecret !== process.env.SHIPROCKET_WEBHOOK_SECRET
    ) {
      return errorResponse(res, "Unauthorized", 401);
    }

    const result = await handleShiprocketTrackingWebhook(req.body);
    successResponse(res, result, "Webhook processed");
  } catch (error) {
    next(error);
  }
};
