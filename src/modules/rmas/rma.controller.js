import { successResponse } from "../../common/utils/response.util.js";
import {
  createRma,
  getRmaById,
  getRmaDetail,
  getRmasByDealerId,
  getAllRmas,
  approveRma,
  rejectRma,
  getDashboardStats,
  getRecentRmas,
  getShippingEstimateForDealer,
} from "./rma.service.js";
import { getShipmentsByRmaId } from "../shipments/shipment.service.js";
import { getRepairByRmaId } from "../repairs/repair.service.js";

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
      pickup_same_as_profile,
      pickup_address_line1,
      pickup_city,
      pickup_state,
      pickup_pincode,
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
      pickup_same_as_profile,
      pickup_address_line1,
      pickup_city,
      pickup_state,
      pickup_pincode,
    });
    successResponse(res, rma, "RMA created successfully", 201);
  } catch (error) {
    next(error);
  }
};

// GET /api/rmas/:id  (id may be the UUID or the rma_number, e.g. "RMA-2026-000123")
export const getRmaByIdController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const dealer_id = req.user?.dealerId || req.user?.dealer_id;
    const rma = await getRmaDetail(id, dealer_id);
    successResponse(res, rma, "RMA fetched successfully");
  } catch (error) {
    next(error);
  }
};

// GET /api/rmas/:id/shipments
export const getRmaShipmentsController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const dealer_id = req.user?.dealerId || req.user?.dealer_id;
    await getRmaById(id, dealer_id); // 404s if missing, 403s if not owned by the caller
    const shipments = await getShipmentsByRmaId(id);
    successResponse(res, shipments, "Shipments fetched successfully");
  } catch (error) {
    next(error);
  }
};

// GET /api/rmas/:id/repair
export const getRmaRepairController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const dealer_id = req.user?.dealerId || req.user?.dealer_id;
    await getRmaById(id, dealer_id); // 404s if missing, 403s if not owned by the caller
    const repair = await getRepairByRmaId(id);
    successResponse(res, repair, "Repair fetched successfully");
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/rmas/:id  (id may be the UUID or the rma_number)
export const getAdminRmaByIdController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const rma = await getRmaDetail(id);
    successResponse(res, rma, "RMA fetched successfully");
  } catch (error) {
    next(error);
  }
};

// GET /api/dealers/dashboard/stats
export const getDashboardStatsController = async (req, res, next) => {
  try {
    const dealer_id = req.user?.dealerId || req.user?.dealer_id;
    const stats = await getDashboardStats(dealer_id);
    successResponse(res, stats, "Dashboard stats fetched successfully");
  } catch (error) {
    next(error);
  }
};

// GET /api/dealers/dashboard/recent-rmas
export const getRecentRmasController = async (req, res, next) => {
  try {
    const dealer_id = req.user?.dealerId || req.user?.dealer_id;
    const rmas = await getRecentRmas(dealer_id);
    successResponse(res, rmas, "Recent RMAs fetched successfully");
  } catch (error) {
    next(error);
  }
};

// GET /api/rmas/dealers/:dealer_id/rmas
export const getRmasByDealerIdController = async (req, res, next) => {
  try {
    const { status } = req.query;
    const dealer_id = req.user.dealer_id;
    const rmas = await getRmasByDealerId(dealer_id, status);
    successResponse(res, rmas, "RMAs fetched successfully");
  } catch (error) {
    next(error);
  }
};

// GET /api/rmas/admin?status=PENDING&dealer_id=xyz
export const getAllRmasController = async (req, res, next) => {
  try {
    const { status, dealerId } = req.query;

    const rmas = await getAllRmas(status, dealerId);
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

//////////////////////////////////////// GET SHIPPING ESTIMATES
// GET /api/rmas/shipping-estimate

export const getShippingEstimateForDealerController = async (
  req,
  res,
  next,
) => {
  try {
    const dealer_id = req.user?.dealerId || req.user?.dealer_id;
    console.log(dealer_id);

    const estimate = await getShippingEstimateForDealer(dealer_id);
    console.log(estimate);

    successResponse(res, estimate, "Shipping estimate fetched successfully");
  } catch (error) {
    next(error);
  }
};
