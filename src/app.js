import express from "express";
import helmet from "helmet";
import cors from "cors";
import dealerRoutes from "./modules/dealers/dealers.routes.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();

// Middlewares
app.use(cors());
app.use(helmet());
app.use(express.json());

// Routes
app.use("/api/dealers", dealerRoutes);

// Global error handler (MUST be last)
app.use(errorHandler);

export default app;
