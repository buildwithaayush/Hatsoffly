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
import { supportMailto } from "@/lib/support";
import {
  IconAccounts,
  IconBell,
  IconBolt,
  IconBox,
  IconChart,
  IconCheck,
  IconClock,
  IconDashboard,
  IconFeedback,
  IconGrade,
  IconHelp,
  IconLogout,
  IconMail,
  IconMore,
  IconPeople,
  IconPin,
  IconSend,
  IconSettings,
  IconSms,
  IconSparkle,
  IconStar,
  IconTrend,
  IconVerified,
  IconWrench,
} from "@/components/dashboard/icons";
import { OwnerAccountSettingsSection } from "@/components/dashboard/owner-account-settings";

type MeResponse = {
  is_account_owner?: boolean;
  user?: {
    id: string;
    email: string;
    full_name: string;
    phone_e164: string;
    phone_verified_at?: string | null;
    email_verified_at?: string | null;
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
    id: string;
    name: string;
    formatted_address: string | null;
    google_review_url: string | null;
    timezone: string;
    needs_gbp_assistance: boolean;
  };
  preview_link?: { token: string; customer_path: string } | null;
  feedback_stats?: {
    total_sessions: number;
    private_feedback_count: number;
    google_intent_count: number;
    preview_links_week: number;
    last_private_at: string | null;
  } | null;
  locations?: {
    id: string;
    name: string;
    formatted_address: string | null;
    is_primary: boolean;
    active: boolean;
  }[];
  team?: {
    user_id: string;
    full_name: string;
    email: string;
    role: string;
  }[];
  feedback_avg_rating?: number | null;
  sms_preview_sample?: string | null;
  timing_summary?: string | null;
  error?: { message?: string };
};

/** Which primary nav item is selected (sidebar + top bar). */
export type DashboardNavKey =
  | "overview"
  | "analytics"
  | "reports"
  | "inventory"
  | "customers"
  | "settings";

function firstName(full: string): string {
  const t = full.trim().split(/\s+/)[0];
  return t || "there";
}

function initials(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (p.length === 0) return "?";
  if (p.length === 1) return p[0]!.slice(0, 2).toUpperCase();
  return (p[0]![0] + p[p.length - 1]![0]).toUpperCase();
}

function roleLabel(role: string): string {
  const m: Record<string, string> = {
    owner: "Owner",
    admin: "Admin",
    manager: "Manager",
    viewer: "Viewer",
  };
  return m[role] ?? role;
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

export function DashboardExperience() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const welcomeParam = searchParams.get("welcome") === "1";
  const urlTab = searchParams.get("tab") === "settings" ? "settings" : "overview";

  const [navKey, setNavKey] = useState<DashboardNavKey>("overview");
  const [data, setData] = useState<MeResponse | null>(null);
  const [copyHint, setCopyHint] = useState<string | null>(null);
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);
  const [clientReady, setClientReady] = useState(false);
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [smsModalOpen, setSmsModalOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3200);
  }, []);

  /** Keep highlight in sync with URL (?tab=settings) e.g. back/forward. */
  useEffect(() => {
    if (searchParams.get("tab") === "settings") {
      setNavKey("settings");
    } else {
      setNavKey((prev) => (prev === "settings" ? "overview" : prev));
    }
  }, [searchParams]);

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
      window.setTimeout(() => setCopyHint(null), 2200);
    } catch {
      setCopyHint("Copy failed — select and copy manually.");
      window.setTimeout(() => setCopyHint(null), 2500);
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
  const fs = data?.feedback_stats ?? null;
  const happyPathPct =
    fs && fs.total_sessions > 0
      ? Math.min(100, Math.round((100 * fs.google_intent_count) / fs.total_sessions))
      : null;
  const invitesPerDay =
    fs != null ? Math.round((fs.preview_links_week / 7) * 10) / 10 : 0;

  const pushPath = useCallback(
    (q: URLSearchParams) => {
      const s = q.toString();
      router.push(s ? `/dashboard?${s}` : "/dashboard");
      setMobileNav(false);
    },
    [router],
  );

  const goOverview = useCallback(() => {
    setNavKey("overview");
    const q = new URLSearchParams(searchParams.toString());
    q.delete("tab");
    pushPath(q);
  }, [pushPath, searchParams]);

  const goSettings = useCallback(() => {
    setNavKey("settings");
    const q = new URLSearchParams(searchParams.toString());
    q.set("tab", "settings");
    pushPath(q);
  }, [pushPath, searchParams]);

  const goAnalyticsNav = useCallback(() => {
    setNavKey("analytics");
    if (urlTab === "settings") {
      const q = new URLSearchParams(searchParams.toString());
      q.delete("tab");
      pushPath(q);
    }
    showToast("Analytics dashboard ships next — KPIs below update live.");
    window.requestAnimationFrame(() =>
      document.getElementById("analytics")?.scrollIntoView({ behavior: "smooth" }),
    );
  }, [pushPath, searchParams, showToast, urlTab]);

  const goReportsNav = useCallback(() => {
    setNavKey("reports");
    if (urlTab === "settings") {
      const q = new URLSearchParams(searchParams.toString());
      q.delete("tab");
      pushPath(q);
    }
    showToast("Reports export is on the roadmap.");
    window.requestAnimationFrame(() =>
      document.getElementById("analytics")?.scrollIntoView({ behavior: "smooth" }),
    );
  }, [pushPath, searchParams, showToast, urlTab]);

  const goInventoryNav = useCallback(() => {
    setNavKey("inventory");
    if (urlTab === "settings") {
      const q = new URLSearchParams(searchParams.toString());
      q.delete("tab");
      pushPath(q);
    }
    showToast("Inventory isn’t part of Hatsoffly — we focus on review requests.");
  }, [pushPath, searchParams, showToast, urlTab]);

  const goCustomersNav = useCallback(() => {
    setNavKey("customers");
    if (urlTab === "settings") {
      const q = new URLSearchParams(searchParams.toString());
      q.delete("tab");
      pushPath(q);
    }
    showToast("Customer list lives in your CRM — we’ll sync when webhooks go live.");
  }, [pushPath, searchParams, showToast, urlTab]);

  if (!data) {
    return (
      <div className="min-h-screen bg-[#f8fafc]">
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#f8fafc]">
          <div className="h-10 w-48 animate-pulse rounded-lg bg-slate-200" />
        </div>
      </div>
    );
  }

  if (data.error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#f8fafc] px-6">
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

  const u = data.user!;
  const b = data.business!;
  const loc = data.primary_location;
  const act = b.activation;
  const locations = data.locations ?? [];
  const team = data.team ?? [];

  const navBtn =
    "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-colors";
  const navActive = `${navBtn} border border-slate-200 bg-white text-brand-700 shadow-sm`;
  const navIdle = `${navBtn} text-slate-600 hover:bg-slate-100`;

  const navActiveClass = (key: DashboardNavKey) =>
    navKey === key ? navActive : navIdle;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900">
      {/* Top bar */}
      <header className="fixed left-0 right-0 top-0 z-50 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 shadow-sm backdrop-blur-md sm:px-8 lg:pl-[calc(18rem+2rem)]">
        <div className="flex items-center gap-4 lg:gap-10">
          <button
            type="button"
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            aria-label="Open menu"
            onClick={() => setMobileNav(true)}
          >
            <span className="block h-0.5 w-5 bg-current" />
            <span className="mt-1 block h-0.5 w-5 bg-current" />
            <span className="mt-1 block h-0.5 w-5 bg-current" />
          </button>
          <Link href="/" className="text-xl font-extrabold tracking-tight text-brand-700">
            Hatsoffly
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            <button
              type="button"
              onClick={() => goOverview()}
              className={
                navKey === "overview"
                  ? "border-b-2 border-brand-600 pb-4 text-sm font-semibold text-brand-700"
                  : "text-sm font-medium text-slate-500 hover:text-slate-900"
              }
            >
              Overview
            </button>
            <button
              type="button"
              onClick={() => goAnalyticsNav()}
              className={
                navKey === "analytics"
                  ? "border-b-2 border-brand-600 pb-4 text-sm font-semibold text-brand-700"
                  : "text-sm font-medium text-slate-500 hover:text-slate-900"
              }
            >
              Analytics
            </button>
            <button
              type="button"
              onClick={() => goInventoryNav()}
              className={
                navKey === "inventory"
                  ? "border-b-2 border-brand-600 pb-4 text-sm font-semibold text-brand-700"
                  : "text-sm font-medium text-slate-500 hover:text-slate-900"
              }
            >
              Inventory
            </button>
            <button
              type="button"
              onClick={() => goCustomersNav()}
              className={
                navKey === "customers"
                  ? "border-b-2 border-brand-600 pb-4 text-sm font-semibold text-brand-700"
                  : "text-sm font-medium text-slate-500 hover:text-slate-900"
              }
            >
              Customers
            </button>
            <button
              type="button"
              onClick={() => goSettings()}
              className={
                navKey === "settings"
                  ? "border-b-2 border-brand-600 pb-4 text-sm font-semibold text-brand-700"
                  : "text-sm font-medium text-slate-500 hover:text-slate-900"
              }
            >
              Settings
            </button>
          </nav>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-50"
            aria-label="Notifications"
            onClick={() =>
              showToast(
                fs?.last_private_at
                  ? `Last private feedback ${formatRelativeShort(new Date(fs.last_private_at))}.`
                  : "No new alerts — we’ll notify you when customers leave private feedback.",
              )
            }
          >
            <IconBell className="h-5 w-5" />
          </button>
          <a
            href={supportMailto("Hatsoffly dashboard help")}
            className="hidden rounded-lg p-2 text-slate-500 hover:bg-slate-50 sm:block"
            aria-label="Help"
          >
            <IconHelp className="h-5 w-5" />
          </a>
          <div
            className="ml-1 flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-gradient-to-br from-brand-100 to-teal-100 text-xs font-bold text-brand-800"
            title={u.email}
          >
            {initials(u.full_name)}
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileNav ? (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40"
            aria-label="Close menu"
            onClick={() => setMobileNav(false)}
          />
          <aside className="absolute left-0 top-0 flex h-full w-72 flex-col border-r border-slate-200 bg-slate-50 p-6 pt-20 shadow-xl">
            <MobileNavContent
              navKey={navKey}
              goOverview={goOverview}
              goAnalyticsNav={goAnalyticsNav}
              goReportsNav={goReportsNav}
              goInventoryNav={goInventoryNav}
              goCustomersNav={goCustomersNav}
              goSettings={goSettings}
              onClose={() => setMobileNav(false)}
              logout={logout}
            />
          </aside>
        </div>
      ) : null}

      {/* Sidebar desktop */}
      <aside className="fixed left-0 top-0 hidden h-screen w-72 flex-col border-r border-slate-200 bg-slate-50 p-6 pt-24 lg:flex">
        <div className="mb-8 px-2">
          <h2 className="text-lg font-extrabold text-slate-900">Hatsoffly</h2>
          <p className="text-xs font-medium text-slate-500">Review automation</p>
        </div>
        <nav className="flex flex-col gap-1">
          <button type="button" className={navActiveClass("overview")} onClick={() => goOverview()}>
            <IconDashboard className="h-5 w-5 shrink-0 opacity-80" />
            Overview
          </button>
          <button type="button" className={navActiveClass("analytics")} onClick={() => goAnalyticsNav()}>
            <IconTrend className="h-5 w-5 shrink-0 opacity-80" />
            Analytics
          </button>
          <button type="button" className={navActiveClass("reports")} onClick={() => goReportsNav()}>
            <IconChart className="h-5 w-5 shrink-0 opacity-80" />
            Reports
          </button>
          <button type="button" className={navActiveClass("inventory")} onClick={() => goInventoryNav()}>
            <IconBox className="h-5 w-5 shrink-0 opacity-80" />
            Inventory
          </button>
          <button type="button" className={navActiveClass("customers")} onClick={() => goCustomersNav()}>
            <IconPeople className="h-5 w-5 shrink-0 opacity-80" />
            Customers
          </button>
          <button type="button" className={navActiveClass("settings")} onClick={() => goSettings()}>
            <IconSettings className="h-5 w-5 shrink-0 opacity-80" />
            Settings
          </button>
        </nav>
        <div className="mt-auto space-y-4 pt-6">
          <div className="rounded-2xl bg-gradient-to-br from-brand-600 to-teal-600 p-4 text-white shadow-lg shadow-brand-600/25">
            <p className="text-[10px] font-bold uppercase tracking-wider opacity-90">Growth</p>
            <p className="mt-1 text-sm font-semibold leading-snug">Turn completed jobs into Google reviews.</p>
            <a
              href={supportMailto("Upgrade Hatsoffly")}
              className="mt-3 flex w-full items-center justify-center rounded-xl bg-white py-2 text-xs font-bold text-brand-700 hover:bg-brand-50"
            >
              Talk to us
            </a>
          </div>
          <div className="flex flex-col gap-1">
            <a href={supportMailto("Help")} className={`${navIdle} py-2`}>
              <IconHelp className="h-5 w-5" />
              Help center
            </a>
            <button type="button" className={`${navIdle} py-2 text-red-600 hover:bg-red-50`} onClick={() => logout()}>
              <IconLogout className="h-5 w-5" />
              Log out
            </button>
          </div>
        </div>
      </aside>

      <main className="mx-auto max-w-[1440px] px-4 pb-16 pt-20 sm:px-8 lg:ml-72 lg:pl-8 lg:pr-10">
        {clientReady && welcomeParam && !welcomeDismissed ? (
          <div className="mb-8 rounded-2xl border border-brand-200 bg-gradient-to-r from-brand-50 to-teal-50 p-4 sm:flex sm:items-center sm:justify-between sm:p-5">
            <div>
              <p className="font-semibold text-brand-950">You&apos;re live — test SMS sent</p>
              <p className="mt-1 text-sm text-brand-900/90">
                Check your phone for the preview link. Same flow your customers get.
              </p>
            </div>
            <button
              type="button"
              onClick={dismissWelcome}
              className="mt-3 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-brand-900 shadow-sm ring-1 ring-brand-200 sm:mt-0"
            >
              Dismiss
            </button>
          </div>
        ) : null}

        {urlTab === "overview" ? (
          <>
            <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between" id="overview">
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
                  Hi {firstName(u.full_name)},
                </h1>
                <p className="mt-2 text-lg text-slate-600">
                  {b.name} · {formatIndustry(b.industry)}
                </p>
              </div>
              {lastSynced ? (
                <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-900">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                  Live · synced {lastSynced.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                </div>
              ) : null}
            </div>

            <section className="mb-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                label="Feedback sessions"
                value={String(fs?.total_sessions ?? 0)}
                hint={
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-800">
                    <IconTrend className="h-3.5 w-3.5" />
                    Hatsoffly
                  </span>
                }
                icon={<IconStar className="h-5 w-5 text-brand-600" />}
              />
              <KpiCard
                label="Avg. rating"
                value={data.feedback_avg_rating != null ? String(data.feedback_avg_rating) : "—"}
                hint={<span className="text-slate-500">from private + happy taps</span>}
                icon={<IconGrade className="h-5 w-5 text-amber-500" />}
              />
              <KpiCard
                label="Happy path"
                value={happyPathPct != null ? `${happyPathPct}%` : "—"}
                hint={
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-800">
                    <IconVerified className="h-3.5 w-3.5" />
                    {fs && fs.total_sessions > 0 ? "4–5★ share" : "No data yet"}
                  </span>
                }
                icon={<IconBolt className="h-5 w-5 text-emerald-600" />}
              />
              <KpiCard
                label="Preview links / week"
                value={`${fs?.preview_links_week ?? 0}`}
                hint={<span className="text-slate-500">~{invitesPerDay}/day est.</span>}
                icon={<IconSend className="h-5 w-5 text-brand-600" />}
              />
            </section>

            {copyHint ? (
              <p className="mb-6 text-center text-sm font-semibold text-brand-800">{copyHint}</p>
            ) : null}

            <section id="analytics" className="mb-10 grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900">Integration plan</h2>
                <p className="mt-1 text-sm text-slate-600">From your Auto Reviews setup.</p>
                <dl className="mt-6 space-y-3 text-sm">
                  <div className="flex justify-between border-b border-slate-100 pb-3">
                    <dt className="text-slate-500">Tool / CRM</dt>
                    <dd className="font-semibold text-slate-900">
                      {formatActivationTool(act.tool, act.tool_other)}
                    </dd>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-3">
                    <dt className="text-slate-500">Trigger</dt>
                    <dd className="font-semibold text-slate-900">
                      {formatActivationTrigger(act.trigger, act.trigger_other)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Finish path</dt>
                    <dd className="font-semibold text-slate-900">{formatSetupPath(act.setup_path)}</dd>
                  </div>
                </dl>
                {!activationDone ? (
                  <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-950 ring-1 ring-amber-100">
                    Finish activation after signup so this section reflects your real stack.
                  </p>
                ) : (
                  <p className="mt-4 text-xs text-slate-500">
                    Webhooks / Zapier connectors will fire on your trigger next — this is your saved intent.
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900">Google review link</h2>
                <p className="mt-1 text-sm text-slate-600">Used in SMS and the customer page.</p>
                <div className="mt-4 max-h-24 overflow-auto rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-800">
                  {loc?.google_review_url ?? "—"}
                </div>
                <button
                  type="button"
                  disabled={!loc?.google_review_url}
                  onClick={() =>
                    loc?.google_review_url && copyText("Review link copied.", loc.google_review_url)
                  }
                  className="mt-4 w-full rounded-xl bg-slate-900 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-40"
                >
                  Copy review URL
                </button>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900">Customer preview</h2>
                <p className="mt-1 text-sm text-slate-600">Smoke-test the same link customers get.</p>
                {previewAbsUrl ? (
                  <>
                    <div className="mt-4 max-h-20 overflow-auto rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 font-mono text-xs break-all text-slate-800">
                      {previewAbsUrl}
                    </div>
                    <button
                      type="button"
                      onClick={() => copyText("Preview URL copied.", previewAbsUrl)}
                      className="mt-3 w-full rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-900 hover:bg-slate-50"
                    >
                      Copy preview URL
                    </button>
                    <Link
                      href={data.preview_link ? `${data.preview_link.customer_path}?owner=1` : "#"}
                      target="_blank"
                      className="mt-2 flex min-h-[44px] items-center justify-center rounded-xl bg-brand-600 py-3 text-sm font-bold text-white hover:bg-brand-700"
                    >
                      Open preview
                    </Link>
                  </>
                ) : (
                  <p className="mt-4 text-sm text-slate-500">No active preview — complete phone verify again if needed.</p>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900">Trial</h2>
                <p className="mt-1 text-sm text-slate-600">Full access during trial.</p>
                {trialDaysLeft !== null ? (
                  <>
                    <p className="mt-6 text-4xl font-extrabold tabular-nums">
                      {trialDaysLeft}{" "}
                      <span className="text-lg font-semibold text-slate-500">days left</span>
                    </p>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-brand-500 to-teal-500"
                        style={{
                          width: `${Math.min(100, Math.max(8, (trialDaysLeft / 14) * 100))}%`,
                        }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      Ends{" "}
                      {b.trial_ends_at
                        ? new Date(b.trial_ends_at).toLocaleDateString(undefined, { dateStyle: "medium" })
                        : "—"}
                    </p>
                  </>
                ) : (
                  <p className="mt-4 text-sm text-slate-500">Trial schedule pending.</p>
                )}
              </div>
            </section>

            {fs?.last_private_at ? (
              <section className="mb-10 rounded-2xl border border-amber-200 bg-amber-50/90 p-6 text-center sm:text-left">
                <p className="text-sm font-semibold text-amber-950">
                  Recent private feedback · {formatRelativeShort(new Date(fs.last_private_at))}
                </p>
                <p className="mt-1 text-sm text-amber-900/90">We emailed and texted the owner when it arrived.</p>
              </section>
            ) : null}

            {activationDone && previewAbsUrl ? (
              <section className="rounded-2xl border border-emerald-200 bg-emerald-50/90 p-8 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-md">
                  <IconSparkle className="h-8 w-8 text-emerald-600" />
                </div>
                <h2 className="text-xl font-extrabold text-emerald-950">You&apos;re set up</h2>
                <p className="mx-auto mt-2 max-w-md text-sm font-medium text-emerald-900/90">
                  Preview link is live. When CRM webhooks land, review asks will send automatically on your trigger.
                </p>
              </section>
            ) : null}
          </>
        ) : (
          <>
            <div className="mb-10">
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
                Settings &amp; configuration
              </h1>
              <p className="mt-2 text-slate-600">
                Preferences for review requests — wired to your Hatsoffly account.
              </p>
            </div>

            {data.is_account_owner === true ? (
              <OwnerAccountSettingsSection
                user={{
                  email: u.email,
                  phone_e164: u.phone_e164,
                  phone_verified_at: u.phone_verified_at ?? null,
                  email_verified_at: u.email_verified_at ?? null,
                }}
                onReload={loadMe}
                showToast={showToast}
              />
            ) : (
              <div className="mb-10 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
                Only the business owner can change login email, phone, or delete the account.
              </div>
            )}

            <section className="mb-10 grid grid-cols-1 gap-6 md:grid-cols-2">
              <SettingsCard
                icon={<IconPin className="h-5 w-5 text-brand-600" />}
                iconBg="bg-brand-50"
                title="Locations"
                subtitle="Where review requests are tied"
                footer={
                  <button
                    type="button"
                    className="w-full rounded-xl bg-brand-50 py-3 text-sm font-bold text-brand-700 hover:bg-brand-100"
                    onClick={() =>
                      showToast("Multi-location rollout is next — email support to add another branch today.")
                    }
                  >
                    Add location
                  </button>
                }
              >
                <div className="space-y-2">
                  {locations.length === 0 ? (
                    <p className="text-sm text-slate-500">No locations on file.</p>
                  ) : (
                    locations.map((l) => (
                      <div
                        key={l.id}
                        className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-3 text-sm font-semibold"
                      >
                        <span className="truncate pr-2">
                          {l.name}
                          {l.is_primary ? " (Primary)" : ""}
                        </span>
                        {l.active ? (
                          <IconCheck className="h-5 w-5 shrink-0 text-emerald-500" />
                        ) : (
                          <span className="text-xs text-slate-400">Inactive</span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </SettingsCard>

              <SettingsCard
                icon={<IconWrench className="h-5 w-5 text-teal-700" />}
                iconBg="bg-teal-50"
                title="Team"
                subtitle="Who can access this Hatsoffly business"
                footer={
                  <button
                    type="button"
                    className="w-full rounded-xl bg-brand-50 py-3 text-sm font-bold text-brand-700 hover:bg-brand-100"
                    onClick={() => showToast("Invites are coming soon — for now, one owner per business.")}
                  >
                    Add team member
                  </button>
                }
              >
                <div className="space-y-2">
                  {team.map((m) => (
                    <div
                      key={m.user_id}
                      className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-3"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-800">
                        {initials(m.full_name)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold">{m.full_name}</p>
                        <p className="truncate text-xs text-slate-500">{roleLabel(m.role)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </SettingsCard>

              <SettingsCard
                icon={<IconSms className="h-5 w-5 text-brand-700" />}
                iconBg="bg-sky-50"
                title="SMS preview"
                subtitle={`Template for your review ask (voice: ${b.template_voice})`}
                footer={
                  <button
                    type="button"
                    className="w-full rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-900 hover:bg-slate-50"
                    onClick={() => setSmsModalOpen(true)}
                  >
                    View full message
                  </button>
                }
              >
                <div className="relative overflow-hidden rounded-2xl bg-slate-900 px-4 py-4 text-white">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Preview</p>
                  <p className="mt-2 line-clamp-4 text-sm leading-relaxed italic text-slate-100">
                    {data.sms_preview_sample ?? "Template loading…"}
                  </p>
                </div>
              </SettingsCard>

              <SettingsCard
                icon={<IconClock className="h-5 w-5 text-amber-800" />}
                iconBg="bg-amber-50"
                title="Timing"
                subtitle="When to send (saved trigger)"
                footer={
                  <button
                    type="button"
                    className="w-full rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-900 hover:bg-slate-50"
                    onClick={() =>
                      showToast("Exact delays ship with CRM webhooks — your trigger is already saved below.")
                    }
                  >
                    Learn more
                  </button>
                }
              >
                <div className="rounded-2xl border-2 border-dashed border-slate-200 px-4 py-6 text-center">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Trigger</p>
                  <p className="mt-2 text-2xl font-extrabold text-brand-700">
                    {data.timing_summary ?? "—"}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">Smart delay when webhooks connect</p>
                </div>
              </SettingsCard>

              <SettingsCard
                icon={<IconFeedback className="h-5 w-5 text-red-600" />}
                iconBg="bg-red-50"
                title="Private feedback"
                subtitle="Low-star notes go to the owner"
                footer={
                  <button
                    type="button"
                    className="w-full rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-900 hover:bg-slate-50"
                    onClick={() =>
                      copyText("Copied email.", u.email)
                    }
                  >
                    Copy owner email
                  </button>
                }
              >
                <div className="flex items-center gap-3 rounded-xl border border-red-100 bg-red-50/60 px-3 py-3">
                  <IconMail className="h-5 w-5 shrink-0 text-red-600" />
                  <span className="truncate text-sm font-semibold text-slate-900">{u.email}</span>
                </div>
                <p className="mt-2 text-xs text-slate-500">SMS alerts also go to {u.phone_e164}</p>
              </SettingsCard>

              <SettingsCard
                icon={<IconChart className="h-5 w-5 text-slate-600" />}
                iconBg="bg-slate-100"
                title="Reports"
                subtitle="Summaries in your inbox"
                footer={
                  <button
                    type="button"
                    className="w-full rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-900 hover:bg-slate-50"
                    onClick={() => showToast("Weekly email digests are planned — we’ll use your login email first.")}
                  >
                    Edit reports
                  </button>
                }
              >
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Frequency</span>
                    <span className="rounded-full bg-teal-50 px-2 py-0.5 text-xs font-bold text-teal-900">
                      Weekly (planned)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Send to</span>
                    <span className="truncate font-bold">{u.email}</span>
                  </div>
                </div>
              </SettingsCard>

              <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                      <IconAccounts className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-extrabold text-slate-900">Team access</h3>
                      <p className="text-sm text-slate-500">People on this business in Hatsoffly</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => showToast("Invites coming soon.")}
                    className="rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand-600/20 hover:bg-brand-700"
                  >
                    Invite teammate
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {team.map((m) => (
                    <div
                      key={m.user_id}
                      className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3 hover:bg-slate-50"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-800">
                          {initials(m.full_name)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-bold">{m.full_name}</p>
                          <p className="truncate text-xs text-slate-500">{m.email}</p>
                          <p className="text-xs font-semibold text-brand-700">{roleLabel(m.role)}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-800"
                        aria-label="More"
                        onClick={() => showToast("Role management ships with team invites.")}
                      >
                        <IconMore className="h-5 w-5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}

        <footer className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-8 text-sm text-slate-500 sm:flex-row">
          <p>© {new Date().getFullYear()} Hatsoffly</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-brand-700">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-brand-700">
              Terms
            </Link>
          </div>
        </footer>
      </main>

      {toast ? (
        <div className="fixed bottom-6 left-1/2 z-[80] max-w-sm -translate-x-1/2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-semibold text-slate-800 shadow-xl">
          {toast}
        </div>
      ) : null}

      {smsModalOpen ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-900/50 p-4 sm:items-center">
          <div className="max-h-[85vh] w-full max-w-lg overflow-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-lg font-extrabold text-slate-900">SMS template</h2>
              <button
                type="button"
                className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-100"
                onClick={() => setSmsModalOpen(false)}
              >
                Close
              </button>
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Voice: <span className="font-semibold capitalize">{b.template_voice}</span>. Files live in{" "}
              <code className="rounded bg-slate-100 px-1 text-xs">config/templates/v1</code>.
            </p>
            <pre className="mt-4 whitespace-pre-wrap rounded-xl bg-slate-900 p-4 text-sm leading-relaxed text-slate-100">
              {data.sms_preview_sample ?? ""}
            </pre>
            <button
              type="button"
              className="mt-4 w-full rounded-xl bg-brand-600 py-3 text-sm font-bold text-white hover:bg-brand-700"
              onClick={() => {
                if (data.sms_preview_sample) void copyText("Message copied.", data.sms_preview_sample);
              }}
            >
              Copy message
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MobileNavContent({
  navKey,
  goOverview,
  goAnalyticsNav,
  goReportsNav,
  goInventoryNav,
  goCustomersNav,
  goSettings,
  onClose,
  logout,
}: {
  navKey: DashboardNavKey;
  goOverview: () => void;
  goAnalyticsNav: () => void;
  goReportsNav: () => void;
  goInventoryNav: () => void;
  goCustomersNav: () => void;
  goSettings: () => void;
  onClose: () => void;
  logout: () => void;
}) {
  const navBtn = "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold";
  const row = (active: boolean) =>
    `${navBtn} ${active ? "border border-slate-200 bg-white text-brand-700 shadow-sm" : "text-slate-600 hover:bg-slate-100"}`;
  return (
    <>
      <button
        type="button"
        className={row(navKey === "overview")}
        onClick={() => {
          goOverview();
          onClose();
        }}
      >
        <IconDashboard className="h-5 w-5" />
        Overview
      </button>
      <button
        type="button"
        className={row(navKey === "analytics")}
        onClick={() => {
          goAnalyticsNav();
          onClose();
        }}
      >
        <IconTrend className="h-5 w-5" />
        Analytics
      </button>
      <button
        type="button"
        className={row(navKey === "reports")}
        onClick={() => {
          goReportsNav();
          onClose();
        }}
      >
        <IconChart className="h-5 w-5" />
        Reports
      </button>
      <button
        type="button"
        className={row(navKey === "inventory")}
        onClick={() => {
          goInventoryNav();
          onClose();
        }}
      >
        <IconBox className="h-5 w-5" />
        Inventory
      </button>
      <button
        type="button"
        className={row(navKey === "customers")}
        onClick={() => {
          goCustomersNav();
          onClose();
        }}
      >
        <IconPeople className="h-5 w-5" />
        Customers
      </button>
      <button
        type="button"
        className={row(navKey === "settings")}
        onClick={() => {
          goSettings();
          onClose();
        }}
      >
        <IconSettings className="h-5 w-5" />
        Settings
      </button>
      <button type="button" className={`${navBtn} mt-6 text-red-600 hover:bg-red-50`} onClick={() => logout()}>
        <IconLogout className="h-5 w-5" />
        Log out
      </button>
    </>
  );
}

function KpiCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint: React.ReactNode;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
        {icon}
      </div>
      <div className="text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">{value}</div>
      <div className="mt-2 text-xs">{hint}</div>
    </div>
  );
}

function SettingsCard({
  icon,
  iconBg,
  title,
  subtitle,
  children,
  footer,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <div className="mb-4 flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}>{icon}</div>
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">{title}</h3>
            <p className="text-sm text-slate-500">{subtitle}</p>
          </div>
        </div>
        <div className="mb-6">{children}</div>
      </div>
      {footer}
    </div>
  );
}
