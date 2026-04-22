# Hatsoffly (review-platform)

Next.js app for onboarding, SMS verification, Places-backed business signup, and marketing pages.

## Run locally

```bash
cp .env.example .env
# Edit .env — set DATABASE_URL (Postgres, e.g. Neon), JWT_SECRET, etc.

npm install
npm run db:push
npm run dev
```

Use a **PostgreSQL** URL locally (Neon free tier works). SQLite is no longer supported — Vercel and other serverless hosts need Postgres.

Open [http://localhost:3000](http://localhost:3000).

- With **`MOCK_INTEGRATIONS` unset or `1`** on **local**, Twilio flows are mocked (verify code **`123456`** unless you override `MOCK_VERIFY_CODE`).
- To exercise **real** Google Places + Twilio locally, set **`MOCK_INTEGRATIONS=0`** and add `GOOGLE_MAPS_API_KEY` plus Twilio vars per `.env.example`.

## Deployments & environments

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for the **local / development / production** matrix, Vercel env setup, GCP Places, Twilio checklist, and **recommended next steps** after wiring secrets.
