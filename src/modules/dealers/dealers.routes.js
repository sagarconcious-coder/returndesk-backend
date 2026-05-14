import express from "express";
import {
  requestOtpController,
  verifyOtpController,
  registerDealerController,
  getDealersController,
  getDealerByIdController,
  approveDealerController,
  rejectDealerController,
} from "./dealers.controller.js";

const router = express.Router();

// Public routes
router.post("/request-otp", requestOtpController);
router.post("/verify-otp", verifyOtpController);
router.post("/register", registerDealerController);

// Admin routes

router.get("/admin", getDealersController);
router.get("/admin/:id", getDealerByIdController);
router.put("/admin/:id/approve", approveDealerController);
router.put("/admin/:id/reject", rejectDealerController);

export default router;
