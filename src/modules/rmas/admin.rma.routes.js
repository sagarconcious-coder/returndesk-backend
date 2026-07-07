import express from "express";
import {
  authenticate,
  requireAdmin,
} from "../../common/middleware/auth.middleware.js";
import {
  getAllRmasController,
  approveRmaController,
  rejectRmaController,
} from "./rma.controller.js";
// Admin routes — require valid JWT
const router = express.Router();

router.get("/", authenticate, requireAdmin, getAllRmasController);
router.put("/:id/approve", authenticate, requireAdmin, approveRmaController);
router.put("/:id/reject", authenticate, requireAdmin, rejectRmaController);

export default router;
