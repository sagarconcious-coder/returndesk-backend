import "dotenv/config";
import http from "http";
import app from "./src/app.js";
import pool from "./src/config/db.js";
import logger from "./src/config/logger.js";
import { env } from "./src/config/env.js";
import { initSocket } from "./src/config/socket.js";

// A single uncaught async error anywhere in the app must not silently crash
// the process (Node terminates on unhandled rejections by default since v15)
// or leave the server in a half-dead state with no log trail.
process.on("unhandledRejection", (reason) => {
  logger.error(`Unhandled promise rejection: ${reason?.stack || reason}`);
});

process.on("uncaughtException", (error) => {
  logger.error(`Uncaught exception: ${error?.stack || error}`);
  // Not exiting: crashing immediately on any uncaught throw is more likely
  // to cause an outage than the (unknown) error itself, given this process
  // has no supervisor/process manager restarting it configured yet.
});

let httpServer;

const shutdown = async (signal) => {
  logger.info(`${signal} received — shutting down gracefully`);
  if (httpServer) {
    await new Promise((resolve) => httpServer.close(resolve));
  }
  await pool.end();
  logger.info("Shutdown complete");
  process.exit(0);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

const startServer = async () => {
  try {
    // Validate DB connection before accepting traffic
    await pool.query("SELECT NOW()");
    logger.info("Database connected");

    httpServer = http.createServer(app);
    initSocket(httpServer);

    httpServer.listen(env.PORT, () => {
      logger.info(`Server running on port ${env.PORT} [${env.NODE_ENV}]`);
    });
  } catch (error) {
    logger.error(`Startup failed: ${error.message}`);
    process.exit(1);
  }
};

startServer();
