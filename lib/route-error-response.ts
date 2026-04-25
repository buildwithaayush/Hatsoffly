import { jsonError } from "@/lib/api-envelope";
import { databaseUnreachableHelpMessage, isDev } from "@/lib/env";

/**
 * Map an unexpected thrown value to a JSON API error (always safe to return to the client).
 * Use after `console.error(prefix, e)`.
 */
export function jsonFromUnknownRouteError(
  e: unknown,
  options: { logPrefix: string; userHint: string },
) {
  console.error(options.logPrefix, e);
  const msg = e instanceof Error ? e.message : String(e);

  if (
    /prisma|p10\d{2}|database|ECONNREFUSED|ETIMEDOUT|ENOTFOUND|getaddrinfo|connection.*refused|server has closed|SSL|TLS|invalid connection string|can't reach database/i.test(
      msg,
    )
  ) {
    return jsonError("database_error", databaseUnreachableHelpMessage(), 503);
  }

  if (/twilio|verify\.twilio|fetch failed|aborterror|operation was aborted/i.test(msg)) {
    return jsonError(
      "twilio_unavailable",
      "SMS verification could not reach Twilio. Check TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_VERIFY_SERVICE_SID, or set MOCK_INTEGRATIONS=1 for local dev (code 123456).",
      503,
    );
  }

  const tech = isDev && msg.trim() ? `${msg.trim()} ` : "";
  return jsonError(
    "server_error",
    `${tech}${options.userHint}`.trim(),
    500,
  );
}
