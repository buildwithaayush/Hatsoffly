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

### Build fails: `P1012` / `Environment variable not found: DATABASE_URL`

**Cause:** `npm run build` runs Prisma against your schema; **`DATABASE_URL` must exist during the build** — not only at runtime.

**Fix:** In **Vercel → Settings → Environment Variables**, add **`DATABASE_URL`** and enable it for **every environment you deploy** (typically **Production** *and* **Preview** — Preview branches build too). Save, then **Redeploy**.

---

## Quick start (local)

1. `cp .env.example .env`
2. Create a **Postgres** database (Neon free tier is fine) and paste `DATABASE_URL`.
3. Set `JWT_SECRET` (long random string).
4. Keep `NEXT_PUBLIC_APP_ENV=local` and either:
   - leave `MOCK_INTEGRATIONS=1` (or omit it — **local tier defaults to mocks**), verification code **`123456`**, or
   - set `MOCK_INTEGRATIONS=0` and add real **Twilio** + **Google Maps** keys below.
5. `npm install && npm run db:push && npm run dev`  
   (`db:push` syncs schema; production uses `prisma migrate deploy` during `npm run build`.)

---

## Environment variables (reference)

Copy from `.env.example`; minimum:

- **`NEXT_PUBLIC_APP_URL`** — Canonical site URL (SMS deep links, metadata). Must match the deployed host in non-local tiers.
- **`NEXT_PUBLIC_APP_ENV`** — `local` \| `development` \| `production`.
- **`DATABASE_URL`** — PostgreSQL everywhere (local dev + Vercel).
- **`JWT_SECRET`** — Required for auth tokens.
- **`MOCK_INTEGRATIONS`** — `1` = mock Twilio/SMS (`MOCK_VERIFY_CODE`, default `123456`). **`0`** = real APIs. If **unset**, only **local** tier uses mocks.
- **`GOOGLE_MAPS_API_KEY`** — Places Autocomplete + Details (billing enabled, enable **Places API**, restrict key).
- **Twilio** — **`TWILIO_ACCOUNT_SID`**, **`TWILIO_AUTH_TOKEN`**, **`TWILIO_VERIFY_SERVICE_SID`** (Verify SMS codes). **`TWILIO_MESSAGING_FROM`** — SMS-capable **From** number (E.164, e.g. `+15551234567`) for the **test SMS** after verification; **required when `MOCK_INTEGRATIONS=0`**.

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

## Enable “real product” behavior (do this on **staging** first)

1. In Vercel (or `.env` locally), set **`MOCK_INTEGRATIONS=0`** and **redeploy**.
2. Add **all** Twilio variables below — the app **requires** Verify **and** Messaging when mocks are off (`lib/integration-config.ts`, `lib/twilio.ts`).

### Google Cloud (Places)

1. [Google Cloud Console](https://console.cloud.google.com/) → your project → **APIs & Services** → **Enable** the **Places API** (the classic Places Web Service used by `lib/places.ts`: Autocomplete + Place Details).
2. **Credentials** → create an **API key** → **Restrict key**: HTTP referrers (your site + `http://localhost:3000` for dev) and API = Places (tighten after it works).
3. **Billing** must be enabled on the project.
4. Set **`GOOGLE_MAPS_API_KEY`** in the server environment.

With **`MOCK_INTEGRATIONS=0`**, choosing a business from search requires this key. **Manual address** signup still works without Maps.

**Autocomplete empty on Vercel but works locally?** Your API key is used **on the server** (not in the browser). Do **not** use **HTTP referrer** restrictions on this key — Google will reject requests from Vercel. Use **Application restriction: None** and **API restriction: Places API** (tighten later with a separate server key strategy if needed).

### Twilio

1. [Twilio Console](https://console.twilio.com/) → **Develop** → **Verify** → **Services** → create a service → copy **`TWILIO_VERIFY_SERVICE_SID`**.
2. **Account** → copy **`TWILIO_ACCOUNT_SID`** and **`TWILIO_AUTH_TOKEN`** (use **test** credentials only on a dev account if you prefer).
3. **Phone Numbers** → buy or use a number that can send **SMS** → set **`TWILIO_MESSAGING_FROM`** to that number in **E.164** (e.g. `+15551234567`). This sends the **test SMS** with the preview link after the user enters the correct code.
4. **Trial accounts** can only SMS **verified** caller IDs — add your test phone under **Verified Caller IDs** until you upgrade.

**End-to-end:** Continue on signup → SMS with **Verify code** → enter code on step 2 → **second SMS** (Messaging) with `/t/...` link.

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
