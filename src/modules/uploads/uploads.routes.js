import express from "express";
import {
  authenticate,
  requireDealer,
} from "../../common/middleware/auth.middleware.js";
import { presignUploadController } from "./uploads.controller.js";

const router = express.Router();
router.post("/presign", authenticate, requireDealer, presignUploadController);
export default router;
