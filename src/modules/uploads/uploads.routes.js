import express from "express";
import { authenticate } from "../../common/middleware/auth.middleware.js";
import { presignUploadController } from "./uploads.controller.js";

const router = express.Router();
router.post("/presign", authenticate, presignUploadController);
export default router;
