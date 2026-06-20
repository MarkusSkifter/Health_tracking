# Training Insights App — Specification

## 1. Overview

A personal training-analytics web app that pulls activity and wellness data from the intervals.icu API, stores it, runs it through an LLM once a day, and presents a daily natural-language summary of training load, recovery, and trends. Built first for a single user (the founder), but designed from day one so additional users can be onboarded later without a rebuild.

The core daily experience: open the app (ideally as a home-screen PWA), see today's AI-written summary first — what you did, how hard it was, what your body's recovery signals say, and what that means for the next day or two.

## 2. Goals and non-goals

**Goals**
- Automatically ingest activities and wellness data (resting HR, HRV, sleep, steps, weight) from intervals.icu on a daily schedule.
- Compute training load metrics deterministically (not via the LLM) — daily load, rolling 7-day and 28-day load, acute:chronic load ratio.
- Generate one AI-written daily summary per user per day, in plain conversational language, grounded in the computed numbers.
- Present this in a light, minimal, mobile-first interface that opens directly to "today."
- Support multiple users later via per-user intervals.icu OAuth connections, without architectural rework.

**Non-goals (for v1)**
- No native iOS/Android app — a PWA is sufficient.
- No coaching plan generation, no workout prescription, no calendar editing back into intervals.icu.
- No real-time/live data (this is a once-a-day batch summary, not a live dashboard).
- No social features, leaderboards, or multi-user comparison in v1.

## 3. Users and accounts

- v1: single hardcoded user (the founder's intervals.icu account), authenticated via personal API key stored as a server-side secret.
- v2 (future): a `users` table with email/password or OAuth login to the app itself, plus a stored intervals.icu OAuth access/refresh token per user. The data model below already assumes multiple users so this transition only requires adding an auth layer and a connect-your-account flow, not a schema redesign.

## 4. Data sources (intervals.icu API)

Pulled once daily via scheduled job, for a rolling window (recommend last 7 days, to catch late-arriving wellness data such as Oura sync delays):

- **Activities** — `GET /api/v1/athlete/{id}/activities` — type, date, duration, distance, average/normalized power, heart rate, training load, pace.
- **Activity detail / files** — only if deeper analysis is needed later; not required for v1 daily summary.
- **Wellness** — `GET /api/v1/athlete/{id}/wellness` — resting HR, HRV, sleep duration, steps, weight, VO2max.
- **Athlete profile** — FTP, max HR, zones — pulled occasionally (e.g. weekly), used to contextualize load %.

Authentication: personal API key via HTTP Basic Auth (`API_KEY:<key>`) for v1. OAuth with `ACTIVITY:READ` and `WELLNESS:READ` scopes for v2 multi-user.

## 5. Data model (Postgres)

```
users
  id, name, email, intervals_athlete_id, intervals_api_key_encrypted (or oauth tokens), created_at

activities_raw
  id, user_id, intervals_activity_id, fetched_at, raw_json

activities
  id, user_id, intervals_activity_id, date, type, duration_sec,
  distance_m, avg_power, avg_hr, training_load, created_at

wellness_raw
  id, user_id, date, fetched_at, raw_json

wellness
  id, user_id, date, resting_hr, hrv, sleep_sec, steps, weight_kg, created_at

daily_summary
  id, user_id, date, training_load_daily, load_7d, load_28d,
  acute_chronic_ratio, ai_summary_text, created_at
```

Raw tables exist so the original API response is never lost even if the normalized schema changes later — similar in spirit to a raw/staging layer in a dbt project.

## 6. Computed metrics (deterministic, not AI-generated)

- **Daily training load**: taken directly from intervals.icu's per-activity load figure, summed per day.
- **Rolling 7-day load**: sum of daily load over trailing 7 days.
- **Rolling 28-day load**: sum of daily load over trailing 28 days.
- **Acute:chronic ratio**: 7-day load ÷ (28-day load ÷ 4). Flag if ratio is notably high (overreaching risk) or notably low (detraining).
- These numbers are computed in application code and stored in `daily_summary`. The AI is given these numbers and asked to narrate them, not to calculate them, so the displayed figures and the written summary can never disagree.

## 7. AI summary generation

- Runs once daily after ingestion completes, per user.
- Input to the LLM: that day's activities, that day's wellness metrics, the computed load figures, and a short window (10–14 days) of recent history for trend context.
- Output: a short (3–6 sentence) plain-language summary covering what was done, how it compares to recent load, and what the wellness signals (HRV, resting HR, sleep) suggest.
- Stored as `ai_summary_text` in `daily_summary`, never regenerated retroactively unless the user explicitly requests a re-run (e.g. data corrected after the fact).
- Model choice and prompt are an implementation detail for Claude Code to propose — should be cheap enough to run daily per user indefinitely (a small/cheap model is likely sufficient for this task).

## 8. Frontend

- Mobile-first, installable as a PWA (home screen icon, works full-screen, no browser chrome).
- **Design language**: light theme, generous whitespace, one primary number/headline per screen, minimal navigation. Reference points: Oura/Whoop daily readiness screens — big number, short sentence, optional expand for detail.
- **Home/today screen**: today's AI summary front and center, today's load number, a small recent-trend sparkline.
- **History screen**: scrollable list of past daily summaries, tap to expand.
- **Settings**: connect/manage intervals.icu account (v2), basic profile.
- Recommended stack: Next.js + Tailwind CSS, deployed as a PWA. (Decision to be confirmed before implementation — see open questions.)

## 9. Backend / jobs

- A scheduled job (daily, early morning local time) that: pulls intervals.icu data for the rolling window → upserts into raw and normalized tables → computes load metrics → calls the LLM → stores the summary.
- A web API serving the frontend: today's summary, historical summaries, basic auth/session handling.
- Recommended stack: Node.js (TypeScript) backend, sharing types with the Next.js frontend where convenient.

## 10. Hosting (proposed, to be confirmed)

- **Single-user-first approach**: host database, backend API, and the daily scheduled job together on one platform (e.g. Railway or Render) to minimize moving parts while there's only one user.
- **Frontend**: Vercel, if Next.js is chosen — near-zero-config deploys.
- Secrets (intervals.icu API key, LLM API key, DB credentials) stored as platform environment variables, never committed to the repo.

## 11. Security and privacy notes

- intervals.icu API key and LLM API key are server-side secrets only — never exposed to the frontend/browser.
- If/when multi-user support is added, each user's intervals.icu credentials must be stored encrypted at rest, and one user must never be able to query another user's data (standard row-level scoping by `user_id` in every query).

## 12. Open questions / decisions to confirm before build

1. Frontend framework: Next.js (recommended) vs. alternative?
2. Hosting platform: Railway vs. Render vs. other?
3. Which LLM/provider for the daily summary, and budget per day/month?
4. Time of day the daily job should run?
5. v1 scope confirmation: single user, no login screen, API keys as env vars — agreed?
