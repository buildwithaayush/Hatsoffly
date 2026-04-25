import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/api-envelope";
import { rateLimitHit } from "@/lib/rate-limit";
import { twilioLookupLineType, verifyCheckCode } from "@/lib/twilio";
import { requireOwnerSession } from "@/lib/require-owner-session";

export const runtime = "nodejs";

const bodySchema = z.object({
  challenge_id: z.string().uuid(),
  code: z.string().regex(/^\d{6}$/),
});

export async function POST(req: NextRequest) {
  const auth = await requireOwnerSession();
  if ("error" in auth) return auth.error;

  const { user } = auth;

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

  const { challenge_id, code } = parsed.data;

  const challenge = await prisma.accountContactChallenge.findFirst({
    where: { id: challenge_id, userId: user.id },
  });

  if (!challenge) {
    return jsonError("challenge_expired", "Start the change again from settings.", 410);
  }

  if (challenge.expiresAt.getTime() < Date.now()) {
    await prisma.accountContactChallenge.delete({ where: { id: challenge.id } }).catch(() => {});
    return jsonError("challenge_expired", "That code expired — request a new one.", 410);
  }

  const rl = rateLimitHit("contact_change_confirm", challenge.id, 8, 15 * 60 * 1000);
  if (!rl.ok) {
    return jsonError("rate_limited", `Too many attempts. Try again in ${rl.retryAfterSec}s.`, 429);
  }

  const ok = await verifyCheckCode(challenge.destination, code);
  if (!ok) {
    const updated = await prisma.accountContactChallenge.update({
      where: { id: challenge.id },
      data: { attempts: { increment: 1 } },
      select: { attempts: true },
    });
    if (updated.attempts >= 5) {
      await prisma.accountContactChallenge.delete({ where: { id: challenge.id } }).catch(() => {});
      return jsonError("invalid_code", "Too many incorrect attempts — request a new code.", 422);
    }
    return jsonError("invalid_code", "That code doesn’t match. Try again.", 422);
  }

  try {
    if (challenge.kind === "change_phone") {
      const lineType = await twilioLookupLineType(challenge.destination);
      if (lineType === "landline") {
        return jsonError("invalid_phone", "That number looks like a landline — use a mobile number.", 422);
      }
      const taken = await prisma.user.findFirst({
        where: { phoneE164: challenge.destination, NOT: { id: user.id } },
        select: { id: true },
      });
      if (taken) {
        return jsonError("phone_in_use", "Another account already uses this number.", 409);
      }

      await prisma.$transaction([
        prisma.user.update({
          where: { id: user.id },
          data: {
            phoneE164: challenge.destination,
            phoneLineType: lineType === "unknown" ? "unknown" : lineType,
            phoneVerifiedAt: new Date(),
          },
        }),
        prisma.accountContactChallenge.delete({ where: { id: challenge.id } }),
      ]);
      return jsonOk({ status: "complete", updated: "phone" as const });
    }

    if (challenge.kind === "change_email") {
      const taken = await prisma.user.findFirst({
        where: { email: challenge.destination, NOT: { id: user.id } },
        select: { id: true },
      });
      if (taken) {
        return jsonError("email_in_use", "Another account already uses this email.", 409);
      }

      await prisma.$transaction([
        prisma.user.update({
          where: { id: user.id },
          data: {
            email: challenge.destination,
            emailVerifiedAt: new Date(),
          },
        }),
        prisma.accountContactChallenge.delete({ where: { id: challenge.id } }),
      ]);
      return jsonOk({ status: "complete", updated: "email" as const });
    }

    await prisma.accountContactChallenge.delete({ where: { id: challenge.id } }).catch(() => {});
    return jsonError("validation_error", "Unknown challenge type.", 400);
  } catch (e) {
    console.error("[contact/confirm]", e);
    return jsonError("server_error", "Could not update your account. Try again.", 500);
  }
}
