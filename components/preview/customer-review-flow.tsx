"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

type Phase = "rate" | "google" | "private" | "private_done";

export function CustomerReviewFlow({
  businessName,
  firstName,
  reviewHref,
  token,
  isOwnerPreview,
}: {
  businessName: string;
  firstName: string;
  reviewHref: string;
  token: string;
  isOwnerPreview: boolean;
}) {
  const [phase, setPhase] = useState<Phase>("rate");
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [privateNote, setPrivateNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [topError, setTopError] = useState<string | null>(null);

  const submitFeedback = useCallback(
    async (rating: number, privateMessage?: string) => {
      setSubmitting(true);
      setTopError(null);
      try {
        const res = await fetch(`/api/v1/preview/${encodeURIComponent(token)}/feedback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rating,
            ...(rating <= 3 && privateMessage
              ? { private_message: privateMessage }
              : {}),
          }),
        });
        const raw = await res.text();
        let data: { error?: { message?: string } } = {};
        try {
          if (raw.trim()) data = JSON.parse(raw) as typeof data;
        } catch {
          /* ignore */
        }
        if (!res.ok) {
          setTopError(
            data?.error?.message ??
              (res.status === 409
                ? "You already submitted feedback for this link."
                : "Something went wrong. Try again."),
          );
          return false;
        }
        return true;
      } catch {
        setTopError("Network error. Check your connection.");
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [token],
  );

  const onPickStars = async (n: number) => {
    setSelectedRating(n);
    setTopError(null);
    if (n >= 4) {
      const ok = await submitFeedback(n);
      if (ok) setPhase("google");
      return;
    }
    setPhase("private");
  };

  const onSubmitPrivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRating === null || selectedRating > 3) return;
    const ok = await submitFeedback(selectedRating, privateNote);
    if (ok) setPhase("private_done");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white text-slate-900">
      <div className="mx-auto flex max-w-lg flex-col gap-6 px-5 py-10 pb-16">
        {isOwnerPreview ? (
          <div
            role="note"
            className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          >
            <strong className="font-semibold">Owner preview</strong> — this is the same screen
            your customers see after you text them. Tap through like they would.
          </div>
        ) : null}

        {topError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
            {topError}
          </div>
        ) : null}

        {phase === "rate" ? (
          <>
            <header className="text-center sm:text-left">
              <p className="text-sm font-medium text-slate-600">{businessName}</p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                How was your experience?
              </h1>
              <p className="mt-3 text-base leading-relaxed text-slate-600">
                Hi {firstName} — thanks for choosing us. Tap the stars that match today&apos;s
                visit.
              </p>
            </header>

            <div className="flex justify-center gap-2 sm:gap-3">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  disabled={submitting}
                  onClick={() => void onPickStars(n)}
                  className="flex h-14 min-w-[52px] flex-1 max-w-[64px] items-center justify-center rounded-xl border border-slate-200 bg-white text-lg font-bold text-amber-500 shadow-sm transition hover:border-brand-400 hover:bg-brand-50 hover:shadow-md disabled:opacity-50"
                  aria-label={`${n} stars out of 5`}
                >
                  {n}★
                </button>
              ))}
            </div>
            <p className="text-center text-xs text-slate-500">
              4–5 stars → Google review · 1–3 stars → private feedback first
            </p>
          </>
        ) : null}

        {phase === "google" ? (
          <div className="space-y-6 rounded-2xl border border-brand-200 bg-brand-50/60 p-6 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-2xl text-white shadow-lg">
              ✓
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Glad you had a great visit</h2>
              <p className="mt-2 text-slate-600">
                Public reviews help neighbors find {businessName}. One tap opens your Google review
                page.
              </p>
            </div>
            <Link
              href={reviewHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[52px] w-full items-center justify-center rounded-xl bg-brand-600 px-5 py-3.5 text-base font-semibold text-white shadow-md transition hover:bg-brand-700"
            >
              Leave a Google review
            </Link>
            <p className="text-xs text-slate-500">
              You can close this tab anytime. Thanks for supporting local service.
            </p>
          </div>
        ) : null}

        {phase === "private" ? (
          <form onSubmit={(e) => void onSubmitPrivate(e)} className="space-y-5">
            <header>
              <h2 className="text-xl font-bold text-slate-900">We&apos;re sorry it wasn&apos;t great</h2>
              <p className="mt-2 text-slate-600">
                Your feedback stays with {businessName} — not posted publicly. Tell us what
                happened so we can fix it.
              </p>
            </header>
            <div>
              <label htmlFor="pf-note" className="block text-sm font-medium text-slate-800">
                What could we improve? ({selectedRating}★ selected)
              </label>
              <textarea
                id="pf-note"
                required
                minLength={8}
                rows={5}
                value={privateNote}
                onChange={(e) => setPrivateNote(e.target.value)}
                placeholder="Job quality, timing, communication…"
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-base text-slate-900 outline-none ring-brand-500 placeholder:text-slate-400 focus:border-brand-500 focus:ring-2"
              />
            </div>
            {topError ? (
              <p className="text-sm text-red-700">{topError}</p>
            ) : null}
            <button
              type="submit"
              disabled={submitting || privateNote.trim().length < 8}
              className="flex w-full min-h-[52px] items-center justify-center rounded-xl bg-slate-900 px-5 py-3.5 text-base font-semibold text-white hover:bg-slate-800 disabled:bg-slate-300"
            >
              {submitting ? "Sending…" : "Send privately to the team"}
            </button>
            <button
              type="button"
              className="w-full text-sm text-slate-600 underline-offset-2 hover:underline"
              onClick={() => {
                setPhase("rate");
                setSelectedRating(null);
                setPrivateNote("");
                setTopError(null);
              }}
            >
              ← Change star rating
            </button>
          </form>
        ) : null}

        {phase === "private_done" ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-2xl text-white">
              ✉️
            </div>
            <h2 className="mt-4 text-xl font-bold text-slate-900">Thank you — we got it.</h2>
            <p className="mt-3 text-slate-600">
              Someone from {businessName} may follow up if needed. No review was posted publicly.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
