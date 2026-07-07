import express from "express";
import {
  requestOtpController,
  verifyOtpController,
  registerDealerController,
  loginDealerController,
} from "./dealers.controller.js";
import { authenticate } from "../../common/middleware/auth.middleware.js";

const router = express.Router();

// Public routes — no auth required
router.post("/request-otp", requestOtpController);
router.post("/verify-otp", verifyOtpController);
router.post("/register", registerDealerController);

// Dealer routes - require valid JWT
router.post("/login", loginDealerController);

export default router;
