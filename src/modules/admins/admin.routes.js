import express from "express";
import {
  loginAdminController,
  getDashboardStatsController,
  createAdminController,
  listAllAdminsController,
  deactivateAdminController,
  reactivateAdminController,
  updateAdminRoleController,
} from "./admin.controller.js";
import {
  authenticate,
  requireAdmin,
  requireSuperAdmin,
} from "../../common/middleware/auth.middleware.js";

const router = express.Router();

//////////// Login Admin
router.post("/login", loginAdminController);
router.get(
  "/dashboard/stats",
  authenticate,
  requireAdmin,
  getDashboardStatsController,
);

///////// Crate Admin
router.post("/admins", authenticate, requireSuperAdmin, createAdminController);

/////////// List Admins
router.get("/admins", authenticate, requireSuperAdmin, listAllAdminsController);

///////////// Deactivate
router.put(
  "/admins/:id/deactivate",
  authenticate,
  requireSuperAdmin,
  deactivateAdminController,
);
router.put(
  "/admins/:id/reactivate",
  authenticate,
  requireSuperAdmin,
  reactivateAdminController,
);
router.put(
  "/admins/:id/role",
  authenticate,
  requireSuperAdmin,
  updateAdminRoleController,
);

export default router;
