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
import repairRoutes from "./modules/repairs/repair.routes.js";
import shipmentRoutes from "./modules/shipments/shipment.routes.js";
import { errorHandler } from "./common/middleware/error.middleware.js";

const app = express();

// Middlewares
app.use(
  cors({
    origin: (origin, callback) => {
      // allow requests with no origin (mobile apps, curl) and any local network
      if (
        !origin ||
        origin.match(/^http:\/\/(localhost|192\.168\.\d+\.\d+)(:\d+)?$/)
      ) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes

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

// Global error handler — must be last
app.use(errorHandler);

export default app;
