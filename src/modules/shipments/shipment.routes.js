import express from "express";
import {
  authenticate,
  requireAdmin,
} from "../../common/middleware/auth.middleware.js";
import {
  createShipmentController,
  getAllShipmentsController,
  getShipmentsByRmaIdController,
  requestPickupForRmasController,
  retryPickupForShipmentController,
  retryOutboundShipmentController,
  cancelPickupForShipmentController,
  shiprocketWebhookController,
  updateShipmentController,
} from "./shipment.controller.js";

// Admin routes — require valid JWT
const router = express.Router();

///////////////////////////////////// 0) list all shipments
router.get("/", authenticate, requireAdmin, getAllShipmentsController);

///////////////////////////////////// 0b) Shiprocket tracking webhook — called by
///////////////////////////////////// Shiprocket itself, verified by shared secret
///////////////////////////////////// instead of admin JWT. Registered before the
///////////////////////////////////// "/:rma_id" catch-all below so it isn't swallowed by it.
router.post("/webhook/shiprocket", shiprocketWebhookController);

///////////////////////////////////// 1) pickup request endpoint
router.post(
  "/pickup-request",
  authenticate,
  requireAdmin,
  requestPickupForRmasController,
);

///////////////////////////////////// 1b) retry pickup for a stuck shipment
router.post(
  "/:id/retry-pickup",
  authenticate,
  requireAdmin,
  retryPickupForShipmentController,
);

///////////////////////////////////// 1b-2) retry Shiprocket registration for a stuck outbound shipment
router.post(
  "/:id/retry-outbound",
  authenticate,
  requireAdmin,
  retryOutboundShipmentController,
);

///////////////////////////////////// 1c) cancel a requested pickup
router.post(
  "/:id/cancel-pickup",
  authenticate,
  requireAdmin,
  cancelPickupForShipmentController,
);

////////////////////////////////////// 2) Create Shipment endpoint
router.post("/:rma_id", authenticate, requireAdmin, createShipmentController);
router.get(
  "/:rma_id",
  authenticate,
  requireAdmin,
  getShipmentsByRmaIdController,
);
router.put("/:id", authenticate, requireAdmin, updateShipmentController);

export default router;
