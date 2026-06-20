# Claude Code — Initial Instructions

Read `SPEC.md` in this repo fully before doing anything else. It is the source of truth for what this project is and how it should work.

## Your first task is NOT to write the full app

Before writing application code, do the following, in order:

1. **Ask clarifying questions.** Section 12 of `SPEC.md` ("Open questions / decisions to confirm before build") lists decisions that have not been finalized — frontend framework, hosting platform, LLM provider, job schedule time, and v1 scope. Propose sensible defaults for each (the spec already contains recommendations), but confirm with me before locking them in, since these choices affect everything downstream.

2. **Propose a project structure.** Once the framework/hosting decisions are confirmed, outline the repo layout you intend to create (folders for frontend, backend, database migrations, scheduled jobs, etc.) and the key dependencies you plan to add. Show me this plan before scaffolding.

3. **Set up the skeleton, not the full feature set.** Once the plan is confirmed, build in this order:
   - Repo scaffolding (frontend + backend projects, shared config, `.env.example` with placeholders for `INTERVALS_API_KEY`, `INTERVALS_ATHLETE_ID`, the LLM API key, and database connection string).
   - Database schema/migrations matching Section 5 of `SPEC.md`.
   - A single working ingestion script that authenticates to intervals.icu with my personal API key and pulls one day of activities and wellness data, prints it, and confirms the connection works end-to-end before anything else is built on top of it.
   - Only after that round-trip is verified, proceed to: storing the data, computing load metrics (Section 6), the daily AI summary step (Section 7), and finally the frontend (Section 8).

## Working style

- Build incrementally and check in after each step above rather than generating the entire app in one pass — I want to verify each layer works before the next is built on it.
- Treat all API keys and secrets as environment variables only. Never hardcode a key or commit a `.env` file.
- Keep the v1 scope to a single hardcoded user unless I explicitly tell you to build multi-user support — don't build ahead of the spec.
- If something in `SPEC.md` is ambiguous or you think there's a better approach than what's written, raise it with me rather than silently deviating from the spec.

## First message back to me should contain

- Your proposed answers to the five open questions in Section 12.
- The project structure you intend to scaffold.
- Nothing else built yet — wait for my confirmation first.
