export function requiredEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env: ${name}`);
  return v;
}

export const isDev = process.env.NODE_ENV !== "production";

export function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

/**
 * When true, Twilio Verify + SMS flows use mocks; verify accepts MOCK_VERIFY_CODE (default 123456).
 *
 * - Explicit `MOCK_INTEGRATIONS=1|0|true|false` always wins.
 * - If unset: defaults to mocked **only on the `local` tier** (`NEXT_PUBLIC_APP_ENV=local` or dev server),
 *   so staging/production never accidentally rely on mocks.
 */
export function isMockIntegrations(): boolean {
  const raw = process.env.MOCK_INTEGRATIONS?.trim().toLowerCase();
  if (raw) {
    if (raw === "1" || raw === "true" || raw === "yes") return true;
    if (raw === "0" || raw === "false" || raw === "no") return false;
  }
  return getAppTier() === "local";
}

/**
 * Deployment tier for UI + operational context.
 * - Set `NEXT_PUBLIC_APP_ENV` explicitly on every deploy (recommended).
 * - On Vercel, falls back to `VERCEL_ENV` when the public var is unset.
 */
export type AppTier = "local" | "development" | "production";

export function getAppTier(): AppTier {
  const pub = process.env.NEXT_PUBLIC_APP_ENV as AppTier | undefined;
  if (pub === "local" || pub === "development" || pub === "production") {
    return pub;
  }
  if (process.env.VERCEL_ENV === "production") {
    return "production";
  }
  if (
    process.env.VERCEL_ENV === "preview" ||
    process.env.VERCEL_ENV === "development"
  ) {
    return "development";
  }
  if (process.env.NODE_ENV !== "production") {
    return "local";
  }
  return "production";
}

/** Non-production banner for layout (server-safe). */
export function getEnvironmentBanner(): { label: string; subtle: string } | null {
  const t = getAppTier();
  if (t === "production") {
    return null;
  }
  if (t === "local") {
    return {
      label: "Local",
      subtle:
        "Mocks default locally (unset MOCK_INTEGRATIONS). SMS code 123456 — set MOCK_INTEGRATIONS=0 plus Twilio/Google keys for real SMS.",
    };
  }
  return {
    label: "Staging",
    subtle:
      "Dev / preview — use test Twilio & Stripe keys. Safe for client demos; not production billing.",
  };
}
