"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { IconAccounts, IconBell, IconMail, IconSms, IconVerified } from "@/components/dashboard/icons";

type UserRow = {
  email: string;
  phone_e164: string;
  phone_verified_at: string | null;
  email_verified_at: string | null;
};

type EditSession = {
  field: "phone" | "email";
  step: "input" | "code";
};

async function apiErrorMessage(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { error?: { message?: string } };
    if (j?.error?.message) return j.error.message;
  } catch {
    /* ignore */
  }
  return "Something went wrong.";
}

function maskPhoneHint(e164: string): string {
  const d = e164.replace(/\D/g, "");
  const last = d.slice(-4);
  if (last.length < 4) return "that number";
  return `•••• •••• ${last}`;
}

function maskEmailHint(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain || !local) return "that address";
  const head = local.slice(0, Math.min(2, local.length));
  return `${head}•••@${domain}`;
}

function StatusPill({ verified, label }: { verified: boolean; label: string }) {
  if (verified) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-100/80">
        <IconVerified className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
        Verified
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-900 ring-1 ring-amber-100">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden />
      {label}
    </span>
  );
}

export function OwnerAccountSettingsSection({
  user,
  onReload,
  showToast,
}: {
  user: UserRow;
  onReload: () => void | Promise<void>;
  showToast: (msg: string) => void;
}) {
  const router = useRouter();
  const phoneOk = user.phone_verified_at != null;
  const emailOk = user.email_verified_at != null;
  const canStartChange = phoneOk && emailOk;

  const [edit, setEdit] = useState<EditSession | null>(null);
  const [draft, setDraft] = useState("");
  const [sentToValue, setSentToValue] = useState("");
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePhrase, setDeletePhrase] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);

  const closeEditor = useCallback(() => {
    setEdit(null);
    setDraft("");
    setSentToValue("");
    setChallengeId(null);
    setOtp("");
  }, []);

  useEffect(() => {
    if (!edit) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) closeEditor();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [edit, busy, closeEditor]);

  const openEdit = (field: "phone" | "email") => {
    setEdit({ field, step: "input" });
    setDraft("");
    setSentToValue("");
    setChallengeId(null);
    setOtp("");
  };

  const sendCode = async (channel: "phone" | "email", value: string) => {
    setBusy(true);
    try {
      const res = await fetch("/api/v1/account/contact/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel, value }),
      });
      const json = (await res.json()) as { challenge_id?: string };
      if (!res.ok) {
        showToast(await apiErrorMessage(res));
        return;
      }
      if (json.challenge_id) {
        setChallengeId(json.challenge_id);
        setSentToValue(value);
        setEdit({ field: channel, step: "code" });
        setOtp("");
        showToast(channel === "phone" ? "Verification code sent by SMS." : "Verification code sent to your inbox.");
      }
    } finally {
      setBusy(false);
    }
  };

  const confirmCode = async () => {
    if (!challengeId || otp.length !== 6) return;
    setBusy(true);
    try {
      const res = await fetch("/api/v1/account/contact/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challenge_id: challengeId, code: otp }),
      });
      if (!res.ok) {
        showToast(await apiErrorMessage(res));
        return;
      }
      showToast("Contact updated.");
      closeEditor();
      await onReload();
    } finally {
      setBusy(false);
    }
  };

  const submitDelete = async () => {
    setDeleteBusy(true);
    try {
      const res = await fetch("/api/v1/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: "DELETE MY ACCOUNT" }),
      });
      if (!res.ok) {
        showToast(await apiErrorMessage(res));
        return;
      }
      showToast("Account deleted.");
      router.push("/");
      router.refresh();
    } finally {
      setDeleteBusy(false);
      setDeleteOpen(false);
    }
  };

  const editingPhone = edit?.field === "phone";
  const editingEmail = edit?.field === "email";
  const showPhonePanel = editingPhone;
  const showEmailPanel = editingEmail;

  return (
    <div className="mb-10 space-y-6">
      <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm ring-1 ring-slate-900/[0.04]">
        <div className="border-b border-slate-100 bg-gradient-to-b from-slate-50/80 to-white px-6 py-5 sm:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200/80">
                <IconAccounts className="h-5 w-5 text-brand-600" aria-hidden />
              </div>
              <div>
                <h2 className="text-base font-bold tracking-tight text-slate-900 sm:text-lg">Contact &amp; sign-in</h2>
                <p className="mt-1 max-w-xl text-sm leading-relaxed text-slate-600">
                  Used for your login, security alerts, and SMS review requests. Updates apply after you confirm a
                  one-time code sent to the new contact.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-2 sm:px-8">
          {!canStartChange ? (
            <div className="my-4 flex gap-3 rounded-xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
              <span className="mt-0.5 shrink-0 text-amber-600" aria-hidden>
                <IconBell className="h-5 w-5" />
              </span>
              <div>
                <p className="font-semibold">Verification required</p>
                <p className="mt-0.5 text-amber-900/85">
                  Both phone and email must be verified before you can change them. Finish onboarding verification or
                  contact support if this looks wrong.
                </p>
              </div>
            </div>
          ) : null}

          <ul className="divide-y divide-slate-100">
            {/* Phone row */}
            <li className="py-5 sm:py-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
                <div className="flex min-w-0 flex-1 gap-3">
                  <div className="mt-0.5 hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 sm:flex">
                    <IconSms className="h-4 w-4" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 gap-y-1">
                      <span className="text-sm font-semibold text-slate-900">Phone number</span>
                      <StatusPill verified={phoneOk} label="Pending" />
                    </div>
                    <p className="mt-1.5 font-mono text-[15px] font-medium tracking-tight text-slate-800">
                      {user.phone_e164}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">SMS login codes and review alerts are sent here.</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2 sm:pt-0.5">
                  {showPhonePanel ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => closeEditor()}
                      className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
                    >
                      Close
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={!canStartChange || busy || (!!edit && edit.field !== "phone")}
                      onClick={() => openEdit("phone")}
                      title={
                        !canStartChange
                          ? "Verify phone and email first"
                          : edit && edit.field !== "phone"
                            ? "Finish or close the other change first"
                            : undefined
                      }
                      className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-100 disabled:bg-slate-50 disabled:text-slate-400"
                    >
                      Update
                    </button>
                  )}
                </div>
              </div>

              {showPhonePanel ? (
                <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50/50 p-4 sm:p-5">
                  {edit?.step === "input" ? (
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="new-phone" className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                          New mobile number
                        </label>
                        <input
                          id="new-phone"
                          type="tel"
                          autoComplete="tel"
                          disabled={busy}
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          placeholder="+1 (555) 000-0000"
                          className="mt-2 w-full max-w-md rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none ring-brand-500/20 transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 disabled:bg-slate-50"
                        />
                        <p className="mt-2 text-xs text-slate-500">US/CA mobile; we&apos;ll text a 6-digit code to this number.</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={busy || draft.trim().length < 10}
                          onClick={() => void sendCode("phone", draft.trim())}
                          className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Continue
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => closeEditor()}
                          className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-white/80"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-900">Enter verification code</p>
                        <span className="text-xs text-slate-500">Sent to {maskPhoneHint(sentToValue)}</span>
                      </div>
                      <input
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        autoFocus
                        maxLength={6}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        className="w-full max-w-[13rem] rounded-lg border border-slate-200 bg-white py-3 text-center font-mono text-2xl font-semibold tracking-[0.35em] text-slate-900 shadow-sm outline-none ring-brand-500/20 focus:border-brand-500 focus:ring-4 sm:text-3xl sm:tracking-[0.4em]"
                        placeholder="••••••"
                        aria-label="6-digit code"
                      />
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                        <button
                          type="button"
                          disabled={busy || otp.length !== 6}
                          onClick={() => void confirmCode()}
                          className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Verify and update
                        </button>
                        <button
                          type="button"
                          disabled={busy || sentToValue.length < 10}
                          onClick={() => void sendCode("phone", sentToValue)}
                          className="text-sm font-medium text-brand-600 hover:text-brand-700 disabled:opacity-40"
                        >
                          Resend code
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            setEdit({ field: "phone", step: "input" });
                            setChallengeId(null);
                            setOtp("");
                            setDraft(sentToValue);
                          }}
                          className="text-sm font-medium text-slate-600 hover:text-slate-900"
                        >
                          Use a different number
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </li>

            {/* Email row */}
            <li className="py-5 sm:py-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
                <div className="flex min-w-0 flex-1 gap-3">
                  <div className="mt-0.5 hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 sm:flex">
                    <IconMail className="h-4 w-4" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 gap-y-1">
                      <span className="text-sm font-semibold text-slate-900">Email address</span>
                      <StatusPill verified={emailOk} label="Pending" />
                    </div>
                    <p className="mt-1.5 break-all text-[15px] font-medium text-slate-800">{user.email}</p>
                    <p className="mt-1 text-xs text-slate-500">Login links and product updates go to this inbox.</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2 sm:pt-0.5">
                  {showEmailPanel ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => closeEditor()}
                      className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
                    >
                      Close
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={!canStartChange || busy || (!!edit && edit.field !== "email")}
                      onClick={() => openEdit("email")}
                      title={
                        !canStartChange
                          ? "Verify phone and email first"
                          : edit && edit.field !== "email"
                            ? "Finish or close the other change first"
                            : undefined
                      }
                      className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-100 disabled:bg-slate-50 disabled:text-slate-400"
                    >
                      Update
                    </button>
                  )}
                </div>
              </div>

              {showEmailPanel ? (
                <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50/50 p-4 sm:p-5">
                  {edit?.step === "input" ? (
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="new-email" className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                          New email address
                        </label>
                        <input
                          id="new-email"
                          type="email"
                          autoComplete="email"
                          disabled={busy}
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          placeholder="you@company.com"
                          className="mt-2 w-full max-w-md rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none ring-brand-500/20 transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 disabled:bg-slate-50"
                        />
                        <p className="mt-2 text-xs text-slate-500">We&apos;ll send a 6-digit code to this address.</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={busy || !draft.includes("@")}
                          onClick={() => void sendCode("email", draft.trim())}
                          className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Continue
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => closeEditor()}
                          className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-white/80"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-900">Enter verification code</p>
                        <span className="text-xs text-slate-500">Sent to {maskEmailHint(sentToValue)}</span>
                      </div>
                      <input
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        autoFocus
                        maxLength={6}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        className="w-full max-w-[13rem] rounded-lg border border-slate-200 bg-white py-3 text-center font-mono text-2xl font-semibold tracking-[0.35em] text-slate-900 shadow-sm outline-none ring-brand-500/20 focus:border-brand-500 focus:ring-4 sm:text-3xl sm:tracking-[0.4em]"
                        placeholder="••••••"
                        aria-label="6-digit code"
                      />
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                        <button
                          type="button"
                          disabled={busy || otp.length !== 6}
                          onClick={() => void confirmCode()}
                          className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Verify and update
                        </button>
                        <button
                          type="button"
                          disabled={busy || !sentToValue.includes("@")}
                          onClick={() => void sendCode("email", sentToValue)}
                          className="text-sm font-medium text-brand-600 hover:text-brand-700 disabled:opacity-40"
                        >
                          Resend code
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            setEdit({ field: "email", step: "input" });
                            setChallengeId(null);
                            setOtp("");
                            setDraft(sentToValue);
                          }}
                          className="text-sm font-medium text-slate-600 hover:text-slate-900"
                        >
                          Use a different email
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </li>
          </ul>
        </div>

        {/* Danger zone — same card, calmer than a separate loud box */}
        <div className="border-t border-slate-100 bg-slate-50/40 px-6 py-6 sm:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Danger zone</h3>
              <p className="mt-1 max-w-lg text-sm leading-relaxed text-slate-600">
                Delete this Hatsoffly workspace, all locations, preview links, and feedback. Your team will lose access.
                This cannot be undone.
              </p>
            </div>
            {!deleteOpen ? (
              <button
                type="button"
                onClick={() => {
                  setDeletePhrase("");
                  setDeleteOpen(true);
                }}
                className="h-fit shrink-0 rounded-lg border border-red-200 bg-white px-3.5 py-2 text-sm font-semibold text-red-700 shadow-sm hover:border-red-300 hover:bg-red-50"
              >
                Delete workspace…
              </button>
            ) : null}
          </div>

          {deleteOpen ? (
            <div className="mt-5 max-w-lg rounded-xl border border-red-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-700">
                To confirm, type{" "}
                <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-xs font-semibold text-slate-800">
                  DELETE MY ACCOUNT
                </kbd>{" "}
                below.
              </p>
              <input
                value={deletePhrase}
                onChange={(e) => setDeletePhrase(e.target.value)}
                className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2.5 font-mono text-sm outline-none ring-red-500/15 focus:border-red-400 focus:ring-4"
                placeholder="DELETE MY ACCOUNT"
                autoComplete="off"
                aria-label="Confirmation phrase"
              />
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={deleteBusy || deletePhrase !== "DELETE MY ACCOUNT"}
                  onClick={() => void submitDelete()}
                  className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {deleteBusy ? "Deleting…" : "Delete workspace permanently"}
                </button>
                <button
                  type="button"
                  disabled={deleteBusy}
                  onClick={() => setDeleteOpen(false)}
                  className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
