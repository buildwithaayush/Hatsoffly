import { parsePhoneNumberFromString } from "libphonenumber-js";

export type PhoneParseResult =
  | { ok: true; e164: string }
  | { ok: false; reason: "invalid" | "unsupported_region" };

/** Strip formatting; if user entered 10 digits (US/CA NANP), assume +1. */
export function normalizeNorthAmericanDialInput(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return raw.replace(/\s+/g, " ").trim();
}

/** Normalize to E.164 for US/CA mobile-capable numbers (MVP). */
export function parseUsCaMobile(input: string): PhoneParseResult {
  const trimmed = normalizeNorthAmericanDialInput(input);
  const parsed = parsePhoneNumberFromString(trimmed, "US");
  if (!parsed?.isValid()) {
    const ca = parsePhoneNumberFromString(trimmed, "CA");
    if (ca?.isValid() && (ca.country === "CA" || ca.countryCallingCode === "1")) {
      return { ok: true, e164: ca.number };
    }
    return { ok: false, reason: "invalid" };
  }
  const cc = parsed.countryCallingCode;
  if (cc !== "1") return { ok: false, reason: "unsupported_region" };
  return { ok: true, e164: parsed.number };
}

export function maskPhoneE164(e164: string): string {
  const digits = e164.replace(/\D/g, "");
  const last4 = digits.slice(-4);
  return `+1 (•••) •••-${last4}`;
}
