import { cookies } from "next/headers";
import { jsonError, jsonOk } from "@/lib/api-envelope";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";
import { buildBusinessReportSummary, resolveRangeDays, resolveStarFilter } from "@/lib/reports";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (!raw) return jsonError("unauthorized", "Not signed in.", 401);
  const session = await verifySessionToken(raw);
  if (!session) return jsonError("unauthorized", "Session expired.", 401);

  const u = new URL(req.url);
  const rangeDays = resolveRangeDays(u.searchParams.get("range_days"));
  const star = resolveStarFilter(u.searchParams.get("star"));

  const summary = await buildBusinessReportSummary({
    businessId: session.bid,
    rangeDays,
    star,
  });

  return jsonOk(summary);
}
