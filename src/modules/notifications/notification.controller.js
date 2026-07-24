import { successResponse } from "../../common/utils/response.util.js";
import { NOTIFICATION_TYPE } from "../../common/constants/status.constants.js";
import {
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getAdminNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
} from "./notification.service.js";

// Backend notification types -> the small UI-type vocabulary the frontend renders icons/colors for
const UI_TYPE_MAP = {
  [NOTIFICATION_TYPE.RMA_APPROVED]: "approved",
  [NOTIFICATION_TYPE.RMA_REJECTED]: "rejected",
  [NOTIFICATION_TYPE.REPAIR_STARTED]: "pickup",
  [NOTIFICATION_TYPE.REPAIR_COMPLETED]: "completed",
  [NOTIFICATION_TYPE.REPAIR_UNREPAIRABLE]: "rejected",
  [NOTIFICATION_TYPE.SHIPMENT_UPDATED]: "pickup",
  [NOTIFICATION_TYPE.RMA_CREATED]: "new",
};

const serializeNotification = (n) => ({
  id: n.id,
  title: n.title,
  message: n.message,
  time: new Date(n.created_at).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }),
  type: UI_TYPE_MAP[n.type] || "pickup",
  read: n.is_read,
});

// GET /api/notifications?unread=true
export const getMyNotificationsController = async (req, res, next) => {
  try {
    const dealer_id = req.user?.dealerId || req.user?.dealer_id;
    const unreadOnly = req.query.unread === "true";
    const notifications = await getMyNotifications(dealer_id, unreadOnly);
    successResponse(res, notifications, "Notifications fetched successfully");
  } catch (error) {
    next(error);
  }
};

// GET /api/dealers/notifications
export const getMyNotificationsUiController = async (req, res, next) => {
  try {
    const dealer_id = req.user?.dealerId || req.user?.dealer_id;
    const notifications = await getMyNotifications(dealer_id, false);
    successResponse(
      res,
      notifications.map(serializeNotification),
      "Notifications fetched successfully",
    );
  } catch (error) {
    next(error);
  }
};

// POST /api/dealers/notifications/mark-read
export const markAllNotificationsReadUiController = async (req, res, next) => {
  try {
    const dealer_id = req.user?.dealerId || req.user?.dealer_id;
    await markAllNotificationsRead(dealer_id);
    successResponse(res, null, "All notifications marked as read");
  } catch (error) {
    next(error);
  }
};

// PUT /api/notifications/:id/read
export const markNotificationReadController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const dealer_id = req.user?.dealerId || req.user?.dealer_id;
    const notification = await markNotificationRead(id, dealer_id);
    successResponse(res, notification, "Notification marked as read");
  } catch (error) {
    next(error);
  }
};

// PUT /api/notifications/read-all
export const markAllNotificationsReadController = async (req, res, next) => {
  try {
    const dealer_id = req.user?.dealerId || req.user?.dealer_id;
    await markAllNotificationsRead(dealer_id);
    successResponse(res, null, "All notifications marked as read");
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/notifications
export const getAdminNotificationsController = async (req, res, next) => {
  try {
    const unreadOnly = req.query.unread === "true";
    const notifications = await getAdminNotifications(unreadOnly);
    successResponse(
      res,
      notifications.map(serializeNotification),
      "Notifications fetched successfully",
    );
  } catch (error) {
    next(error);
  }
};

// PUT /api/admin/notifications/:id/read
export const markAdminNotificationReadController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const notification = await markAdminNotificationRead(id);
    successResponse(res, notification, "Notification marked as read");
  } catch (error) {
    next(error);
  }
};

// PUT /api/admin/notifications/read-all
export const markAllAdminNotificationsReadController = async (req, res, next) => {
  try {
    await markAllAdminNotificationsRead();
    successResponse(res, null, "All notifications marked as read");
  } catch (error) {
    next(error);
  }
};
