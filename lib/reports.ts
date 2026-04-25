import { prisma } from "@/lib/prisma";

export type ReportRange = 7 | 30 | 90;

export type ReportItem = {
  rating: number;
  createdAt: string;
  privateMessage: string | null;
  previewToken: string;
};

export type ReportSummary = {
  generatedAt: string;
  periodDays: ReportRange;
  filterStar: number | null;
  totalSessions: number;
  avgRating: number | null;
  privateFeedbackCount: number;
  happyCount: number;
  starBreakdown: Record<"1" | "2" | "3" | "4" | "5", number>;
  recentItems: ReportItem[];
};

function toStarBreakdown(counts: Array<{ rating: number; _count: { rating: number } }>) {
  const base: Record<"1" | "2" | "3" | "4" | "5", number> = {
    "1": 0,
    "2": 0,
    "3": 0,
    "4": 0,
    "5": 0,
  };
  for (const c of counts) {
    if (c.rating >= 1 && c.rating <= 5) {
      base[String(c.rating) as "1" | "2" | "3" | "4" | "5"] = c._count.rating;
    }
  }
  return base;
}

export async function buildBusinessReportSummary(opts: {
  businessId: string;
  rangeDays: ReportRange;
  star?: number | null;
}): Promise<ReportSummary> {
  const rangeDays = opts.rangeDays;
  const rangeStart = new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000);

  const tokens = await prisma.previewLink.findMany({
    where: { businessId: opts.businessId },
    select: { token: true },
  });
  const tokenList = tokens.map((t) => t.token);
  if (tokenList.length === 0) {
    return {
      generatedAt: new Date().toISOString(),
      periodDays: rangeDays,
      filterStar: opts.star ?? null,
      totalSessions: 0,
      avgRating: null,
      privateFeedbackCount: 0,
      happyCount: 0,
      starBreakdown: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 },
      recentItems: [],
    };
  }

  const whereBase = {
    previewToken: { in: tokenList },
    createdAt: { gte: rangeStart },
  };
  const whereFiltered = opts.star
    ? { ...whereBase, rating: opts.star }
    : whereBase;

  const [agg, privateFeedbackCount, happyCount, breakdown, recentItems] =
    await Promise.all([
      prisma.previewFeedback.aggregate({
        where: whereBase,
        _avg: { rating: true },
        _count: { _all: true },
      }),
      prisma.previewFeedback.count({
        where: { ...whereBase, rating: { lte: 3 } },
      }),
      prisma.previewFeedback.count({
        where: { ...whereBase, rating: { gte: 4 } },
      }),
      prisma.previewFeedback.groupBy({
        by: ["rating"],
        where: whereBase,
        _count: { rating: true },
      }),
      prisma.previewFeedback.findMany({
        where: whereFiltered,
        select: {
          rating: true,
          createdAt: true,
          privateMessage: true,
          previewToken: true,
        },
        orderBy: { createdAt: "desc" },
        take: 40,
      }),
    ]);

  return {
    generatedAt: new Date().toISOString(),
    periodDays: rangeDays,
    filterStar: opts.star ?? null,
    totalSessions: agg._count._all,
    avgRating: agg._avg.rating != null ? Math.round(Number(agg._avg.rating) * 10) / 10 : null,
    privateFeedbackCount,
    happyCount,
    starBreakdown: toStarBreakdown(breakdown),
    recentItems: recentItems.map((i) => ({
      rating: i.rating,
      createdAt: i.createdAt.toISOString(),
      privateMessage: i.privateMessage,
      previewToken: i.previewToken,
    })),
  };
}

export function resolveRangeDays(raw: string | null): ReportRange {
  if (raw === "7") return 7;
  if (raw === "90") return 90;
  return 30;
}

export function resolveStarFilter(raw: string | null): number | null {
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > 5) return null;
  return n;
}
