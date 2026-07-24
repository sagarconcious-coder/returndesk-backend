import { env } from "./env.js";

const LOCAL_ORIGIN_RE = /^http:\/\/(localhost|192\.168\.\d+\.\d+)(:\d+)?$/;

// Shared between Express CORS (app.js) and Socket.io CORS (socket.js) so the
// two never drift. Always allows localhost/LAN (dev convenience); anything
// else must be explicitly listed in ALLOWED_ORIGINS (deployed frontend URLs).
export const corsOriginCheck = (origin, callback) => {
  if (!origin || LOCAL_ORIGIN_RE.test(origin) || env.ALLOWED_ORIGINS.includes(origin)) {
    callback(null, true);
  } else {
    callback(new Error("Not allowed by CORS"));
  }
};
