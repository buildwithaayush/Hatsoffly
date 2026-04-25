/**
 * Transactional email via Resend (`RESEND_API_KEY`).
 * Without a key, logs to the server console (same pattern as SMS mocks).
 */
export async function sendTransactionalEmail(opts: {
  to: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: { filename: string; contentBase64: string; contentType?: string }[];
}): Promise<void> {
  const key = process.env.RESEND_API_KEY?.trim();
  const from =
    process.env.RESEND_FROM_EMAIL?.trim() ??
    process.env.RESEND_FROM?.trim() ??
    "Hatsoffly <onboarding@resend.dev>";

  if (!key) {
    console.info(
      "[email mock — set RESEND_API_KEY to send]\nTo: %s\nSubject: %s\n\n%s",
      opts.to,
      opts.subject,
      opts.text,
    );
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [opts.to],
      subject: opts.subject,
      text: opts.text,
      html:
        opts.html ??
        `<pre style="font-family:system-ui,sans-serif;white-space:pre-wrap">${escapeHtml(
          opts.text,
        )}</pre>`,
      attachments: opts.attachments?.map((a) => ({
        filename: a.filename,
        content: a.contentBase64,
        type: a.contentType ?? "application/octet-stream",
      })),
    }),
    signal: AbortSignal.timeout(12_000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`resend_failed: ${res.status} ${errText.slice(0, 200)}`);
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
