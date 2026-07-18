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
  updateShipmentController,
} from "./shipment.controller.js";

// Admin routes — require valid JWT
const router = express.Router();

///////////////////////////////////// 0) list all shipments
router.get("/", authenticate, requireAdmin, getAllShipmentsController);

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
