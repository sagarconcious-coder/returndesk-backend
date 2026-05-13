import app from "./src/app.js";
import pool from "./src/config/db.js";
import logger from "./src/config/logger.js";

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await pool.query("SELECT NOW()");
    logger.info("Database Connected!");

    app.listen(PORT, () => {
      logger.info(`Server is running on PORT ${PORT}`);
    });
  } catch (error) {
    logger.error(error);
  }
};

startServer();
