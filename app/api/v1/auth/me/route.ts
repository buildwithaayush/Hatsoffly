import { cookies } from "next/headers";
import { BusinessRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/api-envelope";
import {
  SESSION_COOKIE,
  sessionCookieMaxAgeSec,
  sessionRollingRenewThresholdSec,
  signSessionToken,
  verifySessionTokenWithExpiry,
} from "@/lib/auth";
import { appUrl } from "@/lib/env";
import { interpolateTestSms } from "@/lib/templates";
import { formatActivationTrigger } from "@/lib/format-activation";

export const runtime = "nodejs";

function firstNameToken(full: string): string {
  const t = full.trim().split(/\s+/)[0];
  return t || full;
}

export async function GET() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (!raw) {
    return jsonError("unauthorized", "Not signed in.", 401);
  }

  const verified = await verifySessionTokenWithExpiry(raw);
  if (!verified) {
    return jsonError("unauthorized", "Session expired.", 401);
  }

  const session = verified.claims;
  const nowSec = Math.floor(Date.now() / 1000);
  const remainingSec = verified.exp - nowSec;
  const renewBelow = sessionRollingRenewThresholdSec();
  if (remainingSec > 0 && remainingSec <= renewBelow) {
    const newToken = await signSessionToken({
      sub: session.sub,
      bid: session.bid,
      lid: session.lid,
      role: session.role,
    });
    cookieStore.set(SESSION_COOKIE, newToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: sessionCookieMaxAgeSec(),
    });
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

  let previewTokenList: string[] = [];

  if (business) {
    const tokens = await prisma.previewLink.findMany({
      where: { businessId: business.id },
      select: { token: true },
    });
    previewTokenList = tokens.map((t) => t.token);
    const tokenList = previewTokenList;
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

  const locations = business
    ? business.locations.map((l) => ({
        id: l.id,
        name: l.name,
        formatted_address: l.formattedAddress,
        is_primary: l.isPrimary,
        active: l.active,
      }))
    : [];

  const teamRoles = business
    ? await prisma.userBusinessRole.findMany({
        where: { businessId: business.id },
        include: {
          user: { select: { id: true, fullName: true, email: true } },
        },
        orderBy: { createdAt: "asc" },
      })
    : [];

  let feedback_avg_rating: number | null = null;
  let sms_preview_sample: string | null = null;
  let timing_summary: string | null = null;

  if (business && previewTokenList.length > 0) {
    const agg = await prisma.previewFeedback.aggregate({
      where: { previewToken: { in: previewTokenList } },
      _avg: { rating: true },
    });
    if (agg._avg.rating != null) {
      feedback_avg_rating = Math.round(Number(agg._avg.rating) * 10) / 10;
    }
  }

  if (business) {
    try {
      sms_preview_sample = interpolateTestSms({
        voice: business.templateVoice,
        variant: "location_only",
        custFirst: firstNameToken(user.fullName),
        bizName: business.name,
        shortLink: `${appUrl().replace(/\/$/, "")}/t/···`,
      });
    } catch {
      sms_preview_sample = `Hi ${firstNameToken(user.fullName)} — quick moment about today's visit from ${business.name}. Tap: ${appUrl().replace(/\/$/, "")}/t/···`;
    }
    timing_summary = formatActivationTrigger(
      business.activationTrigger,
      business.activationTriggerOther,
    );
  }

  return jsonOk({
    is_account_owner: session.role === BusinessRole.owner,
    user: {
      id: user.id,
      email: user.email,
      full_name: user.fullName,
      phone_e164: user.phoneE164,
      phone_verified_at: user.phoneVerifiedAt?.toISOString() ?? null,
      email_verified_at: user.emailVerifiedAt?.toISOString() ?? null,
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
    locations,
    team: teamRoles.map((t) => ({
      user_id: t.userId,
      full_name: t.user.fullName,
      email: t.user.email,
      role: t.role,
    })),
    feedback_avg_rating,
    sms_preview_sample,
    timing_summary,
  });
}
