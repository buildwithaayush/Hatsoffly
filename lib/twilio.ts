import { isMockIntegrations, appUrl } from "./env";
import type { TemplateVoice } from "@prisma/client";
import { interpolateTestSms, type TemplateVariant } from "@/lib/templates";

const MOCK_SID = "SM_MOCK_SID";

/** Outbound Messaging not configured — verify route surfaces this to the client. */
export const TWILIO_MESSAGING_NOT_CONFIGURED = "TWILIO_MESSAGING_NOT_CONFIGURED";

export async function twilioLookupLineType(_e164: string): Promise<
  "mobile" | "voip" | "unknown" | "landline"
> {
  if (isMockIntegrations()) return "mobile";
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !token) return "unknown";

  const url = `https://lookups.twilio.com/v2/PhoneNumbers/${encodeURIComponent(_e164)}?Fields=line_type_intelligence`;
  const res = await fetch(url, {
    headers: {
      Authorization:
        "Basic " + Buffer.from(`${accountSid}:${token}`).toString("base64"),
    },
    signal: AbortSignal.timeout(3000),
  }).catch(() => null);

  if (!res?.ok) return "unknown";
  const data = (await res.json()) as {
    line_type_intelligence?: { type?: string };
  };
  const t = data.line_type_intelligence?.type?.toLowerCase();
  if (t === "landline") return "landline";
  if (t === "mobile") return "mobile";
  if (t === "voip" || t === "non_fixed_voip") return "voip";
  return "unknown";
}

export async function verifyStartSms(toE164: string): Promise<{ sid?: string }> {
  if (isMockIntegrations()) return { sid: "VE_mock" };
  const sid = process.env.TWILIO_VERIFY_SERVICE_SID;
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !accountSid || !token) {
    throw new Error("twilio_verify_not_configured");
  }

  const body = new URLSearchParams({ To: toE164, Channel: "sms" });
  const res = await fetch(
    `https://verify.twilio.com/v2/Services/${sid}/Verifications`,
    {
      method: "POST",
      headers: {
        Authorization:
          "Basic " + Buffer.from(`${accountSid}:${token}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
      signal: AbortSignal.timeout(5000),
    },
  );
  if (!res.ok) throw new Error("twilio_verify_start_failed");
  const data = (await res.json()) as { sid?: string };
  return { sid: data.sid };
}

export async function verifyCheckCode(toE164: string, code: string): Promise<boolean> {
  if (isMockIntegrations()) {
    const expected = process.env.MOCK_VERIFY_CODE ?? "123456";
    return code === expected;
  }
  const sid = process.env.TWILIO_VERIFY_SERVICE_SID;
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !accountSid || !token) return false;

  const body = new URLSearchParams({ To: toE164, Code: code });
  const res = await fetch(
    `https://verify.twilio.com/v2/Services/${sid}/VerificationCheck`,
    {
      method: "POST",
      headers: {
        Authorization:
          "Basic " + Buffer.from(`${accountSid}:${token}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
      signal: AbortSignal.timeout(5000),
    },
  );
  if (!res.ok) return false;
  const data = (await res.json()) as { status?: string };
  return data.status === "approved";
}

export async function sendTestSms(opts: {
  toE164: string;
  firstName: string;
  businessName: string;
  previewPathToken: string;
  voice: TemplateVoice;
  /** Same variants as production customer SMS (`config/templates/v1`). */
  variant?: TemplateVariant;
}) {
  const variant: TemplateVariant = opts.variant ?? "location_only";
  const shortLink = `${appUrl().replace(/\/$/, "")}/t/${opts.previewPathToken}`;
  let body: string;
  try {
    body =
      interpolateTestSms({
        voice: opts.voice,
        variant,
        custFirst: opts.firstName,
        bizName: opts.businessName,
        shortLink,
      }) + "\n\nReply STOP to opt out.";
  } catch {
    body =
      `Hi ${opts.firstName}! We'd love your feedback on ${opts.businessName}: ${shortLink}\n\nReply STOP to opt out.`;
  }

  const message = body;

  if (isMockIntegrations()) {
    console.info("[MOCK SMS to %s]\n%s", opts.toE164, message);
    return { sid: MOCK_SID };
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_MESSAGING_FROM;
  if (!accountSid || !token || !from) {
    throw new Error(TWILIO_MESSAGING_NOT_CONFIGURED);
  }

  const formBody = new URLSearchParams({
    To: opts.toE164,
    From: from,
    Body: message,
  });

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization:
          "Basic " + Buffer.from(`${accountSid}:${token}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formBody,
      signal: AbortSignal.timeout(8000),
    },
  );
  if (!res.ok) throw new Error("twilio_sms_failed");
  const data = (await res.json()) as { sid?: string };
  return { sid: data.sid ?? MOCK_SID };
}

/** Short transactional SMS (alerts, not marketing). Uses same Messaging sender as test SMS. */
export async function sendTransactionalSms(
  toE164: string,
  body: string,
): Promise<{ sid?: string }> {
  const message = body.trim().slice(0, 1530);
  if (isMockIntegrations()) {
    console.info("[MOCK transactional SMS to %s]\n%s", toE164, message);
    return { sid: MOCK_SID };
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_MESSAGING_FROM;
  if (!accountSid || !token || !from) {
    console.warn(
      "[Transactional SMS skipped — set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_MESSAGING_FROM]",
    );
    return { sid: MOCK_SID };
  }

  const formBody = new URLSearchParams({
    To: toE164,
    From: from,
    Body: message,
  });

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization:
          "Basic " + Buffer.from(`${accountSid}:${token}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formBody,
      signal: AbortSignal.timeout(8000),
    },
  );
  if (!res.ok) throw new Error("twilio_transactional_sms_failed");
  const data = (await res.json()) as { sid?: string };
  return { sid: data.sid ?? MOCK_SID };
}
