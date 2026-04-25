import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/api-envelope";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";
import { buildBusinessReportSummary, resolveRangeDays, resolveStarFilter } from "@/lib/reports";
import { buildReportPdf } from "@/lib/report-pdf";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (!raw) return jsonError("unauthorized", "Not signed in.", 401);
  const session = await verifySessionToken(raw);
  if (!session) return jsonError("unauthorized", "Session expired.", 401);

  const business = await prisma.business.findUnique({
    where: { id: session.bid },
    include: { primaryContact: { select: { email: true } } },
  });
  if (!business) return jsonError("not_found", "Business not found.", 404);

  const u = new URL(req.url);
  const rangeDays = resolveRangeDays(u.searchParams.get("range_days"));
  const star = resolveStarFilter(u.searchParams.get("star"));

  const summary = await buildBusinessReportSummary({
    businessId: session.bid,
    rangeDays,
    star,
  });

  const bytes = await buildReportPdf({
    businessName: business.name,
    ownerEmail: business.primaryContact.email,
    cycleLabel: `${rangeDays}-day report`,
    summary,
  });

  const filename = `hatsoffly-report-${rangeDays}d-${new Date().toISOString().slice(0, 10)}.pdf`;
  return new Response(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
