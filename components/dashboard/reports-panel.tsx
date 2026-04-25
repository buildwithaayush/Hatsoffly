"use client";

import { useEffect, useMemo, useState } from "react";

type ReportItem = {
  rating: number;
  createdAt: string;
  privateMessage: string | null;
  previewToken: string;
};

type ReportSummary = {
  generatedAt: string;
  periodDays: 7 | 30 | 90;
  filterStar: number | null;
  totalSessions: number;
  avgRating: number | null;
  privateFeedbackCount: number;
  happyCount: number;
  starBreakdown: Record<"1" | "2" | "3" | "4" | "5", number>;
  recentItems: ReportItem[];
};

function starLabel(n: number) {
  return `${n}★`;
}

export function ReportsPanel({ ownerEmail }: { ownerEmail: string }) {
  const [rangeDays, setRangeDays] = useState<7 | 30 | 90>(30);
  const [star, setStar] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ReportSummary | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    let done = false;
    void (async () => {
      setLoading(true);
      setError(null);
      const q = new URLSearchParams({
        range_days: String(rangeDays),
      });
      if (star != null) q.set("star", String(star));
      try {
        const res = await fetch(`/api/v1/reports?${q.toString()}`, { cache: "no-store" });
        const json = (await res.json()) as ReportSummary & { error?: { message?: string } };
        if (!res.ok) throw new Error(json?.error?.message ?? "Could not load reports.");
        if (!done) setData(json);
      } catch (e) {
        if (!done) setError(e instanceof Error ? e.message : "Could not load reports.");
      } finally {
        if (!done) setLoading(false);
      }
    })();
    return () => {
      done = true;
    };
  }, [rangeDays, star]);

  const rows = useMemo(() => data?.recentItems ?? [], [data]);

  return (
    <section id="reports" className="mb-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Reports</h2>
          <p className="text-sm text-slate-600">
            Weekly and monthly PDFs are auto-emailed to <span className="font-semibold">{ownerEmail}</span>.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`/api/v1/reports/pdf?range_days=${rangeDays}${star != null ? `&star=${star}` : ""}`}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            Download PDF
          </a>
          <button
            type="button"
            disabled={sending}
            onClick={async () => {
              setSending(true);
              setHint(null);
              const res = await fetch("/api/v1/reports/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ range_days: rangeDays }),
              });
              const json = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
              if (!res.ok) {
                setHint(json?.error?.message ?? "Could not send report email.");
              } else {
                setHint("Report sent to owner email.");
              }
              setSending(false);
            }}
            className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {sending ? "Sending..." : "Send now"}
          </button>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase text-slate-500">Range</span>
        {[7, 30, 90].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setRangeDays(d as 7 | 30 | 90)}
            className={`rounded-full px-3 py-1 text-sm font-semibold ${
              rangeDays === d ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {d}d
          </button>
        ))}

        <span className="ml-4 text-xs font-semibold uppercase text-slate-500">Stars</span>
        <button
          type="button"
          onClick={() => setStar(null)}
          className={`rounded-full px-3 py-1 text-sm font-semibold ${
            star == null ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          All
        </button>
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStar(s)}
            className={`rounded-full px-3 py-1 text-sm font-semibold ${
              star === s ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {starLabel(s)}
          </button>
        ))}
      </div>

      {hint ? <p className="mb-4 text-sm font-semibold text-brand-700">{hint}</p> : null}
      {error ? <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p> : null}

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ReportStat label="Sessions" value={String(data?.totalSessions ?? 0)} />
        <ReportStat label="Average rating" value={data?.avgRating != null ? `${data.avgRating}` : "—"} />
        <ReportStat label="Private feedback" value={String(data?.privateFeedbackCount ?? 0)} />
        <ReportStat label="Happy path" value={String(data?.happyCount ?? 0)} />
      </div>

      <div className="mb-4 text-sm text-slate-700">
        <span className="font-semibold">Breakdown:</span>{" "}
        {`1★ ${data?.starBreakdown["1"] ?? 0} • 2★ ${data?.starBreakdown["2"] ?? 0} • 3★ ${data?.starBreakdown["3"] ?? 0} • 4★ ${data?.starBreakdown["4"] ?? 0} • 5★ ${data?.starBreakdown["5"] ?? 0}`}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200">
        <div className="grid grid-cols-[88px_140px_1fr] gap-3 bg-slate-50 px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-600">
          <span>Stars</span>
          <span>When</span>
          <span>Private note</span>
        </div>
        {loading ? (
          <div className="px-4 py-6 text-sm text-slate-500">Loading report...</div>
        ) : rows.length === 0 ? (
          <div className="px-4 py-6 text-sm text-slate-500">No feedback rows for selected filters.</div>
        ) : (
          rows.map((r) => (
            <div
              key={`${r.previewToken}-${r.createdAt}`}
              className="grid grid-cols-[88px_140px_1fr] gap-3 border-t border-slate-100 px-4 py-3 text-sm"
            >
              <span className="font-semibold text-slate-900">{r.rating}★</span>
              <span className="text-slate-600">{new Date(r.createdAt).toLocaleDateString()}</span>
              <span className="truncate text-slate-700">{r.privateMessage?.trim() || "—"}</span>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function ReportStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-extrabold text-slate-900">{value}</p>
    </div>
  );
}
