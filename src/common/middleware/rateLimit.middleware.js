import rateLimit from "express-rate-limit";

const jsonHandler = (req, res, _next, options) => {
  res.status(options.statusCode).json({
    success: false,
    message: options.message,
  });
};

// Login endpoints (dealer + admin): 10 attempts per 15 minutes per IP.
// Generous enough for a real user mistyping a password a few times, tight
// enough to make credential-stuffing/brute-force impractical.
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many login attempts — please try again later",
  handler: jsonHandler,
});

// OTP request: 5 per hour per IP. The service layer already enforces a
// 60s cooldown between sends for a given email; this caps total volume
// per IP across different emails (e.g. spamming many inboxes).
export const otpRequestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many OTP requests — please try again later",
  handler: jsonHandler,
});

// OTP verify: 10 per 15 minutes per IP. The service layer separately caps
// wrong attempts per OTP code at 5; this bounds overall verify traffic
// per IP (e.g. cycling through many emails).
export const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many OTP verification attempts — please try again later",
  handler: jsonHandler,
});