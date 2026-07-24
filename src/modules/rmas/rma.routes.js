import express from "express";
import {
  authenticate,
  requireDealer,
} from "../../common/middleware/auth.middleware.js";
import {
  createRmaController,
  getRmaByIdController,
  getRmasByDealerIdController,
  getRmaShipmentsController,
  getRmaRepairController,
  getShippingEstimateForDealerController,
} from "./rma.controller.js";

const router = express.Router();

// Dealer routes — require valid JWT + dealer role; identity comes from the token, not the request
router.post("/create", authenticate, requireDealer, createRmaController);
router.get(
  "/my-rmas",
  authenticate,
  requireDealer,
  getRmasByDealerIdController,
);
router.get(
  "/shipping-estimate",
  authenticate,
  requireDealer,
  getShippingEstimateForDealerController,
);

router.get(
  "/:id/shipments",
  authenticate,
  requireDealer,
  getRmaShipmentsController,
);
router.get(
  "/:id/repair",
  authenticate,
  requireDealer,
  getRmaRepairController,
);
router.get("/:id", authenticate, requireDealer, getRmaByIdController);

export default router;
