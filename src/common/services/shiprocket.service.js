import axios from "axios";
import logger from "../../config/logger.js";

const BASE_URL = "https://apiv2.shiprocket.in/v1/external";

// In-memory token cache — Shiprocket tokens are valid for ~10 days, no need to log in every request

let cachedToken = null;
let tokenExpiresAt = 0;

const login = async () => {
  const response = await axios.post(`${BASE_URL}/auth/login`, {
    email: process.env.SHIPROCKET_EMAIL,
    password: process.env.SHIPROCKET_PASSWORD,
  });

  cachedToken = response.data.token;
  tokenExpiresAt = Date.now() + 9 * 24 * 60 * 60 * 1000;
  return cachedToken;
};

const getToken = async () => {
  if (cachedToken && tokenExpiresAt > Date.now()) {
    return cachedToken;
  }
  return login();
};

// Returns the cheapest available courier rate for a pickup → delivery pincode pair

export const getShippingEstimate = async ({
  pickupPincode,
  deliveryPincode,
  weight = 1,
}) => {
  logger.info("Running Shipping Estimate function");
  const token = await getToken();

  const response = await axios.get(`${BASE_URL}/courier/serviceability/`, {
    headers: { Authorization: `Bearer ${token}` },
    params: {
      pickup_postcode: pickupPincode,
      delivery_postcode: deliveryPincode,
      weight,
      cod: 0,
    },
  });

  const couriers = response.data?.data?.available_courier_companies || [];
  if (!couriers.length) {
    const error = new Error("No courier serviceability found for this route");
    error.statusCode = 422;
    throw error;
  }

  const cheapest = couriers.reduce((min, c) =>
    Number(c.rate) < Number(min.rate) ? c : min,
  );
  logger.info(
    `Shiprocket estimate: ${pickupPincode} -> ${deliveryPincode} = ₹${cheapest.rate} (${cheapest.courier_name})`,
  );

  return {
    rate: Number(cheapest.rate),
    courier_name: cheapest.courier_name,
    estimated_days: cheapest.estimated_delivery_days,
  };
};

// Registers a pickup address as a Shiprocket pickup location.
// address: { name, email, phone, address_line1, city, state, pincode }
// Returns the registered pickup_location nickname to reuse on future INBOUND orders.
export const registerPickupLocation = async (address) => {
  const token = await getToken();
  const pickup_location = `pickup-${Date.now()}`;

  try {
    await axios.post(
      `${BASE_URL}/settings/company/addpickup`,
      {
        pickup_location,
        name: address.name,
        email: address.email,
        phone: address.phone,
        address: address.address_line1,
        city: address.city,
        state: address.state,
        country: "India",
        pin_code: address.pincode,
      },
      { headers: { Authorization: `Bearer ${token}` } },
    );
  } catch (error) {
    logger.error(
      `Shiprocket addpickup failed: ${JSON.stringify(error.response?.data || error.message)}`,
    );
    throw error;
  }

  logger.info(`Shiprocket pickup location registered: ${pickup_location}`);
  return { pickup_location };
};

// Creates a Shiprocket adhoc order for a shipment, then assigns a courier/AWB.
// customer: { name, email, phone, address_line1, city, state, pincode } — the delivery address
export const createOrder = async ({ pickup_location, order_id, customer }) => {
  const token = await getToken();

  // Shiprocket requires first/last name as separate fields
  const nameParts = (customer.name || "").trim().split(/\s+/);
  const billing_customer_name = nameParts[0] || "Dealer";
  const billing_last_name =
    nameParts.length > 1 ? nameParts.slice(1).join(" ") : "NA";

  let orderRes;
  try {
    orderRes = await axios.post(
      `${BASE_URL}/orders/create/adhoc`,
      {
        order_id: String(order_id),
        order_date: new Date().toISOString().slice(0, 19).replace("T", " "),
        pickup_location,
        billing_customer_name,
        billing_last_name,
        billing_address: customer.address_line1,
        billing_city: customer.city,
        billing_pincode: customer.pincode,
        billing_state: customer.state,
        billing_country: "India",
        billing_email: customer.email,
        billing_phone: customer.phone,
        shipping_is_billing: true,
        order_items: [
          {
            name: "RMA Return Item",
            sku: "RMA-RETURN",
            units: 1,
            selling_price: 1,
          },
        ],
        payment_method: "Prepaid",
        sub_total: 1,
        length: 10,
        breadth: 10,
        height: 10,
        weight: 0.5,
      },
      { headers: { Authorization: `Bearer ${token}` } },
    );
  } catch (error) {
    logger.error(
      `Shiprocket orders/create/adhoc failed: ${JSON.stringify(error.response?.data || error.message)}`,
    );
    throw error;
  }

  const shipment_id = orderRes.data?.shipment_id;
  const shiprocket_order_id = orderRes.data?.order_id;
  if (!shipment_id) {
    throw new Error(
      `Shiprocket order creation did not return a shipment_id: ${JSON.stringify(orderRes.data)}`,
    );
  }

  const { awb_code, error: awbError } = await assignAwb(shipment_id);
  logger.info(
    `Shiprocket order created for ${order_id}: shipment_id=${shipment_id} awb_code=${awb_code}`,
  );

  return {
    shipment_id: String(shipment_id),
    order_id: shiprocket_order_id ? String(shiprocket_order_id) : null,
    awb_code,
    error: awbError,
  };
};

// Cancels a Shiprocket order (used when an admin cancels a pickup that was
// already requested). Takes Shiprocket's own order_id — NOT our order_id
// param above and NOT the shipment_id — that's what their /orders/cancel
// endpoint expects.
export const cancelOrder = async (shiprocket_order_id) => {
  const token = await getToken();

  try {
    await axios.post(
      `${BASE_URL}/orders/cancel`,
      { ids: [Number(shiprocket_order_id)] },
      { headers: { Authorization: `Bearer ${token}` } },
    );
  } catch (error) {
    logger.error(
      `Shiprocket orders/cancel failed: ${JSON.stringify(error.response?.data || error.message)}`,
    );
    throw error;
  }

  logger.info(`Shiprocket order cancelled: ${shiprocket_order_id}`);
};

// Assigns a courier/AWB to an already-created Shiprocket order (shipment_id).
// Split out so a retry that already has an order can skip re-creating it and
// just retry this step. Returns { awb_code, error } — Shiprocket can respond
// 200 OK but still fail to assign a courier (e.g. low wallet balance, no
// serviceable courier), so that failure reason is returned rather than thrown,
// for the caller to persist somewhere the admin can see it.
export const assignAwb = async (shipment_id) => {
  const token = await getToken();

  let awbRes;
  try {
    awbRes = await axios.post(
      `${BASE_URL}/courier/assign/awb`,
      { shipment_id },
      { headers: { Authorization: `Bearer ${token}` } },
    );
  } catch (error) {
    const message =
      error.response?.data?.message ||
      error.response?.data?.awb_assign_error ||
      error.message;
    logger.error(
      `Shiprocket courier/assign/awb failed: ${JSON.stringify(error.response?.data || error.message)}`,
    );
    return { awb_code: null, error: message };
  }

  const awb_code = awbRes.data?.response?.data?.awb_code || null;
  if (!awb_code) {
    const message =
      awbRes.data?.message ||
      awbRes.data?.response?.data?.awb_assign_error ||
      "Shiprocket did not assign a courier/AWB";
    logger.warn(
      `Shiprocket assign/awb returned no AWB for shipment ${shipment_id}: ${JSON.stringify(awbRes.data)}`,
    );
    return { awb_code: null, error: message };
  }
  return { awb_code, error: null };
};

// mitravaruntech@gmail.com
// @NZG3iG$j7!&x$F
// company name - seller
// 201305
