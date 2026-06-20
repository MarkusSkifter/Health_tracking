# Training Insights

A personal training-analytics PWA that pulls activity and wellness data from the
[intervals.icu](https://intervals.icu) API, computes training-load metrics
deterministically, and uses Claude to write a daily natural-language summary of
load, recovery, and trends.

See [`Claude/SPEC.md`](./Claude/SPEC.md) for the full specification.

## Stack

| Layer | Choice | Deploy target |
|---|---|---|
| Frontend | Next.js + Tailwind (PWA via Serwist) | Vercel |
| Backend API + daily job | Node + TypeScript (Fastify) | Railway |
| Database | Postgres (Drizzle ORM) | Railway |
| Daily summary | Claude (`claude-sonnet-4-6`) | — |
| Scheduler | Railway Cron @ 05:00 Europe/Copenhagen | — |

## Repo layout (pnpm monorepo)

```
apps/
  web/        Next.js PWA (frontend)
  api/        Fastify backend + scheduled daily job
packages/
  shared/     Shared TypeScript types
```

## Getting started

```bash
# 1. Use the pinned package manager (corepack ships with Node)
corepack prepare pnpm@latest --activate   # or: npm i -g pnpm

# 2. Install dependencies
pnpm install

# 3. Configure secrets
cp .env.example .env        # then fill in the values

# 4. Run both apps in dev
pnpm dev                    # web on :3000, api on :3001
# or individually:
pnpm dev:web
pnpm dev:api
```

> Secrets (intervals.icu key, Anthropic key, DB URL) are **server-side only** and
> must never be committed or exposed to the browser. `.env` is gitignored.

## Operations (API package)

```bash
pnpm --filter @health/api db:migrate      # apply migrations
pnpm --filter @health/api ingest          # pull + store last 7 days
pnpm --filter @health/api summary [date]  # generate a day's summary (default: today)
pnpm --filter @health/api job:daily       # full daily job: ingest -> metrics -> summary
pnpm --filter @health/api db:inspect      # row counts + latest rows
pnpm --filter @health/api test            # unit tests (metrics + mappers)
```

The **daily job** (`job:daily`) is what Railway Cron runs at **05:00 Europe/Copenhagen**.

## Deploy (next steps, not yet done)

- **API + Cron** on Railway: deploy `apps/api`, set env vars, add a Cron service running `pnpm --filter @health/api job:daily` at `0 5 * * *` (Europe/Copenhagen). Run `db:migrate` as a release step.
- **Web** on Vercel: deploy `apps/web`, set `NEXT_PUBLIC_API_BASE_URL` to the Railway API URL.
- Finishing touches: PNG/maskable app icons (currently a single SVG), apple-touch icon.

## Status — v1 complete

Build order (see `Claude/CLAUDE_CODE_INSTRUCTIONS.md`):
1. ✅ Monorepo skeleton
2. ✅ DB schema + migrations (SPEC §5)
3. ✅ intervals.icu ingestion round-trip (verified live)
4. ✅ Store raw + normalized data (verified against Neon)
5. ✅ Compute load metrics (SPEC §6) — unit-tested
6. ✅ Daily AI summary (SPEC §7) — verified on real data
7. ✅ Frontend PWA (SPEC §8) — Today / History / Settings, verified end-to-end
