import { successResponse } from "../../common/utils/response.util.js";
import {
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "./notification.service.js";

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
