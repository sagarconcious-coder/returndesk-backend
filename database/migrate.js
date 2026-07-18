////////////////////// Script to run migrations

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pool from "../src/config/db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const migrationDir = path.join(__dirname, "..", "database", "migrations");

const files = fs
  .readdirSync(migrationDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

async function run() {
  const client = await pool.connect();
  try {
    await client.query(`
            CREATE TABLE IF NOT EXISTS schema_migrations(
                name TEXT PRIMARY KEY,
                applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
            )`);

    const { rows } = await client.query("SELECT name FROM schema_migrations");
    const applied = new Set(rows.map((r) => r.name));

    for (const file of files) {
      if (applied.has(file)) {
        console.log(`skip ${file} (already applied)`);
        continue;
      }
      const sql = fs.readFileSync(path.join(migrationDir, file), "utf8");
      console.log(`apply ${file}`);
      try {
        await client.query("BEGIN");
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [
          file,
        ]);
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw new Error(`Migration ${file} failed: ${error.message}`);
      }
    }
    console.log(`All migrations applied.`);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
