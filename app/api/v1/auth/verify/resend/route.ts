import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/api-envelope";
import { verifyStartSms } from "@/lib/twilio";
import { rateLimitHit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const bodySchema = z.object({
  pending_verification_token: z.string().min(1),
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
    return jsonError("validation_error", "Invalid body.", 422);
  }

  const pending = await prisma.pendingVerification.findUnique({
    where: { id: parsed.data.pending_verification_token },
  });

  if (!pending || pending.expiresAt.getTime() < Date.now()) {
    return jsonError("pending_token_expired", "Start again from the beginning.", 410);
  }

  const rl = rateLimitHit("verifyresend", pending.userId, 1, 30 * 1000);
  if (!rl.ok) {
    return jsonError(
      "rate_limited",
      `Wait ${rl.retryAfterSec}s before resending.`,
      429,
    );
  }

  const user = await prisma.user.findUnique({ where: { id: pending.userId } });
  if (!user) {
    return jsonError("pending_token_expired", "Invalid token.", 410);
  }

  try {
    await verifyStartSms(user.phoneE164);
  } catch {
    try {
      await verifyStartSms(user.phoneE164);
    } catch {
      return jsonError(
        "twilio_unavailable",
        "We're having trouble. Try again in a minute.",
        503,
      );
    }
  }

  return jsonOk({ status: "queued" }, { status: 202 });
}
