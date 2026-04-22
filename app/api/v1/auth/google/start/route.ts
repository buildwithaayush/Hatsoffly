import { jsonError, jsonOk } from "@/lib/api-envelope";

/**
 * Spec §10.5 — Initiates Google OAuth. Wire `GOOGLE_CLIENT_ID` + callback to enable.
 */
export async function POST() {
  const id = process.env.GOOGLE_CLIENT_ID;
  if (!id) {
    return jsonError(
      "not_configured",
      "Google sign-in is not configured for this environment.",
      501,
    );
  }

  return jsonOk({
    message:
      "Redirect your client to Google OAuth with openid email profile scopes; exchange the code server-side at /api/v1/auth/google/callback (not yet implemented in this MVP scaffold).",
    client_id_configured: true,
  });
}
