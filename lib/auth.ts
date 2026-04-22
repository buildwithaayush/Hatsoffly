import { SignJWT, jwtVerify } from "jose";
import type { BusinessRole } from "@prisma/client";

export type SessionClaims = {
  sub: string;
  bid: string;
  lid: string;
  role: BusinessRole;
  jti: string;
};

function secretKey() {
  const secret = process.env.JWT_SECRET ?? "dev-only-change-me-in-production";
  return new TextEncoder().encode(secret);
}

export async function signSessionToken(
  claims: Omit<SessionClaims, "jti"> & { jti?: string },
  expiresIn = "24h",
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

export async function verifySessionToken(token: string): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      algorithms: ["HS256"],
    });
    const sub = typeof payload.sub === "string" ? payload.sub : null;
    const bid = typeof payload.bid === "string" ? payload.bid : null;
    const lid = typeof payload.lid === "string" ? payload.lid : null;
    const role = payload.role as BusinessRole | undefined;
    const jti = typeof payload.jti === "string" ? payload.jti : "";
    if (!sub || !bid || !lid || !role) return null;
    return { sub, bid, lid, role, jti };
  } catch {
    return null;
  }
}

export const SESSION_COOKIE = "rp_session";
