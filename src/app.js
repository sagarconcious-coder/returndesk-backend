import express from "express";
import helmet from "helmet";
import cors from "cors";
import dealerRoutes from "./modules/dealers/dealers.routes.js";
import adminDealerRoutes from "./modules/dealers/admin.dealer.routes.js";
import rmaRoutes from "./modules/rmas/rma.routes.js";
import adminRmaRoutes from "./modules/rmas/admin.rma.routes.js";
import uploadsRoutes from "./modules/uploads/uploads.routes.js";
import adminRoutes from "./modules/admins/admin.routes.js";
import notificationRoutes from "./modules/notifications/notification.routes.js";
import adminNotificationRoutes from "./modules/notifications/admin.notification.routes.js";
import repairRoutes from "./modules/repairs/repair.routes.js";
import shipmentRoutes from "./modules/shipments/shipment.routes.js";
import { errorHandler } from "./common/middleware/error.middleware.js";
import pool from "./config/db.js";
import { corsOriginCheck } from "./config/cors.js";

const app = express();

// Middlewares
app.use(
  cors({
    origin: corsOriginCheck,
    credentials: true,
  }),
);
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes

///////////////////////////// 0) Health check — for load balancers / container orchestrators.
// Verifies the DB is actually reachable, not just that the process is running.
app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.status(200).json({ success: true, status: "ok" });
  } catch (error) {
    res.status(503).json({ success: false, status: "unavailable" });
  }
});

///////////////////////////// 1) Routes for dealers
app.use("/api/dealers", dealerRoutes);
app.use("/api/admin/dealers", adminDealerRoutes);

/////////////////////////////  2) Routes for RMA
app.use("/api/admin/rmas", adminRmaRoutes);
app.use("/api/rmas", rmaRoutes);

/////////////////////////////   3) Routes for uploads
app.use("/api/uploads", uploadsRoutes);

/////////////////////////////   3b) Routes for repairs (admin)
app.use("/api/admin/repairs", repairRoutes);

/////////////////////////////   3c) Routes for shipments (admin)
app.use("/api/admin/shipments", shipmentRoutes);

/////////////////// Admin Routes
app.use("/api/admin", adminRoutes);

/////////////////////////////   4) Routes for notifications
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin/notifications", adminNotificationRoutes);

// Global error handler — must be last
app.use(errorHandler);

export default app;
