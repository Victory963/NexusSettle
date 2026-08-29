import { readFile } from "fs/promises";
import { join } from "path";
import { Pool } from "pg";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required");
  const sql = await readFile(join(process.cwd(), "db", "migrations", "001_clearing.sql"), "utf8");
  const pool = new Pool({ connectionString });
  try {
    await pool.query(sql);
    console.log("Clearing schema is ready.");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
