import {
  loginAdmin,
  getDashboardStats,
  createAdmin,
  listAllAdmins,
  deactivateAdmin,
  reactivateAdmin,
  updateAdminRole,
} from "./admin.service.js";
import { successResponse } from "../../common/utils/response.util.js";
import { create } from "axios";

export async function loginAdminController(req, res, next) {
  try {
    const { email, password } = req.body;
    /////////////////////////// 1) If user misses email or password
    if (!email || !password) {
      const err = new Error("Email and passwords are required");
      err.statusCode = 400;
      throw err;
    }

    /////////////////////////    2) try logging in with provided email and password
    const token = await loginAdmin(email, password);
    return successResponse(res, token, "Login Successful");
  } catch (error) {
    next(error);
  }
}

// GET /api/admin/dashboard/stats
export async function getDashboardStatsController(req, res, next) {
  try {
    const stats = await getDashboardStats();
    successResponse(res, stats, "Dashboard stats fetched successfully");
  } catch (error) {
    next(error);
  }
}

//////////////////////////////// create admin controller
// POST /api/admin/admins
export const createAdminController = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      const err = new Error("name , email and password are required");
      err.statusCode = 400;
      throw err;
    }
    const admin = await createAdmin({ name, email, password, role });
    successResponse(res, admin, "Admin created successfully", 201);
  } catch (error) {
    next(error);
  }
};

////////////////////////////////// GET ALL ADMINS
// GET /api/admin/admin

export const listAllAdminsController = async (req, res, next) => {
  try {
    const admins = await listAllAdmins();
    successResponse(res, admins, "Admins fetched Successfully");
  } catch (error) {
    next(error);
  }
};

/////////////////////////////////// Deactivate Admin
// PUT /api/admin/admins/:id/deactivate

export const deactivateAdminController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const admin = await deactivateAdmin(id, req.user.admin_id);
    successResponse(res, admin, "Admin deactivated");
  } catch (error) {
    next(error);
  }
};

//////////////////////////////////// Reactivate Admin
// PUT /api/admin/admins/:id/reactivate
export const reactivateAdminController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const admin = await reactivateAdmin(id);
    successResponse(res, admin, "Admin reactivated");
  } catch (error) {
    next(error);
  }
};

///////////////////////////////// Update Admin role
// PUT /api/admin/admins/:id/role
export const updateAdminRoleController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role) {
      const err = new Error("role is required");
      err.statusCode = 400;
      throw err;
    }
    const admin = await updateAdminRole(id, role, req.user.admin_id);
    successResponse(res, admin, "Admin role updated");
  } catch (error) {
    next(error);
  }
};
