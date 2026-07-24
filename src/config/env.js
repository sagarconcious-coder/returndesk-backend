const required = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};

// Comma-separated list of extra allowed CORS origins for the deployed frontend,
// e.g. "https://app.returndesk.com,https://admin.returndesk.com". Optional —
// localhost/LAN origins are always allowed regardless, for local dev.
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export const env = {
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || "development",
  ALLOWED_ORIGINS,
  DATABASE_URL: required("DATABASE_URL"),
  JWT_SECRET: required("JWT_SECRET"),
  S3_ENDPOINT: process.env.S3_ENDPOINT, // optional — omit for real AWS, set for R2/MinIO
  S3_REGION: process.env.S3_REGION || "auto",
  S3_BUCKET: required("S3_BUCKET"),
  S3_ACCESS_KEY_ID: required("S3_ACCESS_KEY_ID"),
  S3_SECRET_ACCESS_KEY: required("S3_SECRET_ACCESS_KEY"),
  S3_PUBLIC_URL: required("S3_PUBLIC_URL"), // base URL used to build the public file_url, e.g. bucket's public domain or CDN
};
