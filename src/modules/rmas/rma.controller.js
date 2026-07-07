import { successResponse } from "../../common/utils/response.util.js";
import {
  createRma,
  getRmaById,
  getRmasByDealerId,
  getAllRmas,
  approveRma,
  rejectRma,
} from "./rma.service.js";

// POST /api/rmas/create
export const createRmaController = async (req, res, next) => {
  const dealer_id = req.user?.dealerId || req.user?.dealer_id;
  try {
    const {
      product_serial,
      product_name,
      issue_type,
      issue_description,
      purchase_date,
      warranty_status,
      warranty_expiry,
      attachments,
    } = req.body;
    const rma = await createRma(dealer_id, {
      product_serial,
      product_name,
      issue_type,
      issue_description,
      purchase_date,
      warranty_status,
      warranty_expiry,
      attachments,
    });
    successResponse(res, rma, "RMA created successfully", 201);
  } catch (error) {
    next(error);
  }
};

// GET /api/rmas/:id
export const getRmaByIdController = async (req, res, next) => {
  try {
    const { id } = req.user.dealer_id;
    const rma = await getRmaById(id);
    successResponse(res, rma, "RMA fetched successfully");
  } catch (error) {
    next(error);
  }
};

// GET /api/rmas/dealers/:dealer_id/rmas
export const getRmasByDealerIdController = async (req, res, next) => {
  try {
    const { status } = req.query;
    const dealer_id = req.user.dealerId;
    const rmas = await getRmasByDealerId(dealer_id, status);
    successResponse(res, rmas, "RMAs fetched successfully");
  } catch (error) {
    next(error);
  }
};

// GET /api/rmas/admin
export const getAllRmasController = async (req, res, next) => {
  try {
    const { status } = req.query;
    const rmas = await getAllRmas(status);
    successResponse(res, rmas, "RMAs fetched successfully");
  } catch (error) {
    next(error);
  }
};

// PUT /api/rmas/admin/:id/approve
export const approveRmaController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const rma = await approveRma(id);
    successResponse(res, rma, "RMA approved");
  } catch (error) {
    next(error);
  }
};

// PUT /api/rmas/admin/:id/reject
export const rejectRmaController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const rma = await rejectRma(id, reason);
    successResponse(res, rma, "RMA rejected");
  } catch (error) {
    next(error);
  }
};
