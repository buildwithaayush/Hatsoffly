# Hatsoffly — environments & deployment

Three logical tiers drive config, UI banners, and safe defaults:

| Tier | Typical host | `NEXT_PUBLIC_APP_ENV` | Database | Integrations |
|------|----------------|------------------------|----------|--------------|
| **local** | `localhost` | `local` | PostgreSQL (Neon free tier / Docker — same schema as prod) | Mocks **default** if `MOCK_INTEGRATIONS` is unset |
| **development** | Vercel Preview / staging URL | `development` | Hosted Postgres (not prod DB) | Twilio **test/trial** + GCP project for Places; set `MOCK_INTEGRATIONS=1` if you want mocks |
| **production** | Customer-facing domain | `production` | Postgres + backups | Twilio **live** Verify + compliant sender; Maps/OAuth production keys |

Server code reads `NEXT_PUBLIC_APP_ENV` and falls back to `VERCEL_ENV` when the public var is unset (`lib/env.ts`).

---

## Why signup failed on Vercel

The MVP used SQLite locally; **SQLite does not work on Vercel’s serverless filesystem** for real writes. The app now targets **PostgreSQL**. Your deploy must set **`DATABASE_URL`** (e.g. Neon) and **`JWT_SECRET`**. Builds run **`prisma migrate deploy`** so tables exist automatically.

---

## Quick start (local)

1. `cp .env.example .env`
2. Create a **Postgres** database (Neon free tier is fine) and paste `DATABASE_URL`.
3. Set `JWT_SECRET` (long random string).
3. Keep `NEXT_PUBLIC_APP_ENV=local` and either:
   - leave `MOCK_INTEGRATIONS=1` (or omit it — **local tier defaults to mocks**), verification code **`123456`**, or
   - set `MOCK_INTEGRATIONS=0` and add real **Twilio** + **Google Maps** keys below.
4. `npm install && npm run db:push && npm run dev`  
   (`db:push` syncs schema; production uses `prisma migrate deploy` during `npm run build`.)

---

## Environment variables (reference)

Copy from `.env.example`; minimum:

- **`NEXT_PUBLIC_APP_URL`** — Canonical site URL (SMS deep links, metadata). Must match the deployed host in non-local tiers.
- **`NEXT_PUBLIC_APP_ENV`** — `local` \| `development` \| `production`.
- **`DATABASE_URL`** — SQLite locally; Postgres for preview/production.
- **`JWT_SECRET`** — Required for auth tokens.
- **`MOCK_INTEGRATIONS`** — `1` = mock Twilio/SMS (`MOCK_VERIFY_CODE`, default `123456`). **`0`** = real APIs. If **unset**, only **local** tier uses mocks.
- **`GOOGLE_MAPS_API_KEY`** — Places Autocomplete + Details (billing enabled, Places API on).
- **Twilio** — `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID`; optional `TWILIO_MESSAGING_FROM` for outbound SMS.

---

## Vercel (development & production)

1. Create **two** projects or use **Preview vs Production** with different env vars.
2. Set **`NEXT_PUBLIC_APP_ENV`** explicitly: `development` on Preview (or staging branch), `production` on Production.
3. Set **`NEXT_PUBLIC_APP_URL`** to each deployment’s URL (preview URL for previews; prod domain for prod).
4. Paste **Postgres** `DATABASE_URL` per environment (never share prod DB with preview).
5. Add integration secrets per environment (staging can use Twilio trial keys).

---

## Google Cloud (Places API)

1. Create/select a GCP project → **APIs & Services** → enable **Places API** (Places API New if you migrate later).
2. **Credentials** → API key → restrict by **HTTP referrer** (web) + **API restriction** (Places).
3. Enable billing on the project (Places requires it).
4. Put the key in `GOOGLE_MAPS_API_KEY` for each tier that should hit real Google (set `MOCK_INTEGRATIONS=0` locally to exercise it).

---

## Twilio

1. Create a **Verify** service → note `TWILIO_VERIFY_SERVICE_SID`.
2. For signup/login SMS, ensure the destination numbers are allowed on your Twilio account (trial restrictions apply).
3. Optional **Lookup** on signup uses the same Account SID / Auth Token (`lib/twilio.ts`).
4. Production: register sender / campaign compliance (10DLC / toll-free) as required for your traffic.

---

## Checklist before production traffic

- [ ] `NEXT_PUBLIC_APP_ENV=production` and `NEXT_PUBLIC_APP_URL` = real domain.
- [ ] `MOCK_INTEGRATIONS=0`.
- [ ] Postgres + `prisma migrate deploy` in CI / release step.
- [ ] Twilio Verify + messaging comply with carrier rules.
- [ ] Google Maps key restricted and Places enabled.
- [ ] `JWT_SECRET` rotated and only in secret store.

---

## What to do next (recommended order)

1. **Provision Postgres** for staging + production (Neon, Supabase, RDS, etc.).
2. **Configure Vercel** (or host) env vars per tier; deploy staging first.
3. **Add GCP Places key** on staging → test onboarding business search end-to-end with `MOCK_INTEGRATIONS=0`.
4. **Add Twilio Verify** on staging → test SMS codes on real devices.
5. **Lock down keys** (referrer/IP restrictions, Twilio credential rotation).
6. **Production deploy** after staging sign-off; monitor logs for Places/Twilio errors.

The amber **environment banner** is hidden when `NEXT_PUBLIC_APP_ENV=production` (see `EnvironmentBanner` + `getEnvironmentBanner()`).
