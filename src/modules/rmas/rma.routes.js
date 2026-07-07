import express from "express";
import { authenticate } from "../../common/middleware/auth.middleware.js";
import {
  createRmaController,
  getRmaByIdController,
  getRmasByDealerIdController,
} from "./rma.controller.js";

const router = express.Router();

// Dealer routes — require valid JWT; identity comes from the token, not the request
router.post("/create", authenticate, createRmaController);
router.get("/my-rmas", authenticate, getRmasByDealerIdController);
router.get("/:id", getRmaByIdController);

export default router;
