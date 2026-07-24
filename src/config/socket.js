import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import logger from "./logger.js";
import { corsOriginCheck } from "./cors.js";

let io = null;

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: corsOriginCheck,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Authentication required"));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (error) {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    const { role, dealer_id } = socket.user;
    if (role === "dealer" && dealer_id) {
      socket.join(`dealer:${dealer_id}`);
    } else if (role === "admin" || role === "super_admin") {
      socket.join("admins");
    }
    logger.info(`Socket connected: ${socket.id} (role=${role})`);
  });

  return io;
};

export const getIO = () => io;