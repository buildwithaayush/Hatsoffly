import { SignJWT, jwtVerify } from "jose";
import type { BusinessRole } from "@prisma/client";

export type SessionClaims = {
  sub: string;
  bid: string;
  lid: string;
  role: BusinessRole;
  jti: string;
};

/**
 * Max session length per issuance (JWT `exp` + cookie `maxAge`).
 * Default 30d for UX; shorten with SESSION_MAX_AGE_DAYS if you want a tighter stolen-token window.
 */
function sessionMaxAgeDays(): number {
  const raw = process.env.SESSION_MAX_AGE_DAYS?.trim();
  if (!raw) return 30;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1 || n > 400) return 30;
  return Math.floor(n);
}

/** Cookie `maxAge` (seconds) — keep in sync with JWT `exp` from {@link signSessionToken}. */
export function sessionCookieMaxAgeSec(): number {
  return sessionMaxAgeDays() * 24 * 60 * 60;
}

/**
 * On `/api/v1/auth/me`, if remaining JWT lifetime is at or below this, issue a new token+cookie.
 * Active users stay signed in without hitting a hard wall at max age; idle users still expire.
 * Capped at 7 days or half of max session, whichever is smaller.
 */
export function sessionRollingRenewThresholdSec(): number {
  const maxSec = sessionCookieMaxAgeSec();
  const oneWeek = 7 * 24 * 60 * 60;
  return Math.min(oneWeek, Math.floor(maxSec / 2));
}

/** `jose` duration string for JWT expiration (e.g. `30d`). */
function sessionJwtExpiresIn(): string {
  return `${sessionMaxAgeDays()}d`;
}

function secretKey() {
  const secret = process.env.JWT_SECRET ?? "dev-only-change-me-in-production";
  return new TextEncoder().encode(secret);
}

export type VerifiedSession = {
  claims: SessionClaims;
  /** JWT `exp` (unix seconds). */
  exp: number;
};

export async function signSessionToken(
  claims: Omit<SessionClaims, "jti"> & { jti?: string },
  expiresIn = sessionJwtExpiresIn(),
) {
  const jti = claims.jti ?? crypto.randomUUID();
  const jwt = await new SignJWT({
    bid: claims.bid,
    lid: claims.lid,
    role: claims.role,
    jti,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secretKey());

  return jwt;
}

async function verifySessionTokenInternal(token: string): Promise<VerifiedSession | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      algorithms: ["HS256"],
      clockTolerance: "30s",
    });
    const sub = typeof payload.sub === "string" ? payload.sub : null;
    const bid = typeof payload.bid === "string" ? payload.bid : null;
    const lid = typeof payload.lid === "string" ? payload.lid : null;
    const role = payload.role as BusinessRole | undefined;
    const jti = typeof payload.jti === "string" ? payload.jti : "";
    const exp = typeof payload.exp === "number" ? payload.exp : null;
    if (!sub || !bid || !lid || !role || exp == null) return null;
    return { claims: { sub, bid, lid, role, jti }, exp };
  } catch {
    return null;
  }
}

/** Verified claims + JWT expiry (for rolling session renewal on `/auth/me`). */
export async function verifySessionTokenWithExpiry(token: string): Promise<VerifiedSession | null> {
  return verifySessionTokenInternal(token);
}

export async function verifySessionToken(token: string): Promise<SessionClaims | null> {
  const v = await verifySessionTokenInternal(token);
  return v?.claims ?? null;
}

export const SESSION_COOKIE = "rp_session";
