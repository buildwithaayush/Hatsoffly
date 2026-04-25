import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/api-envelope";
import { buildBusinessReportSummary } from "@/lib/reports";
import { buildReportPdf } from "@/lib/report-pdf";
import { sendTransactionalEmail } from "@/lib/email";

export const runtime = "nodejs";

function getCycleWindow(cycle: "weekly" | "monthly", now = new Date()) {
  if (cycle === "weekly") {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const day = d.getUTCDay(); // 0 Sunday
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const periodEnd = new Date(d);
    periodEnd.setUTCDate(d.getUTCDate() + mondayOffset);
    const periodStart = new Date(periodEnd);
    periodStart.setUTCDate(periodEnd.getUTCDate() - 7);
    return { periodStart, periodEnd, rangeDays: 7 as const };
  }
  const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const periodStart = new Date(Date.UTC(periodEnd.getUTCFullYear(), periodEnd.getUTCMonth() - 1, 1));
  return { periodStart, periodEnd, rangeDays: 30 as const };
}

export async function POST(req: Request) {
  const cronSecret =
    process.env.REPORTS_CRON_SECRET?.trim() ??
    process.env.CRON_SECRET?.trim();
  if (!cronSecret) {
    return jsonError("misconfigured", "REPORTS_CRON_SECRET/CRON_SECRET missing.", 503);
  }
  const h = req.headers;
  const provided =
    h.get("x-cron-secret") ??
    h.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    "";
  if (provided !== cronSecret) {
    return jsonError("unauthorized", "Invalid cron secret.", 401);
  }

  const u = new URL(req.url);
  const cycle = u.searchParams.get("cycle") === "monthly" ? "monthly" : "weekly";
  const { periodStart, periodEnd, rangeDays } = getCycleWindow(cycle);

  const businesses = await prisma.business.findMany({
    where: { primaryContactUserId: { not: "" } },
    include: { primaryContact: { select: { email: true } } },
  });

  let sent = 0;
  for (const b of businesses) {
    const already = await prisma.reportDispatch.findUnique({
      where: {
        businessId_cycle_periodStart: {
          businessId: b.id,
          cycle,
          periodStart,
        },
      },
    });
    if (already) continue;

    const summary = await buildBusinessReportSummary({
      businessId: b.id,
      rangeDays,
      star: null,
    });
    const bytes = await buildReportPdf({
      businessName: b.name,
      ownerEmail: b.primaryContact.email,
      cycleLabel: `${cycle} report`,
      summary,
    });

    await sendTransactionalEmail({
      to: b.primaryContact.email,
      subject: `[Hatsoffly] ${b.name} ${cycle} report`,
      text: `Attached is your ${cycle} Hatsoffly report for ${b.name}.`,
      attachments: [
        {
          filename: `hatsoffly-${cycle}-report.pdf`,
          contentBase64: Buffer.from(bytes).toString("base64"),
          contentType: "application/pdf",
        },
      ],
    });

    await prisma.reportDispatch.create({
      data: {
        businessId: b.id,
        cycle,
        periodStart,
        periodEnd,
        sentTo: b.primaryContact.email,
      },
    });
    sent += 1;
  }

  return jsonOk({
    status: "ok",
    cycle,
    period_start: periodStart.toISOString(),
    period_end: periodEnd.toISOString(),
    sent,
  });
}
