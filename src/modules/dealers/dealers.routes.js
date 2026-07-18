import express from "express";
import {
  requestOtpController,
  verifyOtpController,
  registerDealerController,
  loginDealerController,
  getProfileController,
  updateProfileController,
  changePasswordController,
} from "./dealers.controller.js";
import {
  getDashboardStatsController,
  getRecentRmasController,
} from "../rmas/rma.controller.js";
import {
  getMyShipmentsController,
  trackShipmentController,
} from "../shipments/shipment.controller.js";

import {
  getMyNotificationsUiController,
  markAllNotificationsReadUiController,
} from "../notifications/notification.controller.js";
import { authenticate } from "../../common/middleware/auth.middleware.js";

const router = express.Router();

// * NOTE: These are all the routes that the dealers will face

/////////////////////////////////////////////////////////////// 1) Public routes — no auth required
router.post("/request-otp", requestOtpController);
router.post("/verify-otp", verifyOtpController);
router.post("/register", registerDealerController);
router.post("/login", loginDealerController);

//////////////////////////////////////////////////////////////// 2)  Dealer routes - require valid JWT
router.get("/dashboard/stats", authenticate, getDashboardStatsController);
router.get("/dashboard/recent-rmas", authenticate, getRecentRmasController);

router.get(
  "/shipments/track/:trackingNumber",
  authenticate,
  trackShipmentController,
);
router.get("/shipments", authenticate, getMyShipmentsController);

router.get("/notifications", authenticate, getMyNotificationsUiController);
router.post(
  "/notifications/mark-read",
  authenticate,
  markAllNotificationsReadUiController,
);

router.get("/profile", authenticate, getProfileController);
router.put("/profile", authenticate, updateProfileController);
router.post("/profile/change-password", authenticate, changePasswordController);

export default router;
