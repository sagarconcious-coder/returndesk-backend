import "dotenv/config";
import app from "./src/app.js";
import pool from "./src/config/db.js";
import logger from "./src/config/logger.js";
import { env } from "./src/config/env.js";

const startServer = async () => {
  try {
    // Validate DB connection before accepting traffic
    await pool.query("SELECT NOW()");
    logger.info("Database connected");

    app.listen(env.PORT, () => {
      logger.info(`Server running on port ${env.PORT} [${env.NODE_ENV}]`);
    });
  } catch (error) {
    logger.error(`Startup failed: ${error.message}`);
    process.exit(1);
  }
};

startServer();
