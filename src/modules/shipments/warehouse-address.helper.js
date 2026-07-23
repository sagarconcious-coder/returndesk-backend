import { registerPickupLocation } from "../../common/services/shiprocket.service.js";

// The Aeidth warehouse — fixed physical address items are repaired at.
// It's the delivery destination for INBOUND shipments (dealer -> aeidth)
// and the pickup location for OUTBOUND shipments (aeidth -> dealer).
export const getWarehouseAddress = () => ({
  name: process.env.WAREHOUSE_NAME,
  phone: process.env.WAREHOUSE_PHONE,
  email: process.env.WAREHOUSE_EMAIL,
  address_line1: process.env.WAREHOUSE_ADDRESS_LINE1,
  city: process.env.WAREHOUSE_CITY,
  state: process.env.WAREHOUSE_STATE,
  pincode: process.env.WAREHOUSE_PINCODE,
});

// In-memory cache of the warehouse's registered Shiprocket pickup_location
// nickname — same lifetime as the auth token cache in shiprocket.service.js.
// The warehouse address is a fixed constant (set via env vars), so
// re-registering it on every server restart is harmless and self-healing.
let cachedWarehousePickupLocation = null;

export const resolveWarehousePickupLocation = async () => {
  if (cachedWarehousePickupLocation) {
    return cachedWarehousePickupLocation;
  }
  const registered = await registerPickupLocation(getWarehouseAddress());
  cachedWarehousePickupLocation = registered.pickup_location;
  return cachedWarehousePickupLocation;
};
