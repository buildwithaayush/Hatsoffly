import { cookies } from "next/headers";
import { BusinessRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/api-envelope";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";
import { buildBusinessReportSummary, resolveRangeDays } from "@/lib/reports";
import { buildReportPdf } from "@/lib/report-pdf";
import { sendTransactionalEmail } from "@/lib/email";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (!raw) return jsonError("unauthorized", "Not signed in.", 401);
  const session = await verifySessionToken(raw);
  if (!session) return jsonError("unauthorized", "Session expired.", 401);
  if (session.role !== BusinessRole.owner) {
    return jsonError("forbidden", "Only the owner can email reports.", 403);
  }

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    /* optional body */
  }
  const rangeDays = resolveRangeDays(
    typeof body === "object" && body !== null && "range_days" in body
      ? String((body as { range_days?: unknown }).range_days ?? "")
      : null,
  );

  const business = await prisma.business.findUnique({
    where: { id: session.bid },
    include: { primaryContact: { select: { email: true } } },
  });
  if (!business) return jsonError("not_found", "Business not found.", 404);

  const summary = await buildBusinessReportSummary({
    businessId: session.bid,
    rangeDays,
    star: null,
  });

  const pdfBytes = await buildReportPdf({
    businessName: business.name,
    ownerEmail: business.primaryContact.email,
    cycleLabel: `${rangeDays}-day report`,
    summary,
  });

  await sendTransactionalEmail({
    to: business.primaryContact.email,
    subject: `[Hatsoffly] ${business.name} report (${rangeDays}d)`,
    text: `Attached is your ${rangeDays}-day Hatsoffly report for ${business.name}.`,
    attachments: [
      {
        filename: `hatsoffly-${rangeDays}d-report.pdf`,
        contentBase64: Buffer.from(pdfBytes).toString("base64"),
        contentType: "application/pdf",
      },
    ],
  });

  return jsonOk({ status: "sent", to: business.primaryContact.email });
}
