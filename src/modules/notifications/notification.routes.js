import express from "express";
import { authenticate } from "../../common/middleware/auth.middleware.js";
import {
  getMyNotificationsController,
  markNotificationReadController,
  markAllNotificationsReadController,
} from "./notification.controller.js";

const router = express.Router();

router.get("/", authenticate, getMyNotificationsController);
router.put("/read-all", authenticate, markAllNotificationsReadController);
router.put("/:id/read", authenticate, markNotificationReadController);

export default router;
