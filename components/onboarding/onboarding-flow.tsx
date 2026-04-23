"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { AutoReviewsActivation } from "@/components/onboarding/auto-reviews-activation";
import { parseSignupMobile } from "@/lib/phone";
import { supportEmail, supportMailto } from "@/lib/support";

const TOS_VERSION = "2026-04-16";

function BackChevron({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function isValidWorkEmail(s: string): boolean {
  const t = s.trim();
  if (t.length < 5) return false;
  return /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/i.test(t);
}

type Prediction = { place_id: string; description: string };

type Step = "signup" | "verify" | "success";

export function OnboardingFlow() {
  const router = useRouter();
  const formId = useId();
  const [step, setStep] = useState<Step>("signup");
  const [submitting, setSubmitting] = useState(false);
  const [topError, setTopError] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneRaw, setPhoneRaw] = useState("");
  const [query, setQuery] = useState("");
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [openPlaces, setOpenPlaces] = useState(false);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [selectedDescription, setSelectedDescription] = useState("");
  const [manualMode, setManualMode] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualStreet, setManualStreet] = useState("");
  const [manualCity, setManualCity] = useState("");
  const [manualState, setManualState] = useState("");
  const [manualZip, setManualZip] = useState("");
  const [typingHelp, setTypingHelp] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [placesError, setPlacesError] = useState<string | null>(null);
  const [placesEmptyHint, setPlacesEmptyHint] = useState(false);

  const [pendingToken, setPendingToken] = useState("");
  const [phoneMasked, setPhoneMasked] = useState("");
  const [verifyFirstName, setVerifyFirstName] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const codeRefs = useRef<Array<HTMLInputElement | null>>([]);
  const placesContainerRef = useRef<HTMLDivElement>(null);
  const [resendSec, setResendSec] = useState(30);

  const placesSession = useMemo(() => {
    if (typeof window === "undefined") return "ss";
    let s = sessionStorage.getItem("places_session");
    if (!s) {
      s = crypto.randomUUID();
      sessionStorage.setItem("places_session", s);
    }
    return s;
  }, []);

  useEffect(() => {
    if (!query.trim() || manualMode) {
      setPredictions([]);
      setOpenPlaces(false);
      setPlacesError(null);
      setPlacesEmptyHint(false);
      return;
    }
    /** After user picks a place, query matches the label — don’t refetch or reopen the dropdown. */
    if (
      selectedPlaceId &&
      query.trim() === selectedDescription.trim()
    ) {
      return;
    }

    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/v1/places/autocomplete?q=${encodeURIComponent(query)}&session=${encodeURIComponent(placesSession)}`,
        );
        const data = (await res.json()) as {
          predictions?: Prediction[];
          error?: { message?: string };
        };
        if (!res.ok) {
          setPredictions([]);
          setOpenPlaces(false);
          setPlacesEmptyHint(false);
          setPlacesError(
            data?.error?.message ??
              "Business search failed. For Google Cloud keys used on Vercel, set Application restriction to “None” (server has no browser referrer), and restrict by API = Places API only.",
          );
          return;
        }
        const list = data.predictions ?? [];
        setPlacesError(null);
        setPredictions(list);
        setPlacesEmptyHint(query.trim().length >= 2 && list.length === 0);
        setOpenPlaces(list.length > 0);
      } catch {
        setPredictions([]);
        setOpenPlaces(false);
        setPlacesEmptyHint(false);
        setPlacesError("Could not reach business search. Check your connection.");
      }
    }, 220);
    return () => clearTimeout(t);
  }, [query, manualMode, placesSession, selectedPlaceId, selectedDescription]);

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (!placesContainerRef.current?.contains(e.target as Node)) {
        setOpenPlaces(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  useEffect(() => {
    if (!query.trim() || manualMode || selectedPlaceId) {
      setTypingHelp(false);
      return;
    }
    const t = setTimeout(() => setTypingHelp(true), 2000);
    return () => clearTimeout(t);
  }, [query, manualMode, selectedPlaceId]);

  useEffect(() => {
    if (step !== "verify" || resendSec <= 0) return;
    const id = setInterval(() => setResendSec((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [step, resendSec]);

  const phoneE164 = useMemo(() => {
    const r = parseSignupMobile(phoneRaw);
    return r.ok ? r.e164 : null;
  }, [phoneRaw]);

  /** When the typed query exactly matches a prediction, treat it as selected (no click required). */
  const resolvedPlaceId = useMemo(() => {
    if (manualMode) return null;
    if (selectedPlaceId) return selectedPlaceId;
    const q = query.trim().toLowerCase();
    if (!q) return null;
    const exact = predictions.find(
      (p) => p.description.trim().toLowerCase() === q,
    );
    return exact?.place_id ?? null;
  }, [manualMode, selectedPlaceId, query, predictions]);

  const syncPlaceSelection = useCallback(() => {
    if (manualMode) return;
    if (selectedPlaceId) return;
    const q = query.trim();
    if (!q) return;
    const n = q.toLowerCase();
    const byExact = predictions.find(
      (p) => p.description.trim().toLowerCase() === n,
    );
    if (byExact) {
      setSelectedPlaceId(byExact.place_id);
      setSelectedDescription(byExact.description);
      setQuery(byExact.description);
      setOpenPlaces(false);
      return;
    }
    if (predictions.length === 1) {
      const p0 = predictions[0];
      if (!p0) return;
      const d = p0.description.toLowerCase();
      if (d === n || d.startsWith(n) || (n.length >= 4 && d.includes(n))) {
        setSelectedPlaceId(p0.place_id);
        setSelectedDescription(p0.description);
        setQuery(p0.description);
        setOpenPlaces(false);
      }
    }
  }, [manualMode, selectedPlaceId, query, predictions]);

  const signupValid =
    fullName.trim().length >= 2 &&
    isValidWorkEmail(email) &&
    !!phoneE164 &&
    (manualMode
      ? Boolean(
          manualName.trim() &&
            manualStreet.trim() &&
            manualCity.trim() &&
            manualState.trim().length === 2 &&
            manualZip.trim().length >= 3,
        )
      : !!resolvedPlaceId);

  const validationHint = useMemo(() => {
    if (signupValid) return null;
    const parts: string[] = [];
    if (fullName.trim().length < 2) parts.push("full name");
    if (!isValidWorkEmail(email)) parts.push("work email");
    if (!phoneE164) parts.push("valid mobile");
    if (manualMode) {
      if (!manualName.trim()) parts.push("business name");
      if (!manualStreet.trim()) parts.push("street");
      if (!manualCity.trim()) parts.push("city");
      if (manualState.trim().length !== 2) parts.push("2-letter state");
      if (manualZip.trim().length < 3) parts.push("ZIP");
    } else if (!resolvedPlaceId) {
      parts.push("pick a business from the list (or enter address manually)");
    }
    return `Complete: ${parts.join(" · ")}`;
  }, [
    signupValid,
    fullName,
    email,
    phoneE164,
    manualMode,
    manualName,
    manualStreet,
    manualCity,
    manualState,
    manualZip,
    resolvedPlaceId,
  ]);

  const codeDone = code.every((c) => c.length === 1);

  const likelyPlace = useMemo(() => {
    if (manualMode) return null;
    if (resolvedPlaceId) {
      const existing = predictions.find((p) => p.place_id === resolvedPlaceId);
      return (
        existing ?? {
          place_id: resolvedPlaceId,
          description: selectedDescription || query.trim(),
        }
      );
    }
    const q = query.trim().toLowerCase();
    if (!q) return null;
    const exact = predictions.find((p) => p.description.trim().toLowerCase() === q);
    if (exact) return exact;
    if (predictions.length === 1) {
      const only = predictions[0];
      const d = only.description.trim().toLowerCase();
      if (d.startsWith(q) || (q.length >= 4 && d.includes(q))) return only;
    }
    return null;
  }, [manualMode, predictions, query, resolvedPlaceId, selectedDescription]);

  const setDigit = (i: number, val: string) => {
    const d = val.replace(/\D/g, "").slice(-1);
    const next = [...code];
    next[i] = d;
    setCode(next);
    if (d && i < 5) codeRefs.current[i + 1]?.focus();
  };

  const onPasteCode = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const t = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (t.length === 6) {
      e.preventDefault();
      setCode(t.split(""));
      codeRefs.current[5]?.focus();
    }
  };

  const onSignup = useCallback(async (placeIdOverride?: string | null) => {
    setTopError(null);
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        full_name: fullName.trim(),
        email: email.trim(),
        phone_e164: phoneE164,
        auth_provider: "email",
        oauth_pending_token: null,
        tos_version: TOS_VERSION,
      };

      if (manualMode) {
        body.manual_address = {
          business_name: manualName.trim(),
          street: manualStreet.trim(),
          city: manualCity.trim(),
          state: manualState.trim().toUpperCase(),
          zip: manualZip.trim(),
        };
      } else {
        body.place_id = placeIdOverride ?? resolvedPlaceId;
        body.manual_address = null;
      }

      const res = await fetch("/api/v1/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const raw = await res.text();
      let data: {
        pending_verification_token?: string;
        phone_masked?: string;
        first_name?: string;
        error?: { message?: string };
      };
      try {
        data = JSON.parse(raw) as typeof data;
      } catch {
        setTopError(
          `Server returned a non-JSON response (${res.status}). Usually: missing DATABASE_URL on this Vercel environment, or the deployment crashed — check Vercel → Logs.`,
        );
        return;
      }

      if (!res.ok) {
        const msg =
          data?.error?.message ??
          (res.status === 429 ? "Too many attempts." : "Something went wrong.");
        setTopError(msg);
        return;
      }

      setPendingToken(data.pending_verification_token ?? "");
      setPhoneMasked(data.phone_masked ?? "");
      setVerifyFirstName(data.first_name ?? fullName.trim().split(/\s+/)[0] ?? "");
      setStep("verify");
      setResendSec(30);
      setCode(["", "", "", "", "", ""]);
    } catch {
      setTopError("Could not reach the server — check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }, [
    email,
    fullName,
    manualCity,
    manualMode,
    manualName,
    manualState,
    manualStreet,
    manualZip,
    phoneE164,
    resolvedPlaceId,
  ]);

  const onVerify = useCallback(async () => {
    setTopError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pending_verification_token: pendingToken,
          code: code.join(""),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTopError(data?.error?.message ?? "Verification failed.");
        setCode(["", "", "", "", "", ""]);
        return;
      }
      setStep("success");
    } finally {
      setSubmitting(false);
    }
  }, [code, pendingToken]);

  const onResend = async () => {
    if (resendSec > 0) return;
    setTopError(null);
    const res = await fetch("/api/v1/auth/verify/resend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pending_verification_token: pendingToken }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setTopError(data?.error?.message ?? "Could not resend.");
      return;
    }
    setResendSec(30);
  };

  const googleStart = async () => {
    const res = await fetch("/api/v1/auth/google/start", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setTopError(
      data?.error?.message ??
        "Google sign-in will pre-fill name and email after OAuth is configured.",
    );
  };

  if (step === "success") {
    return (
      <AutoReviewsActivation
        onDashboard={() => router.push("/dashboard?welcome=1")}
      />
    );
  }

  if (step === "verify") {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-10">
        <header className="mx-auto mb-8 flex max-w-[480px] items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setStep("signup");
              setTopError(null);
            }}
            className="-ml-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-slate-700 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            aria-label="Back to signup form"
          >
            <BackChevron className="h-6 w-6" />
          </button>
          <Link
            href="/"
            className="ml-auto text-lg font-semibold tracking-tight text-brand-800 hover:text-brand-900"
          >
            Hatsoffly
          </Link>
        </header>
        <div className="mx-auto w-full max-w-[480px] rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">
            Step 2 of 2
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
            You&apos;re almost there, {verifyFirstName}.
          </h1>
          <p className="mt-2 text-slate-600">
            Enter the 6-digit code we just texted to {phoneMasked}.
          </p>

          {topError && (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
              {topError}
            </p>
          )}

          <div className="mt-8 flex justify-center gap-2 sm:gap-3" onPaste={onPasteCode}>
            {code.map((d, i) => (
              <input
                key={i}
                ref={(el) => {
                  codeRefs.current[i] = el;
                }}
                inputMode="numeric"
                autoComplete={i === 0 ? "one-time-code" : "off"}
                aria-label={`Digit ${i + 1}`}
                className="h-14 w-11 rounded-lg border border-slate-200 text-center text-2xl font-semibold outline-none ring-brand-500 focus:border-brand-500 focus:ring-2"
                value={d}
                maxLength={1}
                onChange={(e) => setDigit(i, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Backspace" && !code[i] && i > 0) {
                    codeRefs.current[i - 1]?.focus();
                  }
                }}
              />
            ))}
          </div>

          <p className="mt-4 text-center text-sm text-slate-600">
            Didn&apos;t get it?{" "}
            {resendSec > 0 ? (
              <span>Resend in {resendSec}s</span>
            ) : (
              <button
                type="button"
                className="font-semibold text-brand-700 underline-offset-4 hover:underline"
                onClick={onResend}
              >
                Resend code
              </button>
            )}
          </p>

          <button
            type="button"
            className="mt-2 w-full text-center text-sm text-slate-600"
            onClick={() => {
              setStep("signup");
              setTopError(null);
            }}
          >
            Wrong number?{" "}
            <span className="font-semibold text-brand-700">Change it</span>
          </button>

          <button
            type="button"
            disabled={!codeDone || submitting}
            onClick={onVerify}
            className="mt-10 flex w-full min-h-[48px] items-center justify-center rounded-xl bg-brand-600 px-4 py-3 text-base font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? "Verifying…" : "Verify & send test"}
          </button>
          <p className="mt-4 text-center text-xs text-slate-500">
            When you confirm, we&apos;ll send a test review request to your phone — the exact SMS
            your customers will see.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <header className="mx-auto mb-8 flex max-w-[480px] items-center gap-3">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="-ml-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-slate-700 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          aria-label="Back to home"
        >
          <BackChevron className="h-6 w-6" />
        </button>
        <Link
          href="/"
          className="ml-auto text-lg font-semibold tracking-tight text-brand-800 hover:text-brand-900"
        >
          Hatsoffly
        </Link>
      </header>

      <div className="mx-auto w-full max-w-[480px] rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">
          Step 1 of 2
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
          Let&apos;s get your reviews growing.
        </h1>
        <p className="mt-3 text-slate-600">
          We&apos;ll text your customers automatically after each job. No setup on your end.
        </p>

        <button
          type="button"
          onClick={googleStart}
          className="mt-8 flex w-full min-h-[48px] items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-base font-semibold text-slate-900 shadow-sm hover:bg-slate-50"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </button>

        <div className="my-8 flex items-center gap-4">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-sm text-slate-500">or</span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        {topError && (
          <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
            {topError}
          </p>
        )}

        <form
          id={formId}
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            setTopError(null);
            setAttemptedSubmit(true);

            const placeCandidateId = manualMode
              ? null
              : likelyPlace?.place_id ?? resolvedPlaceId ?? selectedPlaceId;
            const validNow =
              fullName.trim().length >= 2 &&
              isValidWorkEmail(email) &&
              !!phoneE164 &&
              (manualMode
                ? Boolean(
                    manualName.trim() &&
                      manualStreet.trim() &&
                      manualCity.trim() &&
                      manualState.trim().length === 2 &&
                      manualZip.trim().length >= 3,
                  )
                : !!placeCandidateId);

            if (!validNow) {
              setTopError(validationHint ?? "Please complete all required fields.");
              return;
            }

            if (!manualMode && likelyPlace && !selectedPlaceId) {
              setSelectedPlaceId(likelyPlace.place_id);
              setSelectedDescription(likelyPlace.description);
              setQuery(likelyPlace.description);
            }

            void onSignup(placeCandidateId);
          }}
        >
          <div>
            <label htmlFor={`${formId}-name`} className="block text-sm font-medium text-slate-800">
              Full name
            </label>
            <input
              id={`${formId}-name`}
              autoComplete="name"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-3 text-base outline-none ring-brand-500 focus:border-brand-500 focus:ring-2"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor={`${formId}-email`} className="block text-sm font-medium text-slate-800">
              Work email
            </label>
            <input
              id={`${formId}-email`}
              type="email"
              autoComplete="email"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-3 text-base outline-none ring-brand-500 focus:border-brand-500 focus:ring-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor={`${formId}-phone`} className="block text-sm font-medium text-slate-800">
              Mobile phone
            </label>
            <input
              id={`${formId}-phone`}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+1 · or +91 98765 43210 (local/dev)"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-3 text-base outline-none ring-brand-500 focus:border-brand-500 focus:ring-2"
              value={phoneRaw}
              onChange={(e) => setPhoneRaw(e.target.value)}
              required
            />
            {phoneRaw && !phoneE164 && (
              <p className="mt-1 text-sm text-red-700" role="status" aria-live="polite">
                Enter a valid mobile (production: US/Canada; development / Preview: US/CA
                and +91; local: same, or set DEV_PHONE_ALLOWLIST to limit US/CA on this
                machine only).
              </p>
            )}
          </div>

          {!manualMode ? (
            <div ref={placesContainerRef} className="relative z-20">
              <label
                htmlFor={`${formId}-biz`}
                className="block text-sm font-medium text-slate-800"
              >
                Find your business
              </label>
              <input
                id={`${formId}-biz`}
                autoComplete="off"
                placeholder="Search Google Places…"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-3 text-base outline-none ring-brand-500 focus:border-brand-500 focus:ring-2"
                value={selectedDescription || query}
                onChange={(e) => {
                  setSelectedPlaceId(null);
                  setSelectedDescription("");
                  setPlacesError(null);
                  setPlacesEmptyHint(false);
                  setQuery(e.target.value);
                }}
                onFocus={() => {
                  if (predictions.length > 0) setOpenPlaces(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setOpenPlaces(false);
                }}
                onBlur={syncPlaceSelection}
              />
              {placesError && (
                <p className="mt-2 text-sm text-red-700" role="alert">
                  {placesError}
                </p>
              )}
              {placesEmptyHint && !placesError && (
                <p className="mt-2 text-sm text-slate-600" role="status">
                  No matches for that search — try a nearby city or business name, or use manual address.
                </p>
              )}
              <button
                type="button"
                className="mt-2 text-sm font-semibold text-brand-700 underline-offset-4 hover:underline"
                onClick={() => {
                  setManualMode(true);
                  setOpenPlaces(false);
                }}
              >
                Enter address manually
              </button>
              {typingHelp && (
                <p className="mt-2 text-xs text-slate-500">
                  Tip: choose a row from the list, or type the full line until it matches, or use manual
                  entry.
                </p>
              )}
              {openPlaces && predictions.length > 0 && (
                <ul
                  className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-xl ring-1 ring-slate-900/5"
                  role="listbox"
                >
                  {predictions.map((p) => (
                    <li key={p.place_id}>
                      <button
                        type="button"
                        className="flex min-h-[44px] w-full px-3 py-3 text-left text-sm hover:bg-slate-50"
                        onMouseDown={(e) => {
                          e.preventDefault();
                        }}
                        onClick={() => {
                          setSelectedPlaceId(p.place_id);
                          setSelectedDescription(p.description);
                          setQuery(p.description);
                          setOpenPlaces(false);
                        }}
                      >
                        {p.description}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-800">Business address</p>
              <input
                aria-label="Business name"
                placeholder="Business name"
                className="w-full rounded-lg border border-slate-200 px-3 py-2"
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
              />
              <input
                aria-label="Street"
                placeholder="Street"
                className="w-full rounded-lg border border-slate-200 px-3 py-2"
                value={manualStreet}
                onChange={(e) => setManualStreet(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  aria-label="City"
                  placeholder="City"
                  className="rounded-lg border border-slate-200 px-3 py-2"
                  value={manualCity}
                  onChange={(e) => setManualCity(e.target.value)}
                />
                <input
                  aria-label="State"
                  placeholder="ST"
                  maxLength={2}
                  className="rounded-lg border border-slate-200 px-3 py-2 uppercase"
                  value={manualState}
                  onChange={(e) => setManualState(e.target.value)}
                />
              </div>
              <input
                aria-label="ZIP"
                placeholder="ZIP"
                className="w-full rounded-lg border border-slate-200 px-3 py-2"
                value={manualZip}
                onChange={(e) => setManualZip(e.target.value)}
              />
              <button
                type="button"
                className="text-sm font-semibold text-brand-700"
                onClick={() => {
                  setManualMode(false);
                  setQuery("");
                  setSelectedPlaceId(null);
                  setSelectedDescription("");
                }}
              >
                Back to search
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-8 flex w-full min-h-[48px] items-center justify-center rounded-xl bg-brand-600 px-4 py-3 text-base font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? "Continuing…" : "Continue"}
          </button>
        </form>

        {validationHint &&
          Boolean(
            fullName.trim() ||
              email.trim() ||
              phoneRaw.trim() ||
              query.trim() ||
              manualMode ||
              attemptedSubmit,
          ) && (
            <p className="mt-3 text-center text-sm text-amber-900/90" role="status">
              {validationHint}
            </p>
          )}

        <p className="mt-6 text-center text-xs leading-relaxed text-slate-500">
          By continuing, you agree to our{" "}
          <Link href="/terms" className="font-semibold text-brand-800 underline-offset-2 hover:underline">
            Terms
          </Link>{" "}
          and{" "}
          <Link
            href="/privacy"
            className="font-semibold text-brand-800 underline-offset-2 hover:underline"
          >
            Privacy Policy
          </Link>
          .
        </p>

        <footer className="mt-8 flex flex-wrap justify-center gap-x-4 gap-y-2 text-center text-sm text-slate-600">
          <span>
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-brand-700">
              Log in
            </Link>
          </span>
          <span aria-hidden className="hidden sm:inline">
            ·
          </span>
          <a className="font-medium" href={supportMailto("Hatsoffly signup help")}>
            Need help? {supportEmail()}
          </a>
        </footer>
      </div>
    </div>
  );
}
