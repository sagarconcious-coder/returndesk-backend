import express from "express";
import { authenticate } from "../../common/middleware/auth.middleware.js";
import { getDealersController,
    getDealerByIdController,
    approveDealerController,
    rejectDealerController
 } from "./dealers.controller.js";


 const router = express.Router();

// Admin routes — require valid JWT
router.get("/",authenticate,getDealersController);
router.get("/:id",authenticate,getDealerByIdController);
router.put("/:id/approve",authenticate,approveDealerController);
router.put("/:id/reject",authenticate,rejectDealerController);

export default router;