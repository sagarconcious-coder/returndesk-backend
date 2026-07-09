import pool from "../../config/db.js";

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

//////////////////////////////////////// 2) GET ALL SHIPMENTS FOR AN RMA
export const getShipmentsByRmaId = async (rma_id) => {
  const result = await pool.query(
    `SELECT * FROM rma_shipments WHERE rma_id = $1 ORDER BY created_at DESC`,
    [rma_id],
  );
  return result.rows;
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
