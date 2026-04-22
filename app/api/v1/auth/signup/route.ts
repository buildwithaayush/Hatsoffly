import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/api-envelope";
import { maskPhoneE164, parseUsCaMobile } from "@/lib/phone";
import { isDisposableEmail } from "@/lib/disposable-email";
import { rateLimitHit } from "@/lib/rate-limit";
import { placeDetails } from "@/lib/places";
import { industryToTemplateVoice, primaryTypeToIndustry } from "@/lib/industry";
import { twilioLookupLineType, verifyStartSms } from "@/lib/twilio";
import { newPendingVerificationToken } from "@/lib/token";
import { isMockIntegrations } from "@/lib/env";
import {
  assertProductionSmsOrExplain,
  googleMapsConfigured,
  requiresGoogleMapsForSignup,
} from "@/lib/integration-config";
import { PlacesApiError } from "@/lib/places";
import { BusinessRole } from "@prisma/client";

export const runtime = "nodejs";

const manualAddressSchema = z.object({
  business_name: z.string().min(1).max(120),
  street: z.string().min(1).max(120),
  city: z.string().min(1).max(80),
  state: z.string().min(2).max(2),
  zip: z.string().min(3).max(12),
});

const signupSchema = z
  .object({
    full_name: z.string().min(2).max(80),
    email: z.string().email(),
    phone_e164: z.string().min(10),
    place_id: z.string().min(1).optional(),
    manual_address: manualAddressSchema.optional().nullable(),
    auth_provider: z.enum(["email", "google"]).default("email"),
    oauth_pending_token: z.string().nullable().optional(),
    tos_version: z.string().min(1),
    captcha_token: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    if (!val.place_id && !val.manual_address) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Either place_id or manual_address is required.",
        path: ["place_id"],
      });
    }
    if (val.place_id && val.manual_address) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide either place_id or manual_address, not both.",
        path: ["manual_address"],
      });
    }
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

async function signupHandler(req: NextRequest) {
  const ip = clientIp(req);
  const rlIp = rateLimitHit("signup:ip", ip, 5, 60 * 60 * 1000);
  if (!rlIp.ok) {
    return jsonError("rate_limited", `Too many attempts. Try again in ${rlIp.retryAfterSec}s.`, 429);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("validation_error", "Invalid JSON body.", 400);
  }

  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("validation_error", "Invalid request.", 422, {
      issues: parsed.error.flatten(),
    });
  }

  const data = parsed.data;
  const emailNorm = data.email.trim().toLowerCase();
  const rlEmail = rateLimitHit("signup:email", emailNorm, 3, 60 * 60 * 1000);
  if (!rlEmail.ok) {
    return jsonError("rate_limited", `Too many attempts. Try again in ${rlEmail.retryAfterSec}s.`, 429);
  }

  const domain = emailNorm.split("@")[1] ?? "";
  if (isDisposableEmail(domain)) {
    return jsonError("disposable_email", "Please use a work email address.", 422);
  }

  const existing = await prisma.user.findUnique({ where: { email: emailNorm } });
  if (existing) {
    return jsonError("email_exists", "Looks like you already have an account — sign in here.", 409);
  }

  const phone = parseUsCaMobile(data.phone_e164);
  if (!phone.ok) {
    return jsonError(
      phone.reason === "unsupported_region" ? "unsupported_region" : "invalid_phone",
      phone.reason === "unsupported_region"
        ? "US and Canada only for now."
        : "Enter a valid mobile number.",
      422,
    );
  }

  const lineType = await twilioLookupLineType(phone.e164);
  if (lineType === "landline") {
    return jsonError(
      "landline_rejected",
      "Looks like a landline — we need a mobile number to text you a code.",
      422,
    );
  }

  const smsMisconfig = assertProductionSmsOrExplain();
  if (smsMisconfig) {
    return jsonError("integrations_not_configured", smsMisconfig, 503);
  }

  if (
    !isMockIntegrations() &&
    requiresGoogleMapsForSignup(data.place_id ?? undefined) &&
    !googleMapsConfigured()
  ) {
    return jsonError(
      "maps_not_configured",
      "Add GOOGLE_MAPS_API_KEY for business search, or use manual address instead.",
      503,
    );
  }

  let locationPayload: {
    name: string;
    googlePlaceId: string | null;
    formattedAddress: string | null;
    latitude: number | null;
    longitude: number | null;
    googleReviewUrl: string | null;
    googlePrimaryType: string | null;
    timezone: string;
    businessPhone: string | null;
    needsGbpAssistance: boolean;
    industryPrimaryType: string | null;
  };

  if (data.manual_address) {
    const m = data.manual_address;
    const formatted = `${m.street}, ${m.city}, ${m.state} ${m.zip}`;
    locationPayload = {
      name: m.business_name,
      googlePlaceId: null,
      formattedAddress: formatted,
      latitude: null,
      longitude: null,
      googleReviewUrl: null,
      googlePrimaryType: null,
      timezone: "America/New_York",
      businessPhone: null,
      needsGbpAssistance: true,
      industryPrimaryType: null,
    };
  } else if (data.place_id) {
    try {
      const details = await placeDetails(data.place_id);
      if (!details) {
        return jsonError(
          "places_unavailable",
          "Could not load that place — try manual address entry.",
          422,
        );
      }
      const reviewUrl = details.google_review_url;
      locationPayload = {
        name: details.name,
        googlePlaceId: data.place_id,
        formattedAddress: details.formatted_address,
        latitude: details.latitude,
        longitude: details.longitude,
        googleReviewUrl: reviewUrl,
        googlePrimaryType: details.primary_type,
        timezone: details.timezone,
        businessPhone: details.international_phone_number,
        needsGbpAssistance: !reviewUrl,
        industryPrimaryType: details.primary_type,
      };
    } catch (e) {
      if (e instanceof PlacesApiError) {
        const hint =
          e.googleMessage ??
          `Google Places error (${e.googleStatus ?? "unknown"}). Enable Places API, billing, and check API key restrictions.`;
        return jsonError("places_unavailable", hint, 422);
      }
      return jsonError(
        "places_unavailable",
        "Business search is down — enter your address manually.",
        503,
      );
    }
  } else {
    return jsonError("validation_error", "Missing business location.", 400);
  }

  const industry = primaryTypeToIndustry(locationPayload.industryPrimaryType);
  const templateVoice = industryToTemplateVoice(industry);

  const pvt = newPendingVerificationToken();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  const mockCode = isMockIntegrations()
    ? process.env.MOCK_VERIFY_CODE ?? "123456"
    : undefined;

  try {
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: emailNorm,
          fullName: data.full_name.trim(),
          phoneE164: phone.e164,
          phoneLineType: lineType === "unknown" ? "unknown" : lineType,
          authProvider: data.auth_provider,
        },
      });

      const business = await tx.business.create({
        data: {
          name: locationPayload.name,
          industry,
          primaryContactUserId: user.id,
          status: "onboarding",
          tosAcceptedAt: new Date(),
          tosVersion: data.tos_version,
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          templateVoice,
        },
      });

      await tx.userBusinessRole.create({
        data: {
          userId: user.id,
          businessId: business.id,
          role: BusinessRole.owner,
        },
      });

      await tx.location.create({
        data: {
          businessId: business.id,
          name: locationPayload.name,
          googlePlaceId: locationPayload.googlePlaceId,
          formattedAddress: locationPayload.formattedAddress,
          latitude: locationPayload.latitude ?? undefined,
          longitude: locationPayload.longitude ?? undefined,
          googleReviewUrl: locationPayload.googleReviewUrl,
          googlePrimaryType: locationPayload.googlePrimaryType,
          timezone: locationPayload.timezone,
          businessPhone: locationPayload.businessPhone,
          needsGbpAssistance: locationPayload.needsGbpAssistance,
          isPrimary: true,
          active: true,
        },
      });

      const loc = await tx.location.findFirstOrThrow({
        where: { businessId: business.id, isPrimary: true },
      });

      await tx.pendingVerification.create({
        data: {
          id: pvt,
          userId: user.id,
          businessId: business.id,
          locationId: loc.id,
          purpose: "signup",
          mockCode,
          expiresAt,
        },
      });
    });

    let verifySid: string | undefined;
    try {
      const r = await verifyStartSms(phone.e164);
      verifySid = r.sid;
    } catch {
      try {
        const r = await verifyStartSms(phone.e164);
        verifySid = r.sid;
      } catch {
        const pending = await prisma.pendingVerification.findUnique({
          where: { id: pvt },
        });
        if (pending) {
          await prisma.userBusinessRole.deleteMany({
            where: { userId: pending.userId },
          });
          await prisma.location.deleteMany({
            where: { businessId: pending.businessId },
          });
          await prisma.pendingVerification.delete({ where: { id: pvt } });
          await prisma.business.delete({ where: { id: pending.businessId } });
          await prisma.user.delete({ where: { id: pending.userId } });
        }
        return jsonError(
          "twilio_unavailable",
          "We're having trouble sending your code. Try again in a minute.",
          503,
        );
      }
    }

    if (verifySid) {
      await prisma.pendingVerification.update({
        where: { id: pvt },
        data: { verifySid },
      });
    }
  } catch (e) {
    console.error(e);
    return jsonError("downstream_unavailable", "Could not complete signup. Try again.", 503);
  }

  const masked = maskPhoneE164(phone.e164);

  return jsonOk(
    {
      pending_verification_token: pvt,
      phone_masked: masked,
      first_name: firstToken(data.full_name),
      expires_in_sec: 900,
    },
    { status: 202 },
  );
}

export async function POST(req: NextRequest) {
  try {
    return await signupHandler(req);
  } catch (e: unknown) {
    console.error("[signup]", e);
    const prismaCode =
      typeof e === "object" && e !== null && "code" in e
        ? String((e as { code: unknown }).code)
        : "";
    const errMsg = e instanceof Error ? e.message : "";
    const dbLikely =
      prismaCode.startsWith("P") ||
      /P1001|P1017|connect|ECONNREFUSED|database|timeout|PrismaClient|Can't reach database/i.test(
        errMsg,
      );
    return jsonError(
      "server_error",
      dbLikely
        ? "Database unreachable — open Vercel → Settings → Environment Variables and set DATABASE_URL for this environment (Preview uses Preview vars; Production uses Production vars). Then redeploy."
        : "Signup failed unexpectedly. Try again.",
      503,
    );
  }
}
