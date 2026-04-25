import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/api-envelope";
import { SESSION_COOKIE } from "@/lib/auth";
import { rateLimitHit } from "@/lib/rate-limit";
import { requireOwnerSession } from "@/lib/require-owner-session";

export const runtime = "nodejs";

const bodySchema = z.object({
  confirmation: z.literal("DELETE MY ACCOUNT"),
});

export async function POST(req: NextRequest) {
  const auth = await requireOwnerSession();
  if ("error" in auth) return auth.error;

  const { session } = auth;

  const rl = rateLimitHit("account_delete", session.sub, 3, 24 * 60 * 60 * 1000);
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
    return jsonError(
      "validation_error",
      'Type DELETE MY ACCOUNT exactly to confirm permanent deletion.',
      422,
    );
  }

  const businessId = session.bid;

  try {
    await prisma.$transaction(async (tx) => {
      const roles = await tx.userBusinessRole.findMany({
        where: { businessId },
        select: { userId: true },
      });
      const userIds = [...new Set(roles.map((r) => r.userId))];

      const links = await tx.previewLink.findMany({
        where: { businessId },
        select: { token: true },
      });
      const tokens = links.map((l) => l.token);
      if (tokens.length) {
        await tx.previewFeedback.deleteMany({
          where: { previewToken: { in: tokens } },
        });
      }
      await tx.previewLink.deleteMany({ where: { businessId } });
      await tx.pendingVerification.deleteMany({
        where: {
          OR: [{ businessId }, { userId: { in: userIds } }],
        },
      });
      await tx.accountContactChallenge.deleteMany({
        where: { userId: { in: userIds } },
      });

      await tx.business.delete({ where: { id: businessId } });

      for (const uid of userIds) {
        const remaining = await tx.userBusinessRole.count({ where: { userId: uid } });
        if (remaining === 0) {
          await tx.user.delete({ where: { id: uid } });
        }
      }
    });
  } catch (e) {
    console.error("[account/delete]", e);
    return jsonError("server_error", "Could not delete the account. Try again or contact support.", 500);
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  return jsonOk({ status: "deleted", redirect: "/" });
}
