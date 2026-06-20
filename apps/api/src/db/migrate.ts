import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { fileURLToPath } from "node:url";
import path from "node:path";
import postgres from "postgres";
import { databaseEnv } from "../env";

/** Apply pending migrations, then exit. Safe to run on deploy (Railway release). */
const { DATABASE_URL } = databaseEnv();

// Resolve ./drizzle relative to the api package root, regardless of CWD.
const migrationsFolder = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../drizzle",
);

const sql = postgres(DATABASE_URL, { max: 1 });
const db = drizzle(sql);

await migrate(db, { migrationsFolder });
await sql.end();

console.log(`Migrations applied from ${migrationsFolder}`);
