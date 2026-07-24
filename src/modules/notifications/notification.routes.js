import express from "express";
import {
  authenticate,
  requireDealer,
} from "../../common/middleware/auth.middleware.js";
import {
  getMyNotificationsController,
  markNotificationReadController,
  markAllNotificationsReadController,
} from "./notification.controller.js";

const router = express.Router();

router.get("/", authenticate, requireDealer, getMyNotificationsController);
router.put(
  "/read-all",
  authenticate,
  requireDealer,
  markAllNotificationsReadController,
);
router.put(
  "/:id/read",
  authenticate,
  requireDealer,
  markNotificationReadController,
);

export default router;
