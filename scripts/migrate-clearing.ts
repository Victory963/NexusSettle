import { readdir, readFile } from "fs/promises";
import { join } from "path";
import { Pool } from "pg";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required");
  const dir = join(process.cwd(), "db", "migrations");
  const files = (await readdir(dir)).filter((name) => name.endsWith(".sql")).sort();
  const pool = new Pool({ connectionString });
  try {
    for (const file of files) {
      const sql = await readFile(join(dir, file), "utf8");
      await pool.query(sql);
      console.log(`Applied ${file}`);
    }
    console.log("Clearing schema is ready.");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
