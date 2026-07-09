import express from "express";

import {
  authenticate,
  requireAdmin,
} from "../../common/middleware/auth.middleware.js";

import {
  startRepairController,
  getRepairController,
  updateRepairController,
  completeRepairController,
  markUnrepairableController,
} from "./repair.controller.js";

const router = express.Router();

router.post(
  "/:rma_id/start",
  authenticate,
  requireAdmin,
  startRepairController,
);

router.get("/:rma_id", authenticate, requireAdmin, getRepairController);

router.put("/:rma_id", authenticate, requireAdmin, updateRepairController);
router.put(
  "/:rma_id/complete",
  authenticate,
  requireAdmin,
  completeRepairController,
);

router.put(
  "/:rma_id/unrepairable",
  authenticate,
  requireAdmin,
  markUnrepairableController,
);

export default router;
