import { NextRequest } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/api-envelope";
import { verifyCheckCode } from "@/lib/twilio";
import { signSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { rateLimitHit } from "@/lib/rate-limit";
import { isMockIntegrations } from "@/lib/env";

export const runtime = "nodejs";

const bodySchema = z.object({
  pending_verification_token: z.string().min(1),
  code: z.string().regex(/^\d{6}$/),
});

export async function POST(req: NextRequest) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return jsonError("validation_error", "Invalid JSON.", 400);
  }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return jsonError("validation_error", "Invalid code format.", 422);
  }

  const { pending_verification_token: pvt, code } = parsed.data;

  const pending = await prisma.pendingVerification.findUnique({
    where: { id: pvt },
  });

  if (!pending || pending.purpose !== "login") {
    return jsonError("pending_token_expired", "Start login again.", 410);
  }

  if (pending.expiresAt.getTime() < Date.now()) {
    await prisma.pendingVerification.delete({ where: { id: pvt } }).catch(() => {});
    return jsonError("pending_token_expired", "That code expired — request a new one.", 410);
  }

  const rl = rateLimitHit("loginverifycheck", pending.userId, 5, 15 * 60 * 1000);
  if (!rl.ok) {
    return jsonError(
      "rate_limited",
      `Too many attempts. Try again in ${rl.retryAfterSec}s.`,
      429,
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: pending.userId },
  });
  if (!user || !user.phoneVerifiedAt) {
    return jsonError("invalid_credentials", "Account not available.", 401);
  }

  let ok = false;
  if (isMockIntegrations() && pending.mockCode) {
    ok = code === pending.mockCode;
  } else {
    ok = await verifyCheckCode(user.phoneE164, code);
  }

  if (!ok) {
    const updated = await prisma.pendingVerification.update({
      where: { id: pvt },
      data: { attempts: { increment: 1 } },
      select: { attempts: true },
    });
    if (updated.attempts >= 5) {
      return jsonError(
        "invalid_code",
        "Too many incorrect attempts — request a new code.",
        422,
      );
    }
    return jsonError("invalid_code", "That code doesn’t match. Try again.", 422);
  }

  const membership = await prisma.userBusinessRole.findUnique({
    where: {
      userId_businessId: {
        userId: pending.userId,
        businessId: pending.businessId,
      },
    },
  });

  if (!membership) {
    return jsonError("downstream_unavailable", "Membership not found.", 503);
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    await tx.pendingVerification.delete({ where: { id: pvt } });
  });

  const token = await signSessionToken({
    sub: user.id,
    bid: pending.businessId,
    lid: pending.locationId,
    role: membership.role,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24,
  });

  return jsonOk({
    status: "complete",
    redirect: "/dashboard",
  });
}
