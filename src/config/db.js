import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// pg's Pool is an EventEmitter — an idle client erroring (e.g. connection
// dropped by the DB server) with no "error" listener registered crashes the
// whole process. This just logs it; the pool recovers the connection itself.
pool.on("error", (err) => {
  console.error("Unexpected error on idle PG client", err);
});

export default pool;
