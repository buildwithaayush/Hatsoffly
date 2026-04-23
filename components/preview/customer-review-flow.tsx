"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

type Phase = "rate" | "google" | "private" | "private_done";

function StarIcon({ filled, className }: { filled: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        className={
          filled
            ? "fill-amber-400 stroke-amber-500/80 drop-shadow-[0_2px_10px_rgba(251,191,36,0.5)]"
            : "fill-slate-100 stroke-slate-300/95"
        }
        strokeWidth={filled ? 0 : 1.25}
        strokeLinejoin="round"
        d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
      />
    </svg>
  );
}

function AmbientBackdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      <div
        className="absolute -left-[20%] top-0 h-[55vmin] w-[55vmin] rounded-full bg-brand-400/25 blur-[100px] rf-blob"
        aria-hidden
      />
      <div
        className="absolute -right-[15%] bottom-[10%] h-[45vmin] w-[45vmin] rounded-full bg-teal-400/20 blur-[90px] rf-blob-alt"
        aria-hidden
      />
      <div
        className="absolute bottom-0 left-1/3 h-[35vmin] w-[35vmin] rounded-full bg-amber-200/30 blur-[80px]"
        aria-hidden
      />
      <div
        className="absolute inset-0 grid-lines opacity-[0.35]"
        aria-hidden
      />
    </div>
  );
}

function PhaseStepper({
  phase,
}: {
  phase: "rate" | "google" | "private" | "private_done";
}) {
  const steps = [
    { key: "rate", label: "Rate" },
    { key: "mid", label: phase === "google" ? "Share" : "Feedback" },
    { key: "done", label: "Done" },
  ] as const;

  let active = 0;
  if (phase === "rate") active = 0;
  else if (phase === "google" || phase === "private") active = 1;
  else active = 2;

  return (
    <div className="mb-8 flex items-center justify-center gap-2 sm:gap-3">
      {steps.map((s, i) => {
        const done = i < active;
        const current = i === active;
        return (
          <div key={s.label} className="flex items-center gap-2 sm:gap-3">
            <div className="flex flex-col items-center gap-1.5">
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ${
                  current
                    ? "bg-brand-600 text-white shadow-lg shadow-brand-600/35 ring-4 ring-brand-500/25"
                    : done
                      ? "bg-brand-500 text-white shadow-md shadow-brand-500/25"
                      : "bg-slate-200/90 text-slate-500 ring-1 ring-slate-300/80"
                }`}
              >
                {done ? "✓" : i + 1}
              </span>
              <span
                className={`text-[10px] font-semibold uppercase tracking-[0.18em] sm:text-[11px] ${
                  current ? "text-brand-800" : "text-slate-400"
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < 2 ? (
              <div
                className={`mb-6 hidden h-px w-8 sm:block ${
                  active > i ? "bg-brand-400" : "bg-slate-200"
                }`}
                aria-hidden
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

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
  const reduceMotion = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("rate");
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
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

  const displayHighlight = hoverRating ?? selectedRating ?? 0;

  const transition = reduceMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 380, damping: 32 };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-gradient-to-b from-slate-50 via-[#f8fafc] to-[#f1f5f9] text-slate-900">
      <AmbientBackdrop />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-lg flex-col px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
        {isOwnerPreview ? (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 rounded-2xl border border-amber-300/60 bg-gradient-to-r from-amber-50 to-orange-50/90 px-4 py-3.5 text-sm text-amber-950 shadow-md shadow-amber-900/10 ring-1 ring-amber-200/80"
            role="note"
          >
            <strong className="font-semibold">Team preview</strong>
            <span className="text-amber-900/90">
              {" "}
              — Same screen customers see from your SMS link. Walk through it like they would.
            </span>
          </motion.div>
        ) : null}

        <div className="rounded-[1.75rem] border border-white/70 bg-white/75 p-6 shadow-[0_32px_120px_-28px_rgba(15,23,42,0.18)] shadow-slate-900/10 ring-1 ring-slate-200/60 backdrop-blur-xl sm:p-9">
          <PhaseStepper phase={phase} />

          {topError ? (
            <div className="mb-6 rounded-xl border border-red-200/90 bg-red-50/95 px-4 py-3 text-sm font-medium text-red-900 shadow-sm ring-1 ring-red-100">
              {topError}
            </div>
          ) : null}

          <AnimatePresence mode="wait">
            {phase === "rate" ? (
              <motion.div
                key="rate"
                initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, y: -12 }}
                transition={transition}
                className="space-y-8"
              >
                <header className="text-center">
                  <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-brand-700/90">
                    {businessName}
                  </p>
                  <h1 className="mt-4 text-[1.65rem] font-bold leading-tight tracking-tight text-slate-900 sm:text-3xl">
                    How was{" "}
                    <span className="bg-gradient-to-r from-brand-700 to-teal-700 bg-clip-text text-transparent">
                      your visit?
                    </span>
                  </h1>
                  <p className="mx-auto mt-4 max-w-sm text-base leading-relaxed text-slate-600">
                    Hi <span className="font-semibold text-slate-800">{firstName}</span> — your
                    opinion shapes how we show up for the next neighbor. Tap a star to continue.
                  </p>
                </header>

                <div className="relative py-2">
                  <div className="flex justify-center gap-2 sm:gap-3 md:gap-4">
                    {[1, 2, 3, 4, 5].map((n) => {
                      const lit = displayHighlight >= n;
                      return (
                        <button
                          key={n}
                          type="button"
                          disabled={submitting}
                          onMouseEnter={() => setHoverRating(n)}
                          onMouseLeave={() => setHoverRating(null)}
                          onFocus={() => setHoverRating(n)}
                          onBlur={() => setHoverRating(null)}
                          onClick={() => void onPickStars(n)}
                          className="group relative flex min-h-[56px] min-w-[52px] flex-1 max-w-[72px] flex-col items-center justify-center rounded-2xl border border-slate-200/90 bg-white/90 py-3 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-brand-300 hover:shadow-lg hover:shadow-brand-900/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-400/40 disabled:opacity-45"
                          aria-label={`${n} star${n === 1 ? "" : "s"} out of 5`}
                        >
                          <StarIcon
                            filled={lit}
                            className="h-10 w-10 transition-transform duration-200 group-hover:scale-110 group-active:scale-95 sm:h-11 sm:w-11"
                          />
                          <span className="mt-1 text-[10px] font-bold tabular-nums text-slate-400 group-hover:text-brand-700">
                            {n}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-6 text-center text-xs font-medium leading-relaxed text-slate-500">
                    <span className="inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
                      <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-emerald-900 ring-1 ring-emerald-200/80">
                        4–5★ → Google review
                      </span>
                      <span className="text-slate-300">·</span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-slate-700 ring-1 ring-slate-200">
                        1–3★ → private first
                      </span>
                    </span>
                  </p>
                </div>
              </motion.div>
            ) : null}

            {phase === "google" ? (
              <motion.div
                key="google"
                initial={reduceMotion ? false : { opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={reduceMotion ? undefined : { opacity: 0 }}
                transition={transition}
                className="space-y-8 text-center"
              >
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-teal-600 text-4xl shadow-2xl shadow-brand-600/40 ring-4 ring-white">
                  <span aria-hidden className="drop-shadow-md">
                    ✓
                  </span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                    Glad you had a great visit
                  </h2>
                  <p className="mx-auto mt-3 max-w-sm text-base leading-relaxed text-slate-600">
                    Public reviews help neighbors discover{" "}
                    <span className="font-semibold text-slate-800">{businessName}</span>. One tap
                    opens Google — quick and secure.
                  </p>
                </div>
                <Link
                  href={reviewHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[54px] w-full items-center justify-center rounded-2xl bg-gradient-to-r from-brand-600 to-teal-600 px-6 py-4 text-base font-semibold text-white shadow-xl shadow-brand-700/25 ring-1 ring-white/20 transition hover:from-brand-700 hover:to-teal-700 hover:shadow-2xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-400/50"
                >
                  Leave a Google review
                </Link>
                <p className="text-xs leading-relaxed text-slate-500">
                  Opens in a new tab. You can close this page anytime — thanks for supporting a
                  local business.
                </p>
              </motion.div>
            ) : null}

            {phase === "private" ? (
              <motion.form
                key="private"
                initial={reduceMotion ? false : { opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0 }}
                transition={transition}
                onSubmit={(e) => void onSubmitPrivate(e)}
                className="space-y-6"
              >
                <div className="rounded-2xl border border-rose-200/70 bg-gradient-to-br from-rose-50/90 to-orange-50/40 p-5 ring-1 ring-rose-100/80">
                  <h2 className="text-xl font-bold tracking-tight text-slate-900">
                    We&apos;re sorry it wasn&apos;t great
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-700">
                    Your note goes straight to {businessName} — not posted publicly. Help us make
                    it right.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="pf-note"
                    className="flex items-baseline justify-between gap-2 text-sm font-semibold text-slate-800"
                  >
                    <span>What could we improve?</span>
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
                      {selectedRating}★ selected
                    </span>
                  </label>
                  <textarea
                    id="pf-note"
                    required
                    minLength={8}
                    rows={5}
                    value={privateNote}
                    onChange={(e) => setPrivateNote(e.target.value)}
                    placeholder="Timing, communication, quality of work — whatever matters to you."
                    className="mt-3 w-full resize-y rounded-2xl border border-slate-200/90 bg-white/95 px-4 py-3.5 text-base text-slate-900 shadow-inner shadow-slate-900/5 outline-none ring-slate-200/80 transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-500/20"
                  />
                  <p className="mt-2 text-xs text-slate-500">
                    A few words (8+ characters) help the team respond faster.
                  </p>
                </div>

                {topError ? (
                  <p className="text-sm font-medium text-red-700">{topError}</p>
                ) : null}

                <button
                  type="submit"
                  disabled={submitting || privateNote.trim().length < 8}
                  className="flex w-full min-h-[54px] items-center justify-center rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-4 text-base font-semibold text-white shadow-xl shadow-slate-900/20 transition hover:from-slate-800 hover:to-slate-700 disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-none"
                >
                  {submitting ? "Sending securely…" : "Send privately to the team"}
                </button>

                <button
                  type="button"
                  className="w-full rounded-xl py-2 text-sm font-medium text-slate-600 underline-offset-4 transition hover:bg-slate-50 hover:text-slate-900 hover:underline"
                  onClick={() => {
                    setPhase("rate");
                    setSelectedRating(null);
                    setPrivateNote("");
                    setTopError(null);
                  }}
                >
                  ← Change star rating
                </button>
              </motion.form>
            ) : null}

            {phase === "private_done" ? (
              <motion.div
                key="done"
                initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={transition}
                className="space-y-6 text-center"
              >
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 text-3xl shadow-2xl shadow-slate-900/50 ring-4 ring-white">
                  <span aria-hidden>✉️</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                    Thank you — we got it.
                  </h2>
                  <p className="mx-auto mt-3 max-w-sm text-base leading-relaxed text-slate-600">
                    Someone from{" "}
                    <span className="font-semibold text-slate-800">{businessName}</span> may reach
                    out if needed. Nothing was posted publicly.
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200/90 bg-slate-50/90 px-4 py-3 text-xs font-medium text-slate-600 ring-1 ring-slate-100">
                  Your feedback was delivered securely. You can close this tab.
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <p className="mx-auto mt-10 max-w-xs text-center text-[11px] font-medium uppercase tracking-[0.2em] text-slate-400">
          Secure feedback · Local business
        </p>
      </div>
    </div>
  );
}
