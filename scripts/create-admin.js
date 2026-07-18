import bcrypt from "bcrypt";
import pool from "../src/config/db.js";

const name = "Admin";
const email = "admin@gmail.com";
const password = "admin";

const hashed = await bcrypt.hash(password, 10);

const res = await pool.query(
  `INSERT INTO admins (name,email,password,role) VAlUES ($1,$2,$3,'SUPER_ADMIN')`,
  [name, email, hashed],
);

console.log("Super Admin Created", email);
process.exit(0);
