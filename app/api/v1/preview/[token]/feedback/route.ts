import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/api-envelope";
import { notifyOwnerPrivateFeedback } from "@/lib/notify-owner-private-feedback";

export const runtime = "nodejs";

const bodySchema = z.object({
  rating: z.number().int().min(1).max(5),
  private_message: z.string().max(4000).optional(),
});

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  if (!token?.trim()) {
    return jsonError("validation_error", "Missing token.", 422);
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return jsonError("validation_error", "Invalid JSON.", 400);
  }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return jsonError("validation_error", "Invalid feedback payload.", 422);
  }

  const { rating, private_message } = parsed.data;

  if (rating <= 3) {
    const msg = private_message?.trim() ?? "";
    if (msg.length < 8) {
      return jsonError(
        "validation_error",
        "Please share a few words so we can make it right (8+ characters).",
        422,
      );
    }
  }

  const link = await prisma.previewLink.findUnique({
    where: { token },
  });

  if (!link || link.expiresAt.getTime() < Date.now()) {
    return jsonError("expired", "This link expired or is invalid.", 410);
  }

  const existing = await prisma.previewFeedback.findUnique({
    where: { previewToken: token },
  });
  if (existing) {
    return jsonError("already_submitted", "You already responded via this link.", 409);
  }

  try {
    await prisma.previewFeedback.create({
      data: {
        previewToken: token,
        rating,
        privateMessage:
          rating <= 3 ? (private_message ?? "").trim() : null,
      },
    });
  } catch (e: unknown) {
    const code =
      typeof e === "object" &&
      e !== null &&
      "code" in e &&
      (e as { code?: string }).code === "P2002";
    if (code) {
      return jsonError("already_submitted", "You already responded.", 409);
    }
    throw e;
  }

  if (rating <= 3) {
    try {
      const biz = await prisma.business.findUnique({
        where: { id: link.businessId },
        include: {
          primaryContact: {
            select: { email: true, phoneE164: true },
          },
        },
      });
      const ownerEmail = biz?.primaryContact?.email?.trim();
      const ownerPhone = biz?.primaryContact?.phoneE164?.trim();
      const businessName = link.businessName.trim();
      const pm = (private_message ?? "").trim();
      if (pm.length > 0 && (ownerEmail || ownerPhone)) {
        await notifyOwnerPrivateFeedback({
          businessName,
          ownerEmail,
          ownerPhoneE164: ownerPhone,
          rating,
          privateMessage: pm,
        });
      }
    } catch (e) {
      console.error("[preview feedback owner notify]", e);
    }
  }

  return jsonOk({
    status: "recorded",
    path:
      rating >= 4
        ? "google"
        : "private",
  });
}
