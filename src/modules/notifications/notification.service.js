import logger from "../../config/logger.js";
import { getIO } from "../../config/socket.js";
import {
  NOTIFICATION_TYPE,
  NOTIFICATION_RECIPIENT_ROLE,
} from "../../common/constants/status.constants.js";
import {
  createNotification,
  getNotificationsByDealerId as getNotificationsByDealerIdFromRepo,
  markNotificationRead as markNotificationReadInRepo,
  markAllNotificationsRead as markAllNotificationsReadInRepo,
  getAdminNotifications as getAdminNotificationsFromRepo,
  markAdminNotificationRead as markAdminNotificationReadInRepo,
  markAllAdminNotificationsRead as markAllAdminNotificationsReadInRepo,
} from "./notification.repository.js";

// notifyDealer(dealer_id, type, title, message, reference_id)
// → internal helper: creates a notification row, but never throws —
//   a notification failure must not break the caller's main flow (e.g. RMA approval)
const notifyDealer = async ({ dealer_id, type, title, message, reference_id }) => {
  try {
    const notification = await createNotification({
      dealer_id,
      recipient_role: NOTIFICATION_RECIPIENT_ROLE.DEALER,
      type,
      title,
      message,
      reference_id,
    });
    getIO()?.to(`dealer:${dealer_id}`).emit("notification:new", notification);
  } catch (error) {
    logger.error(`Failed to create notification for dealer ${dealer_id}: ${error.message}`);
  }
};

// notifyAdmins(type, title, message, reference_id)
// → same as notifyDealer but broadcasts to every admin (recipient_role = ADMIN, dealer_id = null)
const notifyAdmins = async ({ type, title, message, reference_id }) => {
  try {
    const notification = await createNotification({
      dealer_id: null,
      recipient_role: NOTIFICATION_RECIPIENT_ROLE.ADMIN,
      type,
      title,
      message,
      reference_id,
    });
    getIO()?.to("admins").emit("notification:new", notification);
  } catch (error) {
    logger.error(`Failed to create admin notification: ${error.message}`);
  }
};

// A) notifyRmaApproved(rma)
// → called from rma.service.js after an RMA is approved
export const notifyRmaApproved = (rma) =>
  notifyDealer({
    dealer_id: rma.dealer_id,
    type: NOTIFICATION_TYPE.RMA_APPROVED,
    title: "RMA Approved",
    message: `Your RMA ${rma.rma_number} has been approved.`,
    reference_id: rma.id,
  });

// B) notifyRmaRejected(rma)
// → called from rma.service.js after an RMA is rejected
export const notifyRmaRejected = (rma) =>
  notifyDealer({
    dealer_id: rma.dealer_id,
    type: NOTIFICATION_TYPE.RMA_REJECTED,
    title: "RMA Rejected",
    message: `Your RMA ${rma.rma_number} has been rejected.${rma.rejection_reason ? ` Reason: ${rma.rejection_reason}` : ""}`,
    reference_id: rma.id,
  });

// C) notifyRepairStarted(rma)
// → called from repair.service.js when a repair begins
export const notifyRepairStarted = (rma) =>
  notifyDealer({
    dealer_id: rma.dealer_id,
    type: NOTIFICATION_TYPE.REPAIR_STARTED,
    title: "Repair Started",
    message: `Repair has started for your RMA ${rma.rma_number}.`,
    reference_id: rma.id,
  });

// D) notifyRepairCompleted(rma)
// → called from repair.service.js when a repair is marked complete
export const notifyRepairCompleted = (rma) =>
  notifyDealer({
    dealer_id: rma.dealer_id,
    type: NOTIFICATION_TYPE.REPAIR_COMPLETED,
    title: "Repair Completed",
    message: `Repair for your RMA ${rma.rma_number} is complete.`,
    reference_id: rma.id,
  });

// E) notifyRepairUnrepairable(rma)
// → called from repair.service.js when an item is found unrepairable
export const notifyRepairUnrepairable = (rma) =>
  notifyDealer({
    dealer_id: rma.dealer_id,
    type: NOTIFICATION_TYPE.REPAIR_UNREPAIRABLE,
    title: "Repair Update",
    message: `The item for your RMA ${rma.rma_number} was found to be unrepairable.`,
    reference_id: rma.id,
  });

// F) notifyShipmentUpdated(rma, shipment)
// → called from shipment.service.js whenever a shipment's status changes
export const notifyShipmentUpdated = (rma, shipment) =>
  notifyDealer({
    dealer_id: rma.dealer_id,
    type: NOTIFICATION_TYPE.SHIPMENT_UPDATED,
    title: "Shipment Update",
    message: `Shipment for your RMA ${rma.rma_number} is now ${shipment.status}.`,
    reference_id: rma.id,
  });

// F2) notifyAdminNewRma(rma)
// → called from rma.service.js right after a dealer submits a new RMA
export const notifyAdminNewRma = (rma) =>
  notifyAdmins({
    type: NOTIFICATION_TYPE.RMA_CREATED,
    title: "New RMA Submitted",
    message: `RMA ${rma.rma_number} was submitted and is awaiting approval.`,
    reference_id: rma.id,
  });

// G) getMyNotifications(dealer_id, unreadOnly)
// → returns a dealer's notifications, optionally filtered to unread only
export const getMyNotifications = async (dealer_id, unreadOnly) => {
  return getNotificationsByDealerIdFromRepo(dealer_id, unreadOnly);
};

// H) markNotificationRead(id, dealer_id)
// → marks a single notification as read (scoped to the owning dealer)
export const markNotificationRead = async (id, dealer_id) => {
  const notification = await markNotificationReadInRepo(id, dealer_id);
  if (!notification) {
    const error = new Error("Notification not found");
    error.statusCode = 404;
    throw error;
  }
  return notification;
};

// I) markAllNotificationsRead(dealer_id)
// → marks every unread notification for a dealer as read
export const markAllNotificationsRead = async (dealer_id) => {
  await markAllNotificationsReadInRepo(dealer_id);
};

// J) getAdminNotifications(unreadOnly)
// → returns all admin-facing notifications, optionally filtered to unread only
export const getAdminNotifications = async (unreadOnly) => {
  return getAdminNotificationsFromRepo(unreadOnly);
};

// K) markAdminNotificationRead(id)
// → marks a single admin notification as read
export const markAdminNotificationRead = async (id) => {
  const notification = await markAdminNotificationReadInRepo(id);
  if (!notification) {
    const error = new Error("Notification not found");
    error.statusCode = 404;
    throw error;
  }
  return notification;
};

// L) markAllAdminNotificationsRead()
// → marks every unread admin notification as read
export const markAllAdminNotificationsRead = async () => {
  await markAllAdminNotificationsReadInRepo();
};
