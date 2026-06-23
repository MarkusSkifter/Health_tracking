import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { z } from "zod";

// Load the single repo-root .env regardless of cwd (pnpm runs scripts with the
// package dir as cwd, so dotenv's default cwd lookup would miss it).
const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
config({ path: path.join(repoRoot, ".env"), quiet: true });

/**
 * Environment is validated per concern, not all at once, so an entry point only
 * requires the variables it actually uses (e.g. the intervals.icu connection
 * check shouldn't need a database URL or Anthropic key).
 */

const intervalsSchema = z.object({
  INTERVALS_API_KEY: z.string().min(1),
  INTERVALS_ATHLETE_ID: z.string().min(1),
});

const databaseSchema = z.object({
  DATABASE_URL: z.url(),
});

const anthropicSchema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1),
});

const serverSchema = z.object({
  PORT: z.coerce.number().default(3001),
});

const vapidSchema = z.object({
  VAPID_PUBLIC_KEY: z.string().min(1),
  VAPID_PRIVATE_KEY: z.string().min(1),
  VAPID_SUBJECT: z.string().min(1),
});

function memoize<T>(fn: () => T): () => T {
  let cached: T | undefined;
  let loaded = false;
  return () => {
    if (!loaded) {
      cached = fn();
      loaded = true;
    }
    return cached as T;
  };
}

/** intervals.icu credentials (SPEC §4). */
export const intervalsEnv = memoize(() => intervalsSchema.parse(process.env));
/** Postgres connection (SPEC §5). */
export const databaseEnv = memoize(() => databaseSchema.parse(process.env));
/** Anthropic / Claude (SPEC §7). */
export const anthropicEnv = memoize(() => anthropicSchema.parse(process.env));
/** API server settings. */
export const serverEnv = memoize(() => serverSchema.parse(process.env));
/** VAPID keys for Web Push. */
export const vapidEnv = memoize(() => vapidSchema.parse(process.env));

export type IntervalsEnv = z.infer<typeof intervalsSchema>;
export type DatabaseEnv = z.infer<typeof databaseSchema>;
export type AnthropicEnv = z.infer<typeof anthropicSchema>;
