import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/api-envelope";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (!raw) {
    return jsonError("unauthorized", "Not signed in.", 401);
  }

  const session = await verifySessionToken(raw);
  if (!session) {
    return jsonError("unauthorized", "Session expired.", 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    include: {
      roles: {
        where: { businessId: session.bid },
        include: {
          business: {
            include: { locations: true },
          },
        },
      },
    },
  });

  if (!user) {
    return jsonError("unauthorized", "User not found.", 401);
  }

  const business = user.roles[0]?.business;
  const primary =
    business?.locations.find((l) => l.isPrimary) ?? business?.locations[0];

  const preview = business
    ? await prisma.previewLink.findFirst({
        where: {
          businessId: business.id,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: "desc" },
        select: { token: true },
      })
    : null;

  let feedback_stats:
    | {
        total_sessions: number;
        private_feedback_count: number;
        google_intent_count: number;
        preview_links_week: number;
        last_private_at: string | null;
      }
    | null = null;

  if (business) {
    const tokens = await prisma.previewLink.findMany({
      where: { businessId: business.id },
      select: { token: true },
    });
    const tokenList = tokens.map((t) => t.token);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const empty = tokenList.length === 0;

    const [
      total_sessions,
      private_feedback_count,
      google_intent_count,
      preview_links_week,
      lastPrivate,
    ] = await Promise.all([
      empty
        ? 0
        : prisma.previewFeedback.count({
            where: { previewToken: { in: tokenList } },
          }),
      empty
        ? 0
        : prisma.previewFeedback.count({
            where: {
              previewToken: { in: tokenList },
              rating: { lte: 3 },
            },
          }),
      empty
        ? 0
        : prisma.previewFeedback.count({
            where: {
              previewToken: { in: tokenList },
              rating: { gte: 4 },
            },
          }),
      prisma.previewLink.count({
        where: {
          businessId: business.id,
          createdAt: { gte: weekAgo },
        },
      }),
      empty
        ? null
        : prisma.previewFeedback.findFirst({
            where: {
              previewToken: { in: tokenList },
              rating: { lte: 3 },
            },
            orderBy: { createdAt: "desc" },
            select: { createdAt: true },
          }),
    ]);

    feedback_stats = {
      total_sessions,
      private_feedback_count,
      google_intent_count,
      preview_links_week,
      last_private_at: lastPrivate?.createdAt.toISOString() ?? null,
    };
  }

  return jsonOk({
    user: {
      id: user.id,
      email: user.email,
      full_name: user.fullName,
      phone_e164: user.phoneE164,
      phone_verified_at: user.phoneVerifiedAt?.toISOString() ?? null,
    },
    business: business
      ? {
          id: business.id,
          name: business.name,
          industry: business.industry,
          status: business.status,
          template_voice: business.templateVoice,
          trial_ends_at: business.trialEndsAt?.toISOString() ?? null,
          activation: {
            tool: business.activationTool,
            tool_other: business.activationToolOther,
            trigger: business.activationTrigger,
            trigger_other: business.activationTriggerOther,
            setup_path: business.activationSetupPath,
            completed_at: business.activationCompletedAt?.toISOString() ?? null,
          },
        }
      : null,
    primary_location: primary
      ? {
          id: primary.id,
          name: primary.name,
          formatted_address: primary.formattedAddress,
          google_review_url: primary.googleReviewUrl,
          timezone: primary.timezone,
          needs_gbp_assistance: primary.needsGbpAssistance,
        }
      : null,
    preview_link: preview
      ? {
          token: preview.token,
          customer_path: `/t/${preview.token}`,
        }
      : null,
    feedback_stats,
  });
}
