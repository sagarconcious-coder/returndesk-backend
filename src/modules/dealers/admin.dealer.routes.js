import express from "express";
import {
  authenticate,
  requireAdmin,
} from "../../common/middleware/auth.middleware.js";
import {
  getDealersController,
  getDealerByIdController,
  approveDealerController,
  rejectDealerController,
} from "./dealers.controller.js";

const router = express.Router();

// Admin routes — require valid JWT
router.get("/", authenticate, requireAdmin, getDealersController);
router.get("/:id", authenticate, requireAdmin, getDealerByIdController);
router.put("/:id/approve", authenticate, requireAdmin, approveDealerController);
router.put("/:id/reject", authenticate, requireAdmin, rejectDealerController);

export default router;
