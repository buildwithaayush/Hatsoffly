import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/api-envelope";
import { parseSignupMobile } from "@/lib/phone";
import { isDisposableEmail } from "@/lib/disposable-email";
import { rateLimitHit } from "@/lib/rate-limit";
import { verifyStart } from "@/lib/twilio";
import { requireOwnerSession } from "@/lib/require-owner-session";

export const runtime = "nodejs";

const bodySchema = z.object({
  channel: z.enum(["phone", "email"]),
  value: z.string().min(3).max(320),
});

function contactVerified(u: { phoneVerifiedAt: Date | null; emailVerifiedAt: Date | null }) {
  return u.phoneVerifiedAt != null && u.emailVerifiedAt != null;
}

export async function POST(req: NextRequest) {
  const auth = await requireOwnerSession();
  if ("error" in auth) return auth.error;

  const { user } = auth;

  if (!contactVerified(user)) {
    return jsonError(
      "contact_not_verified",
      "Verify both email and phone on your account before changing them.",
      403,
    );
  }

  const rl = rateLimitHit("contact_change_start", user.id, 8, 60 * 60 * 1000);
  if (!rl.ok) {
    return jsonError("rate_limited", `Too many attempts. Try again in ${rl.retryAfterSec}s.`, 429);
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return jsonError("validation_error", "Invalid JSON.", 400);
  }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return jsonError("validation_error", "Invalid request.", 422);
  }

  const { channel, value } = parsed.data;

  if (channel === "phone") {
    const phone = parseSignupMobile(value);
    if (!phone.ok) {
      const msg =
        phone.reason === "not_in_allowlist"
          ? "This number is not allowed in this environment."
          : phone.reason === "unsupported_region"
            ? "US and Canada mobile numbers only (production)."
            : "Enter a valid mobile number.";
      return jsonError("invalid_phone", msg, 422);
    }
    if (phone.e164 === user.phoneE164) {
      return jsonError("validation_error", "That is already your phone number.", 422);
    }
    const taken = await prisma.user.findFirst({
      where: { phoneE164: phone.e164, NOT: { id: user.id } },
      select: { id: true },
    });
    if (taken) {
      return jsonError("phone_in_use", "Another account already uses this number.", 409);
    }

    try {
      await prisma.accountContactChallenge.deleteMany({ where: { userId: user.id } });
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      const row = await prisma.accountContactChallenge.create({
        data: {
          userId: user.id,
          kind: "change_phone",
          destination: phone.e164,
          expiresAt,
        },
      });
      try {
        await verifyStart(phone.e164, "sms");
      } catch (e2) {
        await prisma.accountContactChallenge.delete({ where: { id: row.id } }).catch(() => {});
        throw e2;
      }
      return jsonOk({ challenge_id: row.id, channel: "phone" as const });
    } catch (e) {
      await prisma.accountContactChallenge.deleteMany({ where: { userId: user.id } });
      const msg =
        e instanceof Error && e.message === "twilio_verify_not_configured"
          ? "SMS verification is not configured."
          : e instanceof Error
            ? e.message
            : "Could not send verification code.";
      console.error("[contact/start phone]", e);
      return jsonError("verify_unavailable", msg, 503);
    }
  }

  const emailNorm = value.trim().toLowerCase();
  const emailParsed = z.string().email().safeParse(emailNorm);
  if (!emailParsed.success) {
    return jsonError("validation_error", "Enter a valid email address.", 422);
  }
  const domain = emailNorm.split("@")[1] ?? "";
  if (isDisposableEmail(domain)) {
    return jsonError("disposable_email", "Please use a work email address.", 422);
  }
  if (emailNorm === user.email) {
    return jsonError("validation_error", "That is already your email.", 422);
  }
  const emailTaken = await prisma.user.findFirst({
    where: { email: emailNorm, NOT: { id: user.id } },
    select: { id: true },
  });
  if (emailTaken) {
    return jsonError("email_in_use", "Another account already uses this email.", 409);
  }

  try {
    await prisma.accountContactChallenge.deleteMany({ where: { userId: user.id } });
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    const row = await prisma.accountContactChallenge.create({
      data: {
        userId: user.id,
        kind: "change_email",
        destination: emailNorm,
        expiresAt,
      },
    });
    try {
      await verifyStart(emailNorm, "email");
    } catch (e2) {
      await prisma.accountContactChallenge.delete({ where: { id: row.id } }).catch(() => {});
      throw e2;
    }
    return jsonOk({ challenge_id: row.id, channel: "email" as const });
  } catch (e) {
    await prisma.accountContactChallenge.deleteMany({ where: { userId: user.id } });
    const msg =
      e instanceof Error && e.message === "twilio_verify_not_configured"
        ? "Email verification is not configured."
        : e instanceof Error
          ? e.message
          : "Could not send verification code.";
    console.error("[contact/start email]", e);
    return jsonError("verify_unavailable", msg, 503);
  }
}
