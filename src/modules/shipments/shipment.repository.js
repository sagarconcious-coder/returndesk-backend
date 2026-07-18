import pool from "../../config/db.js";

///////////////////////////////////////////// 0) Create INBOUND Shipment for Pickup

export const createShipmentForPickup = async (
  rma_id,
  pickup_request_id,
  client = pool,
) => {
  const result = await client.query(
    `
      INSERT INTO rma_shipments (rma_id,direction,pickup_request_id)
      VALUES ($1,'INBOUND',$2) RETURNING *
    `,
    [rma_id, pickup_request_id],
  );
  return result.rows[0];
};

///////////////////////////////////////////// 0b) Get existing INBOUND shipment for an RMA (if any)

export const getInboundShipmentByRmaId = async (rma_id, client = pool) => {
  const result = await client.query(
    `SELECT * FROM rma_shipments WHERE rma_id = $1 AND direction = 'INBOUND'`,
    [rma_id],
  );
  return result.rows[0];
};

///////////////////////////////////////////// 1) Function to create shipment
export const createShipment = async (rma_id, direction) => {
  const result = await pool.query(
    `
            INSERT INTO rma_shipments
             (rma_id,direction) VALUES ($1,$2) RETURNING *
        `,
    [rma_id, direction],
  );

  return result.rows[0];
};

//////////////////////////////////////// 1b) GET ALL SHIPMENTS (admin list), optionally filtered by status/direction
export const getAllShipments = async (status = null, direction = null) => {
  const params = [];
  const conditions = [];
  if (status) {
    params.push(status);
    conditions.push(`rma_shipments.status = $${params.length}`);
  }
  if (direction) {
    params.push(direction);
    conditions.push(`rma_shipments.direction = $${params.length}`);
  }
  let query = `
    SELECT rma_shipments.*, rmas.rma_number, dealers.business_name
    FROM rma_shipments
    JOIN rmas ON rmas.id = rma_shipments.rma_id
    JOIN dealers ON dealers.id = rmas.dealer_id
  `;
  if (conditions.length) {
    query += ` WHERE ${conditions.join(" AND ")}`;
  }
  query += ` ORDER BY rma_shipments.created_at DESC`;
  const result = await pool.query(query, params);
  return result.rows;
};

//////////////////////////////////////// 2) GET ALL SHIPMENTS FOR AN RMA
export const getShipmentsByRmaId = async (rma_id) => {
  const result = await pool.query(
    `SELECT * FROM rma_shipments WHERE rma_id = $1 ORDER BY created_at DESC`,
    [rma_id],
  );
  return result.rows;
};

//////////////////////////////////////// 2b) GET ALL SHIPMENTS FOR A DEALER (joined via rmas)
export const getShipmentsByDealerId = async (dealer_id) => {
  const result = await pool.query(
    `SELECT rma_shipments.*, rmas.rma_number
     FROM rma_shipments
     JOIN rmas ON rmas.id = rma_shipments.rma_id
     WHERE rmas.dealer_id = $1
     ORDER BY rma_shipments.created_at DESC`,
    [dealer_id],
  );
  return result.rows;
};

//////////////////////////////////////// 2c) GET SHIPMENT BY TRACKING NUMBER, SCOPED TO A DEALER
export const getShipmentByTrackingNumber = async (
  dealer_id,
  tracking_number,
) => {
  const result = await pool.query(
    `SELECT rma_shipments.*, rmas.rma_number
     FROM rma_shipments
     JOIN rmas ON rmas.id = rma_shipments.rma_id
     WHERE rmas.dealer_id = $1 AND rma_shipments.tracking_number = $2`,
    [dealer_id, tracking_number],
  );
  return result.rows[0];
};

//////////////////////////////////////// 3) GET SINGLE SHIPMENT BY ID
export const getShipmentById = async (id) => {
  const result = await pool.query(`SELECT * FROM rma_shipments WHERE id = $1`, [
    id,
  ]);
  return result.rows[0];
};

//////////////////////////////////////// 4) UPDATE SHIPMENT (carrier, tracking, status)
export const updateShipment = async (id, fields) => {
  const { carrier, tracking_number, status, shipped_at, delivered_at } = fields;
  const result = await pool.query(
    `
    UPDATE rma_shipments
    SET carrier = COALESCE($1, carrier),
        tracking_number = COALESCE($2, tracking_number),
        status = COALESCE($3, status),
        shipped_at = COALESCE($4, shipped_at),
        delivered_at = COALESCE($5, delivered_at),
        updated_at = NOW()
    WHERE id = $6
    RETURNING *
    `,
    [
      carrier ?? null,
      tracking_number ?? null,
      status ?? null,
      shipped_at ?? null,
      delivered_at ?? null,
      id,
    ],
  );
  return result.rows[0];
};

//////////////////////////////////////// 4b) STORE SHIPROCKET ORDER RESULT on a shipment
export const setShipmentShiprocketInfo = async (
  id,
  { shiprocket_shipment_id, awb_code },
  client = pool,
) => {
  const result = await client.query(
    `
    UPDATE rma_shipments
    SET shiprocket_shipment_id = COALESCE($1, shiprocket_shipment_id),
        awb_code = COALESCE($2, awb_code),
        updated_at = NOW()
    WHERE id = $3
    RETURNING *
    `,
    [shiprocket_shipment_id ?? null, awb_code ?? null, id],
  );
  return result.rows[0];
};

//////////////////////////////////////// 4c) STORE/CLEAR the last pickup failure reason on a shipment
// Pass a message to record a failure, or null/omit to clear it (e.g. once the AWB is finally assigned)
export const setShipmentPickupError = async (id, pickup_error = null) => {
  const result = await pool.query(
    `UPDATE rma_shipments SET pickup_error = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [pickup_error, id],
  );
  return result.rows[0];
};
