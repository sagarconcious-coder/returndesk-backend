import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import s3 from "../../config/s3.js";
import { env } from "../../config/env.js";

export const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;

const sanitizeFileName = (fileName) => {
  const baseName = fileName.split(/[\\/]/).pop() || "upload";
  return baseName.replace(/[^a-zA-Z0-9._-]/g, "_");
};

export const createPresignedUpload = async (
  dealerId,
  fileName,
  contentType,
) => {
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
