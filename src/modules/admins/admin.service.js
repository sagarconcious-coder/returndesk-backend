import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { getAdminByEmail } from "./admin.repository.js";
import { env } from "../../config/env.js";

export async function loginAdmin(email, password) {
  /////////////// 1) Check if admin exists
  const admin = await getAdminByEmail(email);
  if (!admin) {
    const err = new Error("Invalid email or password");
    err.statusCode = 401;
    throw err;
  }

  /////////////// 2) If admin is found , try mathcing password
  const match = await bcrypt.compare(password, admin.password);
  if (!match) {
    const err = new Error("Invalid email or password");
    err.statusCode = 401;
    throw err;
  }

  ////////////// 3) Both email and password mathces , so generate token (jwt)

  const token = jwt.sign(
    {
      admin_id: admin.id,
      email: admin.email,
      role: "admin",
    },
    env.JWT_SECRET,
    { expiresIn: "7d" },
  );
  return { token };
}
