import logger from "../config/logger.js";

export const errorHandler = (err, req, res, next) => {
  logger.error(err.message);

  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server error";

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};
