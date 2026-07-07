import express from "express";
import helmet from "helmet";
import cors from "cors";
import dealerRoutes from "./modules/dealers/dealers.routes.js";
import adminDealerRoutes from "./modules/dealers/admin.dealer.routes.js";
import rmaRoutes from "./modules/rmas/rma.routes.js";
import adminRmaRoutes from "./modules/rmas/admin.rma.routes.js";
import uploadsRoutes from "./modules/uploads/uploads.routes.js";
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
app.use("/api/dealers", dealerRoutes);
app.use("/api/admin/dealers", adminDealerRoutes);

app.use("/api/admin/rmas", adminRmaRoutes);
app.use("/api/rmas", rmaRoutes);

app.use("/api/uploads", uploadsRoutes);
// Global error handler — must be last
app.use(errorHandler);

export default app;
