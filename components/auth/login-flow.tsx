"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState, Suspense } from "react";
import { parseSignupMobile } from "@/lib/phone";

type Step = "phone" | "code";

/** Avoid `res.json()` throwing on empty or HTML error bodies. */
function parseApiBody(text: string): Record<string, unknown> | null {
  const t = text.trim();
  if (!t) return null;
  try {
    return JSON.parse(t) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function errorMessageFromBody(
  data: Record<string, unknown> | null,
  fallback: string,
): string {
  const e = data?.error;
  if (e && typeof e === "object" && e !== null && "message" in e) {
    const m = (e as { message?: unknown }).message;
    if (typeof m === "string" && m.trim()) return m;
  }
  return fallback;
}

function LoginFlowInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") ?? "/dashboard";
  const formId = useId();

  const [step, setStep] = useState<Step>("phone");
  const [submitting, setSubmitting] = useState(false);
  const [topError, setTopError] = useState<string | null>(null);

  const [phoneRaw, setPhoneRaw] = useState("");
  const [pendingToken, setPendingToken] = useState("");
  const [phoneMasked, setPhoneMasked] = useState("");
  const [firstName, setFirstName] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const codeRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [resendSec, setResendSec] = useState(30);

  const phoneE164 = useMemo(() => {
    const r = parseSignupMobile(phoneRaw);
    return r.ok ? r.e164 : null;
  }, [phoneRaw]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/v1/auth/me");
      if (res.ok && !cancelled) {
        router.replace(nextPath.startsWith("/") ? nextPath : "/dashboard");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router, nextPath]);

  useEffect(() => {
    if (step !== "code" || resendSec <= 0) return;
    const id = setInterval(() => setResendSec((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [step, resendSec]);

  const codeDone = code.every((c) => c.length === 1);

  const setDigit = (i: number, val: string) => {
    const d = val.replace(/\D/g, "").slice(-1);
    const next = [...code];
    next[i] = d;
    setCode(next);
    if (d && i < 5) codeRefs.current[i + 1]?.focus();
  };

  const onRequestCode = async () => {
    setTopError(null);
    if (!phoneE164) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/auth/login/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_e164: phoneE164 }),
      });
      const rawText = await res.text();
      const data = parseApiBody(rawText);
      if (!data) {
        setTopError(
          !res.ok
            ? `Could not send code (${res.status}).`
            : "Empty response from server — try again.",
        );
        return;
      }
      if (!res.ok) {
        setTopError(errorMessageFromBody(data, "Could not send code."));
        return;
      }
      const token = data.pending_verification_token;
      const masked = data.phone_masked;
      if (typeof token !== "string" || typeof masked !== "string") {
        setTopError("Invalid response from server.");
        return;
      }
      setPendingToken(token);
      setPhoneMasked(masked);
      setFirstName(
        typeof data.first_name === "string" ? data.first_name : "",
      );
      setStep("code");
      setResendSec(30);
      setCode(["", "", "", "", "", ""]);
    } finally {
      setSubmitting(false);
    }
  };

  const onConfirm = async () => {
    setTopError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/auth/login/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pending_verification_token: pendingToken,
          code: code.join(""),
        }),
      });
      const rawText = await res.text();
      const data = parseApiBody(rawText);
      if (!data) {
        setTopError(
          !res.ok
            ? `Verification failed (${res.status}).`
            : "Empty response from server — try again.",
        );
        setCode(["", "", "", "", "", ""]);
        return;
      }
      if (!res.ok) {
        setTopError(errorMessageFromBody(data, "Verification failed."));
        setCode(["", "", "", "", "", ""]);
        return;
      }
      const safeNext = nextPath.startsWith("/") ? nextPath : "/dashboard";
      router.push(safeNext);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  const onResend = async () => {
    if (resendSec > 0) return;
    setTopError(null);
    const res = await fetch("/api/v1/auth/verify/resend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pending_verification_token: pendingToken }),
    });
    if (!res.ok) {
      const t = await res.text();
      const data = parseApiBody(t);
      setTopError(
        data
          ? errorMessageFromBody(data, "Could not resend.")
          : "Could not resend.",
      );
      return;
    }
    setResendSec(30);
  };

  if (step === "code") {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-12">
        <div className="mx-auto w-full max-w-[480px] rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <Link
            href="/"
            className="text-sm font-medium text-brand-700 hover:text-brand-800"
          >
            ← Home
          </Link>
          <p className="mt-6 text-sm font-semibold uppercase tracking-wide text-brand-700">
            Log in
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
            Enter your code
          </h1>
          <p className="mt-2 text-slate-600">
            We texted {phoneMasked}. Enter the 6-digit code for {firstName ? `${firstName}` : "your account"}.
          </p>

          {topError && (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
              {topError}
            </p>
          )}

          <div className="mt-8 flex justify-center gap-2 sm:gap-3">
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
            disabled={!codeDone || submitting}
            onClick={onConfirm}
            className="mt-10 flex w-full min-h-[48px] items-center justify-center rounded-xl bg-brand-600 px-4 py-3 text-base font-semibold text-white disabled:bg-slate-300"
          >
            {submitting ? "Signing in…" : "Continue"}
          </button>

          <button
            type="button"
            className="mt-4 w-full text-center text-sm text-slate-600"
            onClick={() => {
              setStep("phone");
              setTopError(null);
            }}
          >
            Wrong number? <span className="font-semibold text-brand-700">Change it</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto w-full max-w-[480px] rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <Link href="/" className="text-sm font-medium text-brand-700 hover:text-brand-800">
          ← Home
        </Link>
        <p className="mt-6 text-sm font-semibold uppercase tracking-wide text-brand-700">
          Log in
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
          Welcome back
        </h1>
        <p className="mt-3 text-slate-600">
          Enter the mobile number on your account. We&apos;ll text you a one-time code — no password
          to remember.
        </p>

        {topError && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
            {topError}
          </p>
        )}

        <form
          id={formId}
          className="mt-8 space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (phoneE164) void onRequestCode();
          }}
        >
          <div>
            <label htmlFor={`${formId}-phone`} className="block text-sm font-medium text-slate-800">
              Mobile phone
            </label>
            <input
              id={`${formId}-phone`}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+1 · or +91 for local/dev"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-3 text-base outline-none ring-brand-500 focus:border-brand-500 focus:ring-2"
              value={phoneRaw}
              onChange={(e) => setPhoneRaw(e.target.value)}
              required
            />
            {phoneRaw && !phoneE164 && (
              <p className="mt-1 text-sm text-red-700" role="status" aria-live="polite">
                Enter a valid mobile (production: US/Canada; staging: US/CA +91; local:
                same, optional DEV_PHONE_ALLOWLIST for US/CA).
              </p>
            )}
          </div>
        </form>

        <button
          form={formId}
          type="submit"
          disabled={!phoneE164 || submitting}
          className="mt-8 flex w-full min-h-[48px] items-center justify-center rounded-xl bg-brand-600 px-4 py-3 text-base font-semibold text-white disabled:bg-slate-300"
        >
          {submitting ? "Sending code…" : "Text me a code"}
        </button>

        <p className="mt-8 text-center text-sm text-slate-600">
          New here?{" "}
          <Link href="/onboarding" className="font-semibold text-brand-700">
            Sign up free
          </Link>
        </p>
      </div>
    </div>
  );
}

export function LoginFlow() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600">
          Loading…
        </div>
      }
    >
      <LoginFlowInner />
    </Suspense>
  );
}
