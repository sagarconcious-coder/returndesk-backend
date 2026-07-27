import express from "express";
import {
  requestOtpController,
  verifyOtpController,
  registerDealerController,
  loginDealerController,
  getProfileController,
  updateProfileController,
  changePasswordController,
  forgotPasswordController,
  resetPasswordController,
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
import {
  authenticate,
  requireDealer,
} from "../../common/middleware/auth.middleware.js";
import {
  loginLimiter,
  otpRequestLimiter,
  otpVerifyLimiter,
} from "../../common/middleware/rateLimit.middleware.js";

const router = express.Router();

// * NOTE: These are all the routes that the dealers will face

/////////////////////////////////////////////////////////////// 1) Public routes — no auth required
router.post("/request-otp", otpRequestLimiter, requestOtpController);
router.post("/verify-otp", otpVerifyLimiter, verifyOtpController);
router.post("/register", registerDealerController);
router.post("/login", loginLimiter, loginDealerController);
router.post("/forgot-password", otpRequestLimiter, forgotPasswordController);
router.post("/reset-password", otpVerifyLimiter, resetPasswordController);
//////////////////////////////////////////////////////////////// 2)  Dealer routes - require valid JWT + dealer role
router.get(
  "/dashboard/stats",
  authenticate,
  requireDealer,
  getDashboardStatsController,
);
router.get(
  "/dashboard/recent-rmas",
  authenticate,
  requireDealer,
  getRecentRmasController,
);

router.get(
  "/shipments/track/:trackingNumber",
  authenticate,
  requireDealer,
  trackShipmentController,
);
router.get("/shipments", authenticate, requireDealer, getMyShipmentsController);

router.get(
  "/notifications",
  authenticate,
  requireDealer,
  getMyNotificationsUiController,
);
router.post(
  "/notifications/mark-read",
  authenticate,
  requireDealer,
  markAllNotificationsReadUiController,
);

router.get("/profile", authenticate, requireDealer, getProfileController);
router.put("/profile", authenticate, requireDealer, updateProfileController);
router.post(
  "/profile/change-password",
  authenticate,
  requireDealer,
  changePasswordController,
);

export default router;
