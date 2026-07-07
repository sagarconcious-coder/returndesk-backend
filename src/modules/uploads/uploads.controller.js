import { createPresignedUpload, MAX_UPLOAD_SIZE } from "./uploads.service.js";
import { successResponse } from "../../common/utils/response.util.js";

export const presignUploadController = async (req, res, next) => {
  try {
    const { file_name, content_type, file_size } = req.body;
    const uploadSize = Number(file_size);
    const dealerId = req.user?.dealerId || req.user?.dealer_id;

    if (!dealerId) {
      const error = new Error("Dealer id is missing from token");
      error.statusCode = 401;
      throw error;
    }

    if (!file_name || !content_type || file_size === undefined) {
      const error = new Error(
        "file_name, content_type and file_size are required",
      );
      error.statusCode = 400;
      throw error;
    }
    if (!Number.isFinite(uploadSize) || uploadSize <= 0) {
      const error = new Error("file_size must be a positive number");
      error.statusCode = 400;
      throw error;
    }
    if (uploadSize > MAX_UPLOAD_SIZE) {
      const error = new Error(
        `file_size exceeds the maximum allowed size of ${MAX_UPLOAD_SIZE} bytes`,
      );
      error.statusCode = 400;
      throw error;
    }
    const result = await createPresignedUpload(
      dealerId,
      file_name,
      content_type,
    );
    successResponse(res, result, "Presigned URL generated");
  } catch (error) {
    next(error);
  }
};
