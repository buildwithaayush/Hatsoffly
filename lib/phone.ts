import {
  parsePhoneNumberFromString,
  type PhoneNumber,
} from "libphonenumber-js";
import { getAppTier } from "@/lib/env";

export type PhoneParseResult =
  | { ok: true; e164: string }
  | {
      ok: false;
      reason: "invalid" | "unsupported_region" | "not_in_allowlist";
    };

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

function isLikelyIndianMobile(p: PhoneNumber): boolean {
  if (p.country !== "IN") return false;
  const t = p.getType();
  return (
    t === "MOBILE" ||
    t === "FIXED_LINE_OR_MOBILE" ||
    t === undefined
  );
}

/**
 * Optional comma-separated E.164 numbers. When set (local + development tiers only),
 * ONLY these numbers are accepted — useful for testing with one SIM.
 *
 * Example: DEV_PHONE_ALLOWLIST="+918123456789,+14155552671"
 */
export function devPhoneAllowlist(): string[] | null {
  if (getAppTier() === "production") return null;
  const raw = process.env.DEV_PHONE_ALLOWLIST?.trim();
  if (!raw) return null;
  const list = raw.split(",").map((s) => s.trim()).filter(Boolean);
  return list.length ? list : null;
}

function allowlisted(e164: string): boolean {
  const list = devPhoneAllowlist();
  if (!list) return true;
  return list.includes(e164);
}

/**
 * Signup/login: US/Canada in production.
 * Local + development: US/CA, India (+91), or `DEV_PHONE_ALLOWLIST` only.
 */
export function parseSignupMobile(rawInput: string): PhoneParseResult {
  const trimmed = rawInput.trim();
  const tier = getAppTier();

  let usca = parseUsCaMobile(normalizeNorthAmericanDialInput(trimmed));
  if (!usca.ok && trimmed.startsWith("+")) {
    const alt = parseUsCaMobile(trimmed);
    if (alt.ok) usca = alt;
  }

  if (usca.ok) {
    if (!allowlisted(usca.e164)) {
      return { ok: false, reason: "not_in_allowlist" };
    }
    return usca;
  }

  if (tier === "production") {
    return usca;
  }

  const list = devPhoneAllowlist();
  if (list?.length) {
    const p = parsePhoneNumberFromString(trimmed);
    if (p?.isValid() && allowlisted(p.number)) {
      return { ok: true, e164: p.number };
    }
    return { ok: false, reason: "not_in_allowlist" };
  }

  const inP = parsePhoneNumberFromString(trimmed, "IN");
  if (inP?.isValid() && inP.countryCallingCode === "91" && isLikelyIndianMobile(inP)) {
    return { ok: true, e164: inP.number };
  }

  const any = parsePhoneNumberFromString(trimmed);
  if (any?.isValid() && any.countryCallingCode === "91" && isLikelyIndianMobile(any)) {
    return { ok: true, e164: any.number };
  }

  return usca;
}

/** Mask any E.164 for display (signup verify UI). */
export function maskPhoneE164(e164: string): string {
  const digits = e164.replace(/\D/g, "");
  const last4 = digits.slice(-4);
  const parsed = parsePhoneNumberFromString(e164);
  if (!parsed?.isValid()) {
    return `•••• ${last4}`;
  }
  return `+${parsed.countryCallingCode} •••• ${last4}`;
}
