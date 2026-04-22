/**
 * Feature flags for third-party integrations (server-only).
 */

import { isMockIntegrations } from "@/lib/env";

export function googleMapsConfigured(): boolean {
  return Boolean(process.env.GOOGLE_MAPS_API_KEY?.trim());
}

export function twilioVerifyConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID?.trim() &&
      process.env.TWILIO_AUTH_TOKEN?.trim() &&
      process.env.TWILIO_VERIFY_SERVICE_SID?.trim(),
  );
}

/** Outbound Messaging API — used for the post-verify test SMS with preview link. */
export function twilioMessagingConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID?.trim() &&
      process.env.TWILIO_AUTH_TOKEN?.trim() &&
      process.env.TWILIO_MESSAGING_FROM?.trim(),
  );
}

/** Real signup + verify path needs Verify SMS + Messaging test SMS. */
export function twilioProductionSmsReady(): boolean {
  return twilioVerifyConfigured() && twilioMessagingConfigured();
}

/**
 * When mocks are off, Places-backed signup needs a Maps key so place details are real.
 * Manual-address signup does not need Google.
 */
export function requiresGoogleMapsForSignup(placeId?: string | null): boolean {
  return Boolean(placeId?.trim());
}

/** User-facing checklist when TWILIO_* vars are incomplete (non-mock only). */
export function twilioSetupHint(): string {
  return (
    "Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID (Verify), " +
      "and TWILIO_MESSAGING_FROM (E.164 sender for outbound SMS)."
  );
}

/** Clear error when turning off mocks without wiring Twilio. */
export function assertProductionSmsOrExplain(): string | null {
  if (isMockIntegrations()) return null;
  if (twilioProductionSmsReady()) return null;
  return twilioSetupHint();
}
