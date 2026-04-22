#!/usr/bin/env node
/**
 * Fail fast with a clear message when DATABASE_URL is missing (e.g. Vercel Preview build).
 */
if (!process.env.DATABASE_URL?.trim()) {
  console.error(`
----------------------------------------------------------------------
DATABASE_URL is not set.

Vercel: Project → Settings → Environment Variables
  • Add DATABASE_URL (your Postgres connection string)
  • Enable it for Preview AND Production (and Development if used)
    — each deployment type runs "npm run build", which runs prisma migrate.

Then redeploy.
----------------------------------------------------------------------
`);
  process.exit(1);
}
