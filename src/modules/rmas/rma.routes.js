import express from "express";
import { authenticate } from "../../common/middleware/auth.middleware.js";
import {
  createRmaController,
  getRmaByIdController,
  getRmasByDealerIdController,
  getRmaShipmentsController,
  getRmaRepairController,
} from "./rma.controller.js";

const router = express.Router();

// Dealer routes — require valid JWT; identity comes from the token, not the request
router.post("/create", authenticate, createRmaController);
router.get("/my-rmas", authenticate, getRmasByDealerIdController);
router.get("/:id/shipments", authenticate, getRmaShipmentsController);
router.get("/:id/repair", authenticate, getRmaRepairController);
router.get("/:id", authenticate, getRmaByIdController);

export default router;
