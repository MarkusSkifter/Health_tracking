import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { databaseEnv } from "../env";
import * as schema from "./schema";

const { DATABASE_URL } = databaseEnv();

// postgres.js connects lazily on first query, so importing this module does not
// open a connection.
const queryClient = postgres(DATABASE_URL);

export const db = drizzle(queryClient, { schema, casing: "snake_case" });
export { schema };
