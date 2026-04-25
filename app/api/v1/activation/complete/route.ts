import { NextRequest } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { BusinessStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/api-envelope";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";
import { firstNameFromFull } from "@/lib/person-name";
import { sendTestSms } from "@/lib/twilio";

export const runtime = "nodejs";

const bodySchema = z.object({
  tool: z.enum(["quickbooks", "jobber", "square", "housecall", "other"]),
  tool_other: z.string().max(200).optional().nullable(),
  trigger: z.enum(["payment", "job", "appointment", "other_trigger"]),
  trigger_other: z.string().max(2000).optional().nullable(),
  google_review_url: z.string().min(8).max(2048),
  setup_path: z.enum(["self_serve", "concierge"]),
});

function normalizeUrl(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  try {
    const u = new URL(t.startsWith("http") ? t : `https://${t}`);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (!raw) {
    return jsonError("unauthorized", "Not signed in.", 401);
  }

  const session = await verifySessionToken(raw);
  if (!session) {
    return jsonError("unauthorized", "Session expired.", 401);
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return jsonError("validation_error", "Invalid JSON.", 400);
  }

  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) {
    return jsonError("validation_error", "Invalid activation payload.", 422);
  }

  const d = parsed.data;
  if (d.tool === "other" && !(d.tool_other?.trim().length ?? 0)) {
    return jsonError("validation_error", "tool_other required when tool is other.", 422);
  }
  if (d.trigger === "other_trigger" && !(d.trigger_other?.trim().length ?? 0)) {
    return jsonError(
      "validation_error",
      "trigger_other required when trigger is other_trigger.",
      422,
    );
  }

  const googleUrl = normalizeUrl(d.google_review_url);
  if (!googleUrl) {
    return jsonError("validation_error", "Invalid google_review_url.", 422);
  }

  const business = await prisma.business.findFirst({
    where: {
      id: session.bid,
      roles: { some: { userId: session.sub } },
    },
    include: { locations: true },
  });

  if (!business) {
    return jsonError("not_found", "Business not found.", 404);
  }

  const primary =
    business.locations.find((l) => l.isPrimary) ?? business.locations[0];

  await prisma.$transaction(async (tx) => {
    await tx.business.update({
      where: { id: business.id },
      data: {
        activationTool: d.tool,
        activationToolOther:
          d.tool === "other" ? d.tool_other!.trim() : null,
        activationTrigger: d.trigger,
        activationTriggerOther:
          d.trigger === "other_trigger" ? d.trigger_other!.trim() : null,
        activationSetupPath: d.setup_path,
        activationCompletedAt: new Date(),
        status:
          business.status === BusinessStatus.onboarding
            ? BusinessStatus.active
            : business.status,
      },
    });

    if (primary) {
      await tx.location.update({
        where: { id: primary.id },
        data: { googleReviewUrl: googleUrl },
      });
    }

    await tx.previewLink.updateMany({
      where: {
        businessId: business.id,
        expiresAt: { gt: new Date() },
      },
      data: { googleReviewUrl: googleUrl },
    });
  });

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.sub },
    });
    const preview = await prisma.previewLink.findFirst({
      where: {
        businessId: business.id,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });
    if (user && preview) {
      await sendTestSms({
        toE164: user.phoneE164,
        firstName: firstNameFromFull(user.fullName),
        businessName: business.name,
        previewPathToken: preview.token,
        voice: business.templateVoice,
      });
    }
  } catch (e) {
    console.error("[activation/complete] demo sms", e);
  }

  return jsonOk({
    status: "saved",
    business_id: business.id,
  });
}
