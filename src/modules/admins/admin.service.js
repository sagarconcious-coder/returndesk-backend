import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import {
  getAdminByEmail,
  getDashboardCounts,
  createAdmin as createAdminInRepo,
  getAllAdmins as getAllAdminsInRepo,
  updateAdminRole as updateAdminRoleInRepo,
  updateAdminStatus as updateAdminStatusInRepo,
} from "./admin.repository.js";
import { env } from "../../config/env.js";
import { create } from "axios";
import {
  ADMIN_ROLE,
  ADMIN_STATUS,
} from "../../common/constants/status.constants.js";

//////////////////////////////////////////////////////// LOGIN ADMIN
export async function loginAdmin(email, password) {
  /////////////// 1) Check if admin exists
  const admin = await getAdminByEmail(email);
  if (!admin) {
    const err = new Error("Invalid email or password");
    err.statusCode = 401;
    throw err;
  }

  /////////////// 2) If admin is found , try mathcing password
  const match = await bcrypt.compare(password, admin.password);
  if (!match) {
    const err = new Error("Invalid email or password");
    err.statusCode = 401;
    throw err;
  }
  ///////////////// 3) Block deactive admins
  if (admin.status !== "ACTIVE") {
    const err = new Error("This admin account has been deactivated");
    err.statusCode = 403;
  }
  ////////////// 4) Both email and password mathces , so generate token (jwt)

  const token = jwt.sign(
    {
      admin_id: admin.id,
      email: admin.email,
      role: admin.role.toLowerCase(),
    },
    env.JWT_SECRET,
    { expiresIn: "7d" },
  );
  return { token };
}

export async function getDashboardStats() {
  const counts = await getDashboardCounts();
  return {
    pendingDealers: Number(counts.pending_dealers),
    pendingRmas: Number(counts.pending_rmas),
    activeRepairs: Number(counts.active_repairs),
    openShipments: Number(counts.open_shipments),
  };
}

////////////////////////////////// CREATE ADMIN

export const createAdmin = async ({ name, email, password, role }) => {
  const existing = await getAdminByEmail(email);
  if (existing) {
    const err = new Error("An Admin with this email already exists");
    err.statusCode = 409;
    throw err;
  }

  const hashed = await bcrypt.hash(password, 10);
  const admin = await createAdminInRepo({
    name,
    email,
    password: hashed,
    role: role || ADMIN_ROLE.admin,
  });
  return admin;
};

/////////////////////////////// LIST ALL ADMINs

export const listAllAdmins = async () => getAllAdminsInRepo();

///////////////////////////// DEACTIVATE ADMIN

export const deactivateAdmin = async (id, requesting_admin_id) => {
  if (id === requesting_admin_id) {
    const err = new Error("You cannot deactivate your own account");
    err.statusCode = 400;
    throw err;
  }

  return updateAdminStatusInRepo(id, ADMINI_STATUS.INACTIVE);
};

export const reactivateAdmin = async (id) => {
  updateAdminStatusInRepo(id, ADMIN_STATUS.ACTIVE);
};

export const updateAdminRole = async (id, role, requesting_admin_id) => {
  if (id === requesting_admin_id) {
    const err = new Error("You cannot change your own role");
    err.statusCode = 400;
    throw err;
  }
  return updateAdminRoleInRepo(id, role);
};
