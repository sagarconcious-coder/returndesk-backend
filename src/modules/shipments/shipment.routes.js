import express from "express";
import {
  authenticate,
  requireAdmin,
} from "../../common/middleware/auth.middleware.js";
import {
  createShipmentController,
  getShipmentsByRmaIdController,
  updateShipmentController,
} from "./shipment.controller.js";

// Admin routes — require valid JWT
const router = express.Router();

router.post("/:rma_id", authenticate, requireAdmin, createShipmentController);
router.get(
  "/:rma_id",
  authenticate,
  requireAdmin,
  getShipmentsByRmaIdController,
);
router.put("/:id", authenticate, requireAdmin, updateShipmentController);

export default router;
