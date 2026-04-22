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
  });
}
