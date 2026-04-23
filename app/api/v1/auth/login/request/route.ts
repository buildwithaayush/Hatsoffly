import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/api-envelope";
import { maskPhoneE164, parseSignupMobile } from "@/lib/phone";
import { rateLimitHit } from "@/lib/rate-limit";
import { verifyStartSms } from "@/lib/twilio";
import { isMockIntegrations } from "@/lib/env";
import { newPendingVerificationToken } from "@/lib/token";

export const runtime = "nodejs";

const bodySchema = z.object({
  phone_e164: z.string().min(10),
});

function clientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() ?? "unknown";
  return req.headers.get("x-real-ip") ?? "unknown";
}

function firstToken(name: string) {
  const t = name.trim().split(/\s+/)[0];
  return t || name;
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const rlIp = rateLimitHit("login:ip", ip, 10, 60 * 60 * 1000);
  if (!rlIp.ok) {
    return jsonError("rate_limited", `Too many attempts. Try again in ${rlIp.retryAfterSec}s.`, 429);
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return jsonError("validation_error", "Invalid JSON.", 400);
  }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return jsonError("validation_error", "Invalid phone.", 422);
  }

  const phone = parseSignupMobile(parsed.data.phone_e164);
  if (!phone.ok) {
    const message =
      phone.reason === "not_in_allowlist"
        ? "Not on DEV_PHONE_ALLOWLIST (India +91 is open in local/dev without listing)."
        : phone.reason === "unsupported_region"
          ? "US and Canada only in production."
          : "Enter a valid mobile number.";
    return jsonError(
      phone.reason === "not_in_allowlist"
        ? "phone_not_allowed"
        : phone.reason === "unsupported_region"
          ? "unsupported_region"
          : "invalid_phone",
      message,
      422,
    );
  }

  const rlPhone = rateLimitHit("login:phone", phone.e164, 8, 60 * 60 * 1000);
  if (!rlPhone.ok) {
    return jsonError("rate_limited", `Too many attempts. Try again in ${rlPhone.retryAfterSec}s.`, 429);
  }

  const user = await prisma.user.findFirst({
    where: {
      phoneE164: phone.e164,
      phoneVerifiedAt: { not: null },
    },
  });

  if (!user) {
    return jsonError(
      "invalid_credentials",
      "No verified account found for this number. Start with Sign up.",
      401,
    );
  }

  const membership = await prisma.userBusinessRole.findFirst({
    where: { userId: user.id },
    include: {
      business: { include: { locations: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  if (!membership) {
    return jsonError("downstream_unavailable", "Account is incomplete. Contact support.", 503);
  }

  const primaryLoc =
    membership.business.locations.find((l) => l.isPrimary) ??
    membership.business.locations[0];

  if (!primaryLoc) {
    return jsonError("downstream_unavailable", "No location on file.", 503);
  }

  const pvt = newPendingVerificationToken();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  const mockCode = isMockIntegrations()
    ? process.env.MOCK_VERIFY_CODE ?? "123456"
    : undefined;

  await prisma.pendingVerification.create({
    data: {
      id: pvt,
      userId: user.id,
      businessId: membership.businessId,
      locationId: primaryLoc.id,
      purpose: "login",
      mockCode,
      expiresAt,
    },
  });

  try {
    const r = await verifyStartSms(phone.e164);
    if (r.sid) {
      await prisma.pendingVerification.update({
        where: { id: pvt },
        data: { verifySid: r.sid },
      });
    }
  } catch {
    try {
      const r = await verifyStartSms(phone.e164);
      if (r.sid) {
        await prisma.pendingVerification.update({
          where: { id: pvt },
          data: { verifySid: r.sid },
        });
      }
    } catch {
      await prisma.pendingVerification.delete({ where: { id: pvt } }).catch(() => {});
      return jsonError(
        "twilio_unavailable",
        "We're having trouble sending your code. Try again in a minute.",
        503,
      );
    }
  }

  return jsonOk(
    {
      pending_verification_token: pvt,
      phone_masked: maskPhoneE164(phone.e164),
      first_name: firstToken(user.fullName),
      expires_in_sec: 900,
    },
    { status: 202 },
  );
}
