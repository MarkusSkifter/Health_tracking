import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  casing: "snake_case",
  dbCredentials: {
    // Required for migrate/push/studio; unused by `generate`.
    url: process.env.DATABASE_URL ?? "",
  },
  strict: true,
  verbose: true,
});
