"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

type MeResponse = {
  user?: {
    email: string;
    full_name: string;
    phone_e164: string;
  };
  business?: {
    name: string;
    industry: string;
    trial_ends_at: string | null;
    template_voice: string;
  };
  primary_location?: {
    formatted_address: string | null;
    google_review_url: string | null;
    needs_gbp_assistance: boolean;
  };
  error?: { message?: string };
};

function DashboardInner() {
  const searchParams = useSearchParams();
  const welcome = searchParams.get("welcome") === "1";
  const [data, setData] = useState<MeResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/v1/auth/me");
      const json = (await res.json()) as MeResponse & { error?: { message?: string } };
      if (!cancelled) setData(json);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-600">Loading…</p>
      </div>
    );
  }

  if ("error" in data && data.error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-6">
        <p className="text-center text-slate-700">You need to finish onboarding first.</p>
        <Link href="/login" className="rounded-xl bg-brand-600 px-5 py-3 font-semibold text-white">
          Log in
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {welcome && (
        <div className="border-b border-brand-200 bg-brand-50 px-6 py-4 text-brand-950">
          <p className="font-semibold">You&apos;re live</p>
          <p className="text-sm text-brand-900">
            Check your phone for the test SMS we sent — that&apos;s what your customers will see.
          </p>
        </div>
      )}
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Dashboard</h1>
        <p className="mt-2 text-slate-600">
          Concierge setup, templates, timing rules, and billing live here after MVP activation.
        </p>

        <dl className="mt-10 grid gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Business
            </dt>
            <dd className="mt-1 text-lg font-medium text-slate-900">{data.business?.name}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Owner
            </dt>
            <dd className="mt-1 text-slate-800">{data.user?.full_name}</dd>
            <dd className="text-sm text-slate-600">{data.user?.email}</dd>
            <dd className="text-sm text-slate-600">{data.user?.phone_e164}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Primary location
            </dt>
            <dd className="mt-1 text-slate-800">{data.primary_location?.formatted_address}</dd>
            {data.primary_location?.needs_gbp_assistance && (
              <dd className="mt-2 text-sm text-amber-800">
                Our team can help claim or create your Google Business Profile.
              </dd>
            )}
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Message voice
            </dt>
            <dd className="mt-1 capitalize text-slate-800">{data.business?.template_voice}</dd>
          </div>
        </dl>

        <section className="mt-10 rounded-2xl border border-dashed border-slate-300 bg-white/60 p-6 text-sm text-slate-600">
          <p className="font-semibold text-slate-800">Post-onboarding (spec)</p>
          <ul className="mt-3 list-disc space-y-1 pl-5">
            <li>Add locations, providers, templates, timing rules</li>
            <li>Webhook trigger handler + weekly reports</li>
            <li>Stripe billing after 14-day trial</li>
          </ul>
        </section>
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          <p className="text-slate-600">Loading…</p>
        </div>
      }
    >
      <DashboardInner />
    </Suspense>
  );
}
