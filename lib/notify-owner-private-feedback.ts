import { sendTransactionalEmail } from "@/lib/email";
import { appUrl } from "@/lib/env";
import { sendTransactionalSms } from "@/lib/twilio";

/**
 * Alert business owner when a customer submits low-star private feedback (≤3★).
 * Sends email and/or SMS when those channels are configured on the account.
 * Failures are logged; callers should wrap in try/catch if they must not throw.
 */
export async function notifyOwnerPrivateFeedback(opts: {
  businessName: string;
  ownerEmail?: string | null;
  ownerPhoneE164?: string | null;
  rating: number;
  privateMessage: string;
}): Promise<void> {
  const dashboardUrl = `${appUrl().replace(/\/$/, "")}/dashboard`;
  const subject = `[Hatsoffly] Private feedback (${opts.rating}★) — ${opts.businessName}`;
  const textBody = [
    `Someone left private feedback for ${opts.businessName}.`,
    "",
    `Rating: ${opts.rating} / 5`,
    "",
    "Message:",
    opts.privateMessage,
    "",
    `Open your dashboard: ${dashboardUrl}`,
  ].join("\n");

  const smsBody =
    `Hatsoffly: ${opts.rating}★ private feedback for "${truncate(
      opts.businessName,
      36,
    )}". View: ${dashboardUrl}`.slice(0, 480);

  const tasks: Promise<unknown>[] = [];
  const email = opts.ownerEmail?.trim();
  const phone = opts.ownerPhoneE164?.trim();
  if (email) {
    tasks.push(
      sendTransactionalEmail({
        to: email,
        subject,
        text: textBody,
      }),
    );
  }
  if (phone) {
    tasks.push(sendTransactionalSms(phone, smsBody));
  }
  if (tasks.length === 0) {
    console.warn(
      "[preview feedback] owner has no email or phone — skipped notify",
      opts.businessName,
    );
    return;
  }
  await Promise.all(tasks);
}

function truncate(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}
