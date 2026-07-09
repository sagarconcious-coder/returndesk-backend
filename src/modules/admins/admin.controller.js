import { loginAdmin } from "./admin.service.js";
import { successResponse } from "../../common/utils/response.util.js";

export async function loginAdminController(req, res, next) {
  try {
    const { email, password } = req.body;
    /////////////////////////// 1) If user misses email or password
    if (!email || !password) {
      const err = new Error("Email and passwords are required");
      err.statusCode = 400;
      throw err;
    }

    /////////////////////////    2) try logging in with provided email and password
    const token = await loginAdmin(email, password);
    return successResponse(res, token, "Login Successful");
  } catch (error) {
    next(error);
  }
}
