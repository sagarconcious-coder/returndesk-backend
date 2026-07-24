import express from "express";
import {
  authenticate,
  requireAdmin,
} from "../../common/middleware/auth.middleware.js";
import {
  getAdminNotificationsController,
  markAdminNotificationReadController,
  markAllAdminNotificationsReadController,
} from "./notification.controller.js";
// Admin routes — require valid JWT
const router = express.Router();

router.get("/", authenticate, requireAdmin, getAdminNotificationsController);
router.put("/read-all", authenticate, requireAdmin, markAllAdminNotificationsReadController);
router.put("/:id/read", authenticate, requireAdmin, markAdminNotificationReadController);

export default router;