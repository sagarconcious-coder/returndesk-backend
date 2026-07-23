import {
  RMA_STATUS,
  REPAIR_STATUS,
  SHIPMENT_DIRECTION,
  SHIPMENT_STATUS,
} from "../../common/constants/status.constants.js";

// Frontend-facing status labels, derived from RMA + repair + shipment state
// (the frontend was built against a richer status vocabulary than the raw RMA_STATUS enum)
export const deriveStatusLabel = (rma, repair, shipments) => {
  if (rma.status === RMA_STATUS.PENDING) return "Pending Approval";
  if (rma.status === RMA_STATUS.REJECTED) return "Rejected";

  const outbound = shipments.find(
    (s) => s.direction === SHIPMENT_DIRECTION.OUTBOUND,
  );
  if (outbound?.status === SHIPMENT_STATUS.DELIVERED) return "Completed";

  if (repair?.status === REPAIR_STATUS.PENDING)
    return "In Aeidth, Repair Pending";
  if (repair?.status === REPAIR_STATUS.IN_PROGRESS) return "Under Repair";
  if (
    repair?.status === REPAIR_STATUS.COMPLETED ||
    repair?.status === REPAIR_STATUS.UNREPAIRABLE
  ) {
    return "In Progress"; // repaired, awaiting/undergoing return shipment
  }

  const inbound = shipments.find(
    (s) => s.direction === SHIPMENT_DIRECTION.INBOUND,
  );
  if (inbound?.status === SHIPMENT_STATUS.DELIVERED) return "In Aeidth";
  if (inbound?.status === SHIPMENT_STATUS.OUT_FOR_DELIVERY)
    return "Out for Delivery";
  if (inbound?.status === SHIPMENT_STATUS.IN_TRANSIT) return "In Transit";
  if (inbound?.status === SHIPMENT_STATUS.PICKED_UP) return "Picked Up";
  if (inbound?.status === SHIPMENT_STATUS.FAILED_DELIVERY)
    return "Delivery Failed";
  if (inbound?.status === SHIPMENT_STATUS.SCHEDULED) return "Pickup Scheduled";
  if (inbound) return "Pending Pickup";

  return "Approved";
};

const formatDate = (date) => {
  if (!date) return null;
  return new Date(date).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const shipmentStatusLabel = (status) => {
  const map = {
    NOT_SHIPPED: "Pending",
    SCHEDULED: "Pickup Scheduled",
    PICKED_UP: "Picked Up",
    IN_TRANSIT: "In Transit",
    OUT_FOR_DELIVERY: "Out for Delivery",
    DELIVERED: "Delivered",
    FAILED_DELIVERY: "Failed Delivery",
  };
  return map[status] || status;
};

// Serializes a shipment row into the shape the frontend's shipments/tracking UI expects
export const serializeShipment = (shipment, rma_number) => ({
  id: shipment.id,
  shipment_number: `SHP-${shipment.id.slice(0, 8).toUpperCase()}`,
  rma_number,
  courier: shipment.carrier,
  tracking: shipment.tracking_number,
  status: shipmentStatusLabel(shipment.status),
  shipped_on: formatDate(shipment.shipped_at),
  eta: formatDate(shipment.delivered_at),
  direction: shipment.direction,
  // raw fields for admin UI logic (e.g. deciding whether to show "Retry Pickup"/"Retry Shipment")
  awb_code: shipment.awb_code,
  pickup_error: shipment.pickup_error,
  needs_pickup_retry:
    shipment.status === SHIPMENT_STATUS.NOT_SHIPPED && !shipment.awb_code,
  return_address_same_as_pickup: shipment.return_address_same_as_pickup,
  return_address_line1: shipment.return_address_line1,
  return_address_city: shipment.return_address_city,
  return_address_state: shipment.return_address_state,
  return_address_pincode: shipment.return_address_pincode,
});

const attachmentType = (fileName, kind) => {
  if (kind === "audio") return "audio";
  const ext = (fileName.split(".").pop() || "").toLowerCase();
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) return "image";
  if (["mp4", "mov", "avi", "webm"].includes(ext)) return "video";
  return "pdf";
};

const serializeAttachment = (attachment) => ({
  name: attachment.file_name,
  url: attachment.file_url,
  type: attachmentType(attachment.file_name, attachment.kind),
});

// Builds a synthetic status_history timeline from RMA/repair/shipment timestamps —
// there's no dedicated audit-log table, so this is derived from the state that exists
const buildStatusHistory = (rma, repair, shipments) => {
  const history = [
    {
      date: formatDate(rma.created_at),
      status: "Submitted",
      description: "RMA submitted by dealer",
      by: "Dealer",
    },
  ];

  if (
    rma.status === RMA_STATUS.APPROVED ||
    rma.status === RMA_STATUS.REJECTED
  ) {
    history.push({
      date: formatDate(rma.updated_at),
      status: rma.status === RMA_STATUS.APPROVED ? "Approved" : "Rejected",
      description:
        rma.status === RMA_STATUS.APPROVED
          ? "RMA approved"
          : `RMA rejected${rma.rejection_reason ? `: ${rma.rejection_reason}` : ""}`,
      by: "Admin",
    });
  }

  for (const shipment of shipments) {
    const leg =
      shipment.direction === SHIPMENT_DIRECTION.INBOUND
        ? "Inbound"
        : "Outbound";
    if (shipment.status_history?.length) {
      for (const entry of shipment.status_history) {
        history.push({
          date: formatDate(entry.created_at),
          status: shipmentStatusLabel(entry.status),
          description: `${leg} shipment: ${shipmentStatusLabel(entry.status)}`,
          by: "System",
        });
      }
    } else {
      // Fallback for shipments recorded before shipment_status_history existed
      if (shipment.shipped_at) {
        history.push({
          date: formatDate(shipment.shipped_at),
          status: "Shipped",
          description: `${leg} shipment picked up`,
          by: "System",
        });
      }
      if (shipment.delivered_at) {
        history.push({
          date: formatDate(shipment.delivered_at),
          status: "Delivered",
          description: `${leg} shipment delivered`,
          by: "System",
        });
      }
    }
  }

  if (repair?.started_at) {
    history.push({
      date: formatDate(repair.started_at),
      status: "Under Repair",
      description: `Repair started${repair.technician_name ? ` by ${repair.technician_name}` : ""}`,
      by: "Admin",
    });
  }
  if (repair?.completed_at) {
    history.push({
      date: formatDate(repair.completed_at),
      status:
        repair.status === REPAIR_STATUS.UNREPAIRABLE
          ? "Unrepairable"
          : "Repair Completed",
      description: repair.repair_notes || "",
      by: "Admin",
    });
  }

  return history.sort((a, b) => new Date(a.date) - new Date(b.date));
};

// Serializes a bare RMA row for list views (my-rmas, admin list) — no sub-resources
export const serializeRmaSummary = (rma, repair, shipments) => {
  const inbound = shipments.find(
    (s) => s.direction === SHIPMENT_DIRECTION.INBOUND,
  );
  const needsPickupRetry =
    inbound &&
    inbound.status === SHIPMENT_STATUS.NOT_SHIPPED &&
    !inbound.awb_code;

  return {
    id: rma.id,
    rma_number: rma.rma_number,
    product: rma.product_name,
    serial_number: rma.product_serial,
    status: deriveStatusLabel(rma, repair, shipments),
    created_at: formatDate(rma.created_at),
    needs_pickup_retry: !!needsPickupRetry,
    inbound_shipment_id: needsPickupRetry ? inbound.id : null,
    pickup_error: needsPickupRetry ? inbound.pickup_error : null,
  };
};

// Serializes a full RMA detail response, embedding repair/shipments/attachments
export const serializeRmaDetail = (
  rma,
  { repair, shipments, attachments, pickup_address },
) => ({
  rma_number: rma.rma_number,
  status: deriveStatusLabel(rma, repair, shipments),
  product: rma.product_name,
  serial_number: rma.product_serial,
  purchase_date: rma.purchase_date ? formatDate(rma.purchase_date) : null,
  warranty_status: rma.warranty_status,
  issue_type: rma.issue_type,
  issue_description: rma.issue_description,
  created_at: formatDate(rma.created_at),
  updated_at: formatDate(rma.updated_at),
  status_history: buildStatusHistory(rma, repair, shipments),
  shipments: shipments.map((s) => serializeShipment(s, rma.rma_number)),
  attachments: attachments.map(serializeAttachment),
  repair: repair ? serializeRepair(repair) : null,
  pickup_address: pickup_address || null,
});

const serializeRepair = (repair) => ({
  status: repair.status,
  technician_name: repair.technician_name,
  diagnosis: repair.diagnosis,
  parts_used: repair.parts_used,
  repair_notes: repair.repair_notes,
  started_at: formatDate(repair.started_at),
  completed_at: formatDate(repair.completed_at),
});
