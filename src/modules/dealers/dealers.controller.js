import {
  requestOtp,
  verifyOtp,
  registerDealer,
  getDealers,
  getDealerById,
  approveDealer,
  rejectDealer,
} from "./dealer.service.js";
// POST /api/dealers/request-otp

export const requestOtpController = async (req, res, next) => {
  try {
    const { mobile } = req.body;
    const result = await requestOtp(mobile);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
// POST /api/dealers/verify-otp

export const verifyOtpController = async (req, res, next) => {
  try {
    const { mobile, otp } = req.body;
    const result = await verifyOtp(mobile, otp);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
// POST /api/dealers/register

export const registerDealerController = async (req, res, next) => {
  try {
    const { token, ...data } = req.body;
    const result = await registerDealer(token, data);
    return res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};
// GET /api/admin/dealers

export const getDealersController = async (req, res, next) => {
  try {
    const { status } = req.query;
    const dealers = await getDealers(status);
    res.status(200).json(dealers);
  } catch (error) {
    next(error);
  }
};
// GET /api/admin/dealers/:id

export const getDealerByIdController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const dealer = await getDealerById(id);
    return res.status(200).json(dealer);
  } catch (error) {
    next(error);
  }
};
// PUT /api/admin/dealers/:id/approve

export const approveDealerController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const dealer = await approveDealer(id);
    res.status(200).json({ message: "Dealer approved", dealer });
  } catch (error) {
    next(error);
  }
};
// PUT api/admin/dealer/:id/reject
export const rejectDealerController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const dealer = await rejectDealer(id, req.body.reason);
    res.status(200).json({ message: "Dealer Rejected", dealer });
  } catch (error) {
    next(error);
  }
};
