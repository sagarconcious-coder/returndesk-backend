import jwt from "jsonwebtoken";
import { getAdminById } from "../../modules/admins/admin.repository.js";
import { getDealerById } from "../../modules/dealers/dealer.repository.js";
import { ADMIN_STATUS, DEALER_STATUS } from "../constants/status.constants.js";

//////////////////////////////////////// 1) Authenticate function
// grab token, verify it, re-check the account is still active, and add it to req.user.
// The re-check matters because a JWT stays cryptographically valid for its full
// lifetime (7d) regardless of what happens to the account afterwards — without
// this, a deactivated admin or a rejected dealer keeps full API access until
// their existing token naturally expires.
export const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ success: false, message: "Unauthorized: No token provided" });
  }

  const token = authHeader.split(" ")[1];

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Invalid or expired token",
    });
  }

  try {
    if (decoded.role === "admin" || decoded.role === "super_admin") {
      const admin = await getAdminById(decoded.admin_id);
      if (!admin || admin.status !== ADMIN_STATUS.ACTIVE) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized: Account is no longer active",
        });
      }
    } else if (decoded.role === "dealer") {
      const dealer = await getDealerById(decoded.dealer_id);
      if (!dealer || dealer.status !== DEALER_STATUS.ACTIVE) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized: Account is no longer active",
        });
      }
    }
    req.user = decoded;
    next();
  } catch (error) {
    next(error);
  }
};

export const requireDealer = (req, res, next) => {
  if (req.user?.role !== "dealer") {
    return res
      .status(403)
      .json({ success: false, message: "Forbidden: Dealers only" });
  }
  next();
};

export const requireAdmin = (req, res, next) => {
  if (req.user?.role !== "admin" && req.user?.role !== "super_admin") {
    return res
      .status(403)
      .json({ success: false, message: "Forbidden: Admins only" });
  }
  next();
};

export const requireSuperAdmin = (req, res, next) => {
  if (req.user?.role !== "super_admin") {
    return res.status(403).json({
      success: false,
      message: "Forbidden: Super Admins only",
    });
  }
  next();
};
