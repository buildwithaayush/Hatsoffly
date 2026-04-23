"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  formatActivationTool,
  formatActivationTrigger,
  formatIndustry,
  formatSetupPath,
} from "@/lib/format-activation";

type MeResponse = {
  user?: {
    email: string;
    full_name: string;
    phone_e164: string;
  };
  business?: {
    id: string;
    name: string;
    industry: string;
    status: string;
    template_voice: string;
    trial_ends_at: string | null;
    activation: {
      tool: string | null;
      tool_other: string | null;
      trigger: string | null;
      trigger_other: string | null;
      setup_path: string | null;
      completed_at: string | null;
    };
  };
  primary_location?: {
    formatted_address: string | null;
    google_review_url: string | null;
    needs_gbp_assistance: boolean;
    timezone: string;
  };
  preview_link?: {
    token: string;
    customer_path: string;
  } | null;
  feedback_stats?: {
    total_sessions: number;
    private_feedback_count: number;
    google_intent_count: number;
    preview_links_week: number;
    last_private_at: string | null;
  } | null;
  error?: { message?: string };
};

function firstName(full: string): string {
  const t = full.trim().split(/\s+/)[0];
  return t || "there";
}

function formatRelativeShort(d: Date): string {
  const sec = Math.round((Date.now() - d.getTime()) / 1000);
  if (sec < 45) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 36) return `${hr}h ago`;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function LiveStatusPill({ syncedAt }: { syncedAt: Date | null }) {
  if (!syncedAt) return null;
  return (
    <div className="flex shrink-0 flex-col items-end gap-1 sm:pt-1">
      <div className="flex items-center gap-2 rounded-full border border-emerald-300/70 bg-gradient-to-br from-emerald-50 to-teal-50 px-3.5 py-2 shadow-md shadow-emerald-900/10 ring-1 ring-emerald-200/60">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-35" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.65)]" />
        </span>
        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-900">
          Live
        </span>
      </div>
      <p className="max-w-[11rem] text-right text-[11px] font-medium leading-snug text-slate-500">
        Synced{" "}
        {syncedAt.toLocaleTimeString(undefined, {
          hour: "numeric",
          minute: "2-digit",
          second: "2-digit",
        })}
      </p>
    </div>
  );
}

export function DashboardExperience() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const welcomeParam = searchParams.get("welcome") === "1";
  const [data, setData] = useState<MeResponse | null>(null);
  const [copyHint, setCopyHint] = useState<string | null>(null);
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);
  const [clientReady, setClientReady] = useState(false);
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  const loadMe = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/auth/me", { cache: "no-store" });
      const json = (await res.json()) as MeResponse & {
        error?: { message?: string };
      };
      setLastSynced(new Date());
      if (!res.ok) {
        setData({
          error: {
            message:
              json?.error?.message ??
              "Could not load your session. Please log in again.",
          },
        });
        return;
      }
      setData(json);
    } catch {
      setLastSynced(new Date());
      setData({
        error: {
          message: "Could not load your session. Please log in again.",
        },
      });
    }
  }, []);

  useEffect(() => {
    const boot = window.setTimeout(() => {
      setClientReady(true);
      try {
        setWelcomeDismissed(
          sessionStorage.getItem("hf_welcome_banner_dismissed") === "1",
        );
      } catch {
        setWelcomeDismissed(false);
      }
    }, 0);
    return () => clearTimeout(boot);
  }, []);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | undefined;
    const boot = window.setTimeout(() => {
      const raw = data?.business?.trial_ends_at;
      if (!raw) {
        setTrialDaysLeft(null);
        return;
      }
      const tick = () => {
        const end = new Date(raw).getTime();
        const ms = end - Date.now();
        setTrialDaysLeft(ms <= 0 ? 0 : Math.ceil(ms / (24 * 60 * 60 * 1000)));
      };
      tick();
      intervalId = setInterval(tick, 60_000);
    }, 0);
    return () => {
      clearTimeout(boot);
      if (intervalId !== undefined) clearInterval(intervalId);
    };
  }, [data?.business?.trial_ends_at]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void loadMe();
    }, 0);
    return () => clearTimeout(t);
  }, [loadMe]);

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") void loadMe();
    };
    const id = setInterval(tick, 25_000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [loadMe]);

  const dismissWelcome = useCallback(() => {
    try {
      sessionStorage.setItem("hf_welcome_banner_dismissed", "1");
    } catch {
      /* ignore */
    }
    setWelcomeDismissed(true);
  }, []);

  const copyText = useCallback(async (successMessage: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyHint(successMessage);
      setTimeout(() => setCopyHint(null), 2200);
    } catch {
      setCopyHint("Copy failed — select and copy manually.");
      setTimeout(() => setCopyHint(null), 2500);
    }
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/v1/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }, [router]);

  const previewAbsUrl = useMemo(() => {
    if (typeof window === "undefined" || !data?.preview_link?.customer_path) {
      return "";
    }
    return `${window.location.origin}${data.preview_link.customer_path}`;
  }, [data?.preview_link?.customer_path]);

  const activationDone = !!data?.business?.activation?.completed_at;

  if (!data) {
    return (
      <div className="flex min-h-screen flex-col bg-gradient-to-b from-slate-50 to-white">
        <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-6xl items-center px-4 sm:px-6">
            <div className="h-8 w-32 animate-pulse rounded-lg bg-slate-200" />
          </div>
        </header>
        <div className="mx-auto mt-24 w-full max-w-6xl px-4 sm:px-6">
          <div className="h-10 w-64 animate-pulse rounded-lg bg-slate-200" />
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-36 animate-pulse rounded-2xl bg-slate-100"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (data.error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-6">
        <p className="text-center text-slate-700">{data.error.message}</p>
        <Link
          href="/login"
          className="rounded-xl bg-brand-600 px-5 py-3 font-semibold text-white shadow-sm hover:bg-brand-700"
        >
          Log in
        </Link>
      </div>
    );
  }

  const u = data.user;
  const b = data.business;
  const loc = data.primary_location;
  const act = b?.activation;
  const fs = data.feedback_stats ?? null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50/80">
      <header className="sticky top-0 z-40 border-b border-slate-200/90 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:h-[4.25rem] sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-lg font-bold tracking-tight text-brand-800 transition hover:text-brand-950"
            >
              Hatsoffly
            </Link>
            <span className="hidden rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-800 ring-1 ring-brand-200/80 sm:inline">
              Dashboard
            </span>
          </div>
          <nav className="flex items-center gap-2 sm:gap-3">
            <span className="hidden max-w-[200px] truncate text-sm text-slate-600 sm:inline">
              {u?.email}
            </span>
            <button
              type="button"
              onClick={() => logout()}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            >
              Sign out
            </button>
          </nav>
        </div>
      </header>

      {clientReady && welcomeParam && !welcomeDismissed ? (
        <div className="border-b border-brand-200/80 bg-gradient-to-r from-brand-50 via-emerald-50/90 to-teal-50/80">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <p className="font-semibold text-brand-950">
                You&apos;re live — test SMS sent
              </p>
              <p className="mt-1 text-sm text-brand-900/90">
                Check your phone for the preview link. That journey matches what
                customers see after a job.
              </p>
            </div>
            <button
              type="button"
              onClick={dismissWelcome}
              className="shrink-0 self-start rounded-lg bg-white/90 px-4 py-2 text-sm font-semibold text-brand-900 shadow-sm ring-1 ring-brand-200/80 transition hover:bg-white sm:self-center"
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-gradient-to-br from-white via-slate-50/50 to-brand-50/30 p-8 shadow-[0_24px_80px_-24px_rgb(15_23_42/0.15)] sm:p-10">
          <div
            className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-brand-400/15 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-16 left-1/4 h-48 w-48 rounded-full bg-teal-400/10 blur-3xl"
            aria-hidden
          />

          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-brand-700/90">
                Overview
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Hi {firstName(u?.full_name ?? "")},{" "}
                <span className="bg-gradient-to-r from-brand-700 to-teal-700 bg-clip-text text-transparent">
                  let&apos;s grow reviews.
                </span>
              </h1>
              <p className="mt-3 max-w-2xl text-lg leading-relaxed text-slate-600">
                {b?.name} ·{" "}
                <span className="font-medium text-slate-700">
                  {formatIndustry(b?.industry ?? "other")}
                </span>
              </p>
            </div>
            <LiveStatusPill syncedAt={lastSynced} />
          </div>

          {fs?.last_private_at ? (
            <p className="relative mt-6 rounded-xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 shadow-sm ring-1 ring-amber-100/80">
              <span className="font-semibold">Recent activity · </span>
              Latest private feedback{" "}
              <span className="tabular-nums">
                {formatRelativeShort(new Date(fs.last_private_at))}
              </span>
              . Check your phone and inbox for alerts.
            </p>
          ) : null}

          <div className="relative mt-10 grid gap-4 sm:grid-cols-3">
            <StatCard
              title="Preview links"
              value={String(fs?.preview_links_week ?? 0)}
              subtitle="Issued last 7 days"
              accent="brand"
            />
            <StatCard
              title="Google intent"
              value={String(fs?.google_intent_count ?? 0)}
              subtitle="4–5★ sessions recorded"
              accent="slate"
            />
            <StatCard
              title="Private feedback"
              value={String(fs?.private_feedback_count ?? 0)}
              subtitle="≤3★ caught before Google"
              accent="teal"
            />
          </div>
        </div>

        {copyHint ? (
          <p className="mt-4 text-center text-sm font-medium text-brand-800">
            {copyHint}
          </p>
        ) : null}

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Integration plan
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Saved from your Auto Reviews setup.
                </p>
              </div>
              {act?.setup_path === "concierge" ? (
                <span className="shrink-0 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-950 ring-1 ring-amber-200">
                  Concierge
                </span>
              ) : activationDone ? (
                <span className="shrink-0 rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-900 ring-1 ring-brand-200">
                  Self-serve
                </span>
              ) : null}
            </div>
            <dl className="mt-6 space-y-4 text-sm">
              <div className="flex justify-between gap-4 border-b border-slate-100 pb-3">
                <dt className="text-slate-500">Tool / CRM</dt>
                <dd className="text-right font-medium text-slate-900">
                  {formatActivationTool(act?.tool ?? null, act?.tool_other ?? null)}
                </dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-slate-100 pb-3">
                <dt className="text-slate-500">Trigger</dt>
                <dd className="text-right font-medium text-slate-900">
                  {formatActivationTrigger(
                    act?.trigger ?? null,
                    act?.trigger_other ?? null,
                  )}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Finish path</dt>
                <dd className="text-right font-medium text-slate-900">
                  {formatSetupPath(act?.setup_path ?? null)}
                </dd>
              </div>
            </dl>
            {!activationDone ? (
              <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-950 ring-1 ring-amber-100">
                Complete the activation wizard after signup so we can sync this
                data.
              </p>
            ) : (
              <p className="mt-4 text-xs leading-relaxed text-slate-500">
                Engineering connects webhooks or Zapier-style handlers next —
                your choices inform routing and timing.
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Google review link
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Used in SMS and your customer preview page.
            </p>
            <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 font-mono text-xs leading-relaxed text-slate-800 break-all">
              {loc?.google_review_url ?? "—"}
            </div>
            <button
              type="button"
              disabled={!loc?.google_review_url}
              onClick={() =>
                loc?.google_review_url &&
                copyText("Review link copied.", loc.google_review_url)
              }
              className="mt-4 w-full rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Copy review URL
            </button>
            {loc?.needs_gbp_assistance ? (
              <p className="mt-3 text-sm text-amber-800">
                Flagged for GBP help — our team can assist with claiming your
                profile.
              </p>
            ) : null}
          </section>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Customer preview page
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Same link we texted after verification — send yourself a smoke test
              anytime.
            </p>
            {previewAbsUrl ? (
              <>
                <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 font-mono text-xs text-slate-800 break-all">
                  {previewAbsUrl}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    copyText("Preview URL copied.", previewAbsUrl)
                  }
                  className="mt-4 w-full rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50"
                >
                  Copy preview URL
                </button>
                <Link
                  href={
                    data.preview_link
                      ? `${data.preview_link.customer_path}?owner=1`
                      : "#"
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 flex min-h-[44px] items-center justify-center rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white hover:bg-brand-700"
                >
                  Open preview in new tab
                </Link>
              </>
            ) : (
              <p className="mt-4 text-sm text-slate-500">
                No active preview token — verify your phone again from login if
                needed.
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Trial</h2>
            <p className="mt-1 text-sm text-slate-600">
              Full product access during your trial window.
            </p>
            {trialDaysLeft !== null ? (
              <>
                <p className="mt-6 text-4xl font-bold tabular-nums text-slate-900">
                  {trialDaysLeft}{" "}
                  <span className="text-lg font-semibold text-slate-500">
                    days left
                  </span>
                </p>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-brand-500 to-teal-500 transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(5, (trialDaysLeft / 14) * 100),
                      )}%`,
                    }}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Ends{" "}
                  {b?.trial_ends_at
                    ? new Date(b.trial_ends_at).toLocaleDateString(undefined, {
                        dateStyle: "medium",
                      })
                    : "—"}
                  . Stripe billing attaches after MVP.
                </p>
              </>
            ) : (
              <p className="mt-4 text-sm text-slate-500">Trial schedule pending.</p>
            )}
          </section>
        </div>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Launch checklist
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Post-onboarding — everything below is wired to your account state.
          </p>
          <ul className="mt-6 space-y-4">
            <CheckRow
              done
              title="Account & phone verified"
              hint="SMS review channel is live for your number."
            />
            <CheckRow
              done={activationDone}
              title="Auto Reviews setup saved"
              hint="CRM, trigger, Google link, and finish path stored on your business record."
            />
            <CheckRow
              done={!!previewAbsUrl}
              title="Customer preview ready"
              hint="Open the preview URL from Quick actions — same flow your customers get."
            />
          </ul>
        </section>

        <section className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-6">
          <h2 className="font-semibold text-slate-900">Account details</h2>
          <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-slate-500">Business</dt>
              <dd className="mt-1 font-medium text-slate-900">{b?.name}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Primary location</dt>
              <dd className="mt-1 text-slate-800">
                {loc?.formatted_address ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Timezone</dt>
              <dd className="mt-1 text-slate-800">{loc?.timezone ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">SMS voice</dt>
              <dd className="mt-1 capitalize text-slate-800">
                {b?.template_voice ?? "—"}
              </dd>
            </div>
          </dl>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-sm text-slate-500 sm:flex-row sm:px-6">
          <p>© {new Date().getFullYear()} Hatsoffly</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-brand-700">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-brand-700">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  accent,
}: {
  title: string;
  value: string;
  subtitle: string;
  accent: "brand" | "slate" | "teal";
}) {
  const ring =
    accent === "brand"
      ? "ring-brand-200/80"
      : accent === "teal"
        ? "ring-teal-200/70"
        : "ring-slate-200";
  const glow =
    accent === "brand"
      ? "from-brand-500/10"
      : accent === "teal"
        ? "from-teal-500/10"
        : "from-slate-400/10";

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-white/90 p-5 shadow-sm ring-1 ${ring}`}
    >
      <div
        className={`pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br ${glow} to-transparent blur-2xl`}
      />
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {title}
      </p>
      <p className="mt-3 text-3xl font-bold tabular-nums tracking-tight text-slate-900">
        {value}
      </p>
      <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
    </div>
  );
}

function CheckRow({
  done,
  title,
  hint,
}: {
  done: boolean;
  title: string;
  hint: string;
}) {
  return (
    <li className="flex gap-4">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
          done
            ? "bg-brand-600 text-white shadow-md shadow-brand-600/25"
            : "border-2 border-dashed border-slate-300 bg-white text-slate-400"
        }`}
      >
        {done ? "✓" : ""}
      </div>
      <div>
        <p className="font-medium text-slate-900">{title}</p>
        <p className="mt-0.5 text-sm text-slate-600">{hint}</p>
      </div>
    </li>
  );
}
