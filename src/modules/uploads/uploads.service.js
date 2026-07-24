import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import s3 from "../../config/s3.js";
import { env } from "../../config/env.js";

export const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;

// RMA attachments are evidence photos/videos/PDFs of the defective product —
// matches the frontend's <input accept="image/*,.pdf,.mp4,.mov">. Enforced
// server-side too: an unrestricted content_type on a public-bucket presigned
// PUT lets a caller upload e.g. text/html and get back a public URL serving
// attacker-controlled HTML/JS from the bucket's own origin (stored XSS).
const ALLOWED_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
  "application/pdf",
  "video/mp4",
  "video/quicktime",
]);

const sanitizeFileName = (fileName) => {
  const baseName = fileName.split(/[\\/]/).pop() || "upload";
  return baseName.replace(/[^a-zA-Z0-9._-]/g, "_");
};

export const createPresignedUpload = async (
  dealerId,
  fileName,
  contentType,
) => {
  if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
    const error = new Error(
      `Unsupported file type: ${contentType}. Allowed: images, PDF, MP4/MOV video.`,
    );
    error.statusCode = 400;
    throw error;
  }
  const safeFileName = sanitizeFileName(fileName);
  const key = `rma-attachments/${dealerId}/${randomUUID()}-${safeFileName}`;
  const command = new PutObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: key,
    ContentType: contentType,
  });
  const upload_url = await getSignedUrl(s3, command, { expiresIn: 300 });
  const file_url = `${env.S3_PUBLIC_URL}/${key}`;
  return { upload_url, file_url, key };
};
