import { NextRequest } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/api-envelope";
import {
  verifyCheckCode,
  sendTestSms,
  TWILIO_MESSAGING_NOT_CONFIGURED,
} from "@/lib/twilio";
import { signSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { rateLimitHit } from "@/lib/rate-limit";
import { isMockIntegrations } from "@/lib/env";
import { newPreviewToken } from "@/lib/token";
import { BusinessRole } from "@prisma/client";

export const runtime = "nodejs";

const bodySchema = z.object({
  pending_verification_token: z.string().min(1),
  code: z.string().regex(/^\d{6}$/),
});

function firstToken(name: string) {
  const t = name.trim().split(/\s+/)[0];
  return t || name;
}

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

  if (!pending) {
    return jsonError("pending_token_expired", "Start again from the beginning.", 410);
  }

  if (pending.purpose === "login") {
    return jsonError(
      "wrong_endpoint",
      "Returning users should confirm via /api/v1/auth/login/confirm.",
      400,
    );
  }

  if (pending.expiresAt.getTime() < Date.now()) {
    await prisma.pendingVerification.delete({ where: { id: pvt } }).catch(() => {});
    return jsonError("pending_token_expired", "That link expired — start again.", 410);
  }

  const rl = rateLimitHit("verifycheck", pending.userId, 5, 15 * 60 * 1000);
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
  if (!user) {
    return jsonError("pending_token_expired", "Invalid session.", 410);
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

  const business = await prisma.business.findUnique({
    where: { id: pending.businessId },
    include: { locations: true },
  });
  if (!business) {
    return jsonError("downstream_unavailable", "Missing business record.", 503);
  }

  const primaryLoc =
    business.locations.find((l) => l.isPrimary) ?? business.locations[0];

  let testSmsSid = "SM_MOCK";

  try {
    await prisma.$transaction(async (tx) => {
      const previewToken = newPreviewToken();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await tx.previewLink.create({
        data: {
          token: previewToken,
          businessId: business.id,
          googleReviewUrl: primaryLoc?.googleReviewUrl,
          businessName: business.name,
          firstName: firstToken(user.fullName),
          expiresAt,
        },
      });

      const smsResult = await sendTestSms({
        toE164: user.phoneE164,
        firstName: firstToken(user.fullName),
        businessName: business.name,
        previewPathToken: previewToken,
        voice: business.templateVoice,
      });
      testSmsSid = smsResult.sid;

      await tx.user.update({
        where: { id: user.id },
        data: { phoneVerifiedAt: new Date(), lastLoginAt: new Date() },
      });

      await tx.pendingVerification.delete({ where: { id: pvt } });
    });
  } catch (e) {
    console.error("[verify]", e);
    const msg =
      e instanceof Error && e.message === TWILIO_MESSAGING_NOT_CONFIGURED
        ? "Outbound SMS is not configured. Set TWILIO_MESSAGING_FROM to your Twilio SMS-capable number (E.164)."
        : "Could not finish verification or send the test SMS. Try again.";
    return jsonError("twilio_unavailable", msg, 503);
  }

  const token = await signSessionToken({
    sub: user.id,
    bid: business.id,
    lid: primaryLoc?.id ?? business.id,
    role: BusinessRole.owner,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24,
  });

  /** Background jobs (spec): Stripe, Slack, HubSpot — fire-and-forget logs in MVP */
  queueMicrotask(() => {
    console.info("[jobs] stripe_customer_slack_hubspot_stub", {
      businessId: business.id,
      email: user.email,
    });
  });

  return jsonOk({
    status: "complete",
    test_sms_sid: testSmsSid,
    redirect: "/dashboard?welcome=1",
  });
}
