import { successResponse } from "../../common/utils/response.util.js";
import {
  requestOtp,
  verifyOtp,
  registerDealer,
  getDealers,
  getDealerById,
  approveDealer,
  rejectDealer,
  loginDealer,
  getMyProfile,
  updateMyProfile,
  changeMyPassword,
} from "./dealer.service.js";

// POST /api/dealers/request-otp
export const requestOtpController = async (req, res, next) => {
  try {
    console.log("OTP requested................");
    const { email } = req.body;
    const result = await requestOtp(email);
    successResponse(res, result, "OTP sent");
  } catch (error) {
    next(error);
  }
};

// POST /api/dealers/verify-otp
export const verifyOtpController = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const result = await verifyOtp(email, otp);
    successResponse(res, result, "OTP verified");
  } catch (error) {
    next(error);
  }
};

// POST /api/dealers/register
export const registerDealerController = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const data = req.body;
    const result = await registerDealer(token, data);
    const { message, dealer } = result;
    successResponse(res, dealer, message, 201);
  } catch (error) {
    next(error);
  }
};

// GET /api/dealers/admin
export const getDealersController = async (req, res, next) => {
  try {
    const { status } = req.query;
    const dealers = await getDealers(status);
    successResponse(res, dealers, "Dealers fetched successfully");
  } catch (error) {
    next(error);
  }
};

// GET /api/dealers/admin/:id
export const getDealerByIdController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const dealer = await getDealerById(id);
    successResponse(res, dealer, "Dealer fetched successfully");
  } catch (error) {
    next(error);
  }
};

// PUT /api/dealers/admin/:id/approve
export const approveDealerController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const dealer = await approveDealer(id);
    successResponse(res, dealer, "Dealer approved");
  } catch (error) {
    next(error);
  }
};

// PUT /api/dealers/admin/:id/reject
export const rejectDealerController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const dealer = await rejectDealer(id, reason);
    successResponse(res, dealer, "Dealer rejected");
  } catch (error) {
    next(error);
  }
};

// POST /api/dealers/login

export const loginDealerController = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      const error = new Error("Email and password are required");
      error.statusCode = 400;
      throw error;
    }
    const result = await loginDealer(email, password);
    successResponse(res, result, "Login Successful");
  } catch (error) {
    next(error);
  }
};

// GET /api/dealers/profile
export const getProfileController = async (req, res, next) => {
  try {
    const dealer_id = req.user?.dealerId || req.user?.dealer_id;
    const profile = await getMyProfile(dealer_id);
    successResponse(res, profile, "Profile fetched successfully");
  } catch (error) {
    next(error);
  }
};

// PUT /api/dealers/profile
export const updateProfileController = async (req, res, next) => {
  try {
    const dealer_id = req.user?.dealerId || req.user?.dealer_id;
    const profile = await updateMyProfile(dealer_id, req.body);
    successResponse(res, profile, "Profile updated successfully");
  } catch (error) {
    next(error);
  }
};

// POST /api/dealers/profile/change-password
export const changePasswordController = async (req, res, next) => {
  try {
    const dealer_id = req.user?.dealerId || req.user?.dealer_id;
    const { current_password, new_password } = req.body;
    const result = await changeMyPassword(dealer_id, current_password, new_password);
    successResponse(res, result, "Password changed successfully");
  } catch (error) {
    next(error);
  }
};
