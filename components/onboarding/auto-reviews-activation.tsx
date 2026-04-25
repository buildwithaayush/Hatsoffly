"use client";

import Link from "next/link";
import {
  Fragment,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { supportMailto } from "@/lib/support";

const TOOLS = [
  { id: "quickbooks" as const, label: "QuickBooks", Icon: IconBank },
  { id: "jobber" as const, label: "Jobber", Icon: IconWrench },
  { id: "square" as const, label: "Square", Icon: IconSquare },
  { id: "housecall" as const, label: "Housecall Pro", Icon: IconHomeWork },
  { id: "other" as const, label: "Other", Icon: IconAdd },
];

const TRIGGERS = [
  {
    id: "payment",
    title: "Payment received (Recommended)",
    hint: "Right after payment",
  },
  {
    id: "job",
    title: "Job completed",
    hint: "When work is done",
  },
  {
    id: "appointment",
    title: "Appointment finished",
    hint: "After the visit",
  },
  { id: "other_trigger", title: "Other", hint: "" },
];

type ToolId = (typeof TOOLS)[number]["id"];
type TriggerId = (typeof TRIGGERS)[number]["id"];

type Props = {
  onDashboard: () => void;
};

type Prediction = { place_id: string; description: string };

function GoogleReviewLinkStep({
  googleReviewUrl,
  setGoogleReviewUrl,
  businessName,
  setBusinessName,
}: {
  googleReviewUrl: string;
  setGoogleReviewUrl: (value: string) => void;
  businessName: string;
  setBusinessName: (value: string) => void;
}) {
  const placesSearchId = useId();
  const manualUrlId = useId();
  const businessNameId = useId();
  const placesWrapRef = useRef<HTMLDivElement>(null);
  const clearSearchTimeoutRef = useRef<number | null>(null);

  const [placesQuery, setPlacesQuery] = useState("");
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [openPlaces, setOpenPlaces] = useState(false);
  const [placesError, setPlacesError] = useState<string | null>(null);
  const [placesEmptyHint, setPlacesEmptyHint] = useState(false);
  const [placesPick, setPlacesPick] = useState<{
    id: string;
    description: string;
  } | null>(null);
  const [resolvedName, setResolvedName] = useState<string | null>(null);
  const [resolvingDetails, setResolvingDetails] = useState(false);
  const [flashLinkedFields, setFlashLinkedFields] = useState(false);

  const placesSession = useMemo(() => {
    if (typeof window === "undefined") return "";
    let s = sessionStorage.getItem("places_session");
    if (!s) {
      s = crypto.randomUUID();
      sessionStorage.setItem("places_session", s);
    }
    return s;
  }, []);

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (!placesWrapRef.current?.contains(e.target as Node)) {
        setOpenPlaces(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  useEffect(() => {
    return () => {
      if (clearSearchTimeoutRef.current !== null) {
        window.clearTimeout(clearSearchTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (
      placesPick &&
      placesQuery.trim() === placesPick.description.trim()
    ) {
      return;
    }

    const t = setTimeout(async () => {
      if (!placesQuery.trim()) {
        setPredictions([]);
        setOpenPlaces(false);
        setPlacesError(null);
        setPlacesEmptyHint(false);
        return;
      }
      try {
        const res = await fetch(
          `/api/v1/places/autocomplete?q=${encodeURIComponent(placesQuery)}&session=${encodeURIComponent(placesSession)}`,
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
              "Business search failed. Check Places API and GOOGLE_MAPS_API_KEY.",
          );
          return;
        }
        const list = data.predictions ?? [];
        setPlacesError(null);
        setPredictions(list);
        setPlacesEmptyHint(
          placesQuery.trim().length >= 2 && list.length === 0,
        );
        setOpenPlaces(list.length > 0);
      } catch {
        setPredictions([]);
        setOpenPlaces(false);
        setPlacesEmptyHint(false);
        setPlacesError(
          "Could not reach business search. Check your connection.",
        );
      }
    }, 220);
    return () => clearTimeout(t);
  }, [placesQuery, placesPick, placesSession]);

  async function onPickPlace(p: Prediction) {
    setPlacesPick({ id: p.place_id, description: p.description });
    /** Keep selected label briefly, then clear so it doesn't feel like a glitch. */
    setPlacesQuery(p.description);
    setOpenPlaces(false);
    setPredictions([]);
    setPlacesError(null);
    setPlacesEmptyHint(false);
    setResolvingDetails(true);
    setResolvedName(null);
    try {
      const res = await fetch(
        `/api/v1/places/details?place_id=${encodeURIComponent(p.place_id)}&session=${encodeURIComponent(placesSession)}`,
      );
      const data = (await res.json()) as {
        google_review_url?: string | null;
        name?: string;
        error?: { message?: string };
      };
      if (!res.ok || data.error) {
        setPlacesError(
          data?.error?.message ?? "Could not load that place from Google Maps.",
        );
        setGoogleReviewUrl("");
        setBusinessName("");
        return;
      }
      const url = data.google_review_url?.trim();
      if (url) {
        setGoogleReviewUrl(url);
        const resolved = (data.name ?? p.description).trim();
        setResolvedName(resolved);
        setBusinessName(resolved);
        setFlashLinkedFields(true);
        window.setTimeout(() => setFlashLinkedFields(false), 1600);
        if (clearSearchTimeoutRef.current !== null) {
          window.clearTimeout(clearSearchTimeoutRef.current);
        }
        clearSearchTimeoutRef.current = window.setTimeout(() => {
          setPlacesQuery("");
          clearSearchTimeoutRef.current = null;
        }, 1400);
      } else {
        setPlacesError("No review link could be built for this place.");
        setGoogleReviewUrl("");
        setBusinessName("");
      }
    } catch {
      setPlacesError("Could not load place details.");
      setGoogleReviewUrl("");
      setBusinessName("");
    } finally {
      setResolvingDetails(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-slate-600">
        Your Google Business Profile listing is the same business shown on{" "}
        <strong className="font-semibold text-slate-800">Google Maps</strong>.
        Search for your business below and we&apos;ll insert the correct review
        link — or paste a link from your Profile if you already have one.
      </p>
      {googleReviewUrl.trim() ? (
        <p className="rounded-lg border border-brand-200 bg-brand-50/70 px-3 py-2 text-xs text-brand-900">
          We prefilled this from the business you selected at signup. You can keep it, paste a different link, or
          search Google Maps again.
        </p>
      ) : null}

      <div ref={placesWrapRef} className="relative z-20 space-y-2">
        <label
          htmlFor={placesSearchId}
          className="block text-sm font-semibold text-slate-900"
        >
          Find your business (optional)
        </label>
        <input
          id={placesSearchId}
          type="text"
          autoComplete="off"
          placeholder="Search Google Maps to auto-fill link"
          value={placesQuery}
          disabled={resolvingDetails}
          onChange={(e) => {
            const v = e.target.value;
            if (clearSearchTimeoutRef.current !== null) {
              window.clearTimeout(clearSearchTimeoutRef.current);
              clearSearchTimeoutRef.current = null;
            }
            setPlacesQuery(v);
            if (
              placesPick &&
              v.trim() !== placesPick.description.trim()
            ) {
              setPlacesPick(null);
              setResolvedName(null);
            }
          }}
          onFocus={() => {
            if (predictions.length > 0) setOpenPlaces(true);
          }}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-sans text-base text-slate-900 outline-none ring-brand-500 placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 disabled:opacity-60"
        />
        {resolvingDetails ? (
          <p className="text-xs text-slate-500">Fetching review link…</p>
        ) : null}
        {placesError ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
            {placesError}
          </p>
        ) : null}
        {placesEmptyHint && !placesError ? (
          <p className="text-xs text-slate-500">
            No matches — keep typing business name + city, or paste your review link directly below.
          </p>
        ) : null}
        {openPlaces && predictions.length > 0 ? (
          <ul className="absolute left-0 right-0 top-full z-30 mt-1 max-h-56 overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
            {predictions.map((p) => (
              <li key={p.place_id}>
                <button
                  type="button"
                  className="w-full px-4 py-3 text-left text-sm text-slate-900 hover:bg-slate-50"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => onPickPlace(p)}
                >
                  {p.description}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {resolvedName && googleReviewUrl.trim() ? (
          <div className="rounded-xl border border-brand-200 bg-brand-50/60 px-4 py-3 text-sm text-slate-800">
            <span className="font-semibold text-brand-900">
              Review link ready
            </span>
            <span className="text-slate-600">
              {" "}
              — {resolvedName}. You can search again or edit the link manually below.
            </span>
          </div>
        ) : null}
      </div>

      <div>
        <label
          htmlFor={manualUrlId}
          className="mb-2 block text-sm font-semibold text-slate-900"
        >
          Review link URL
        </label>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500">
            <IconLink className="h-5 w-5" />
          </div>
          <input
            id={manualUrlId}
            type="url"
            inputMode="url"
            autoComplete="url"
            placeholder="https://g.page/r/… or Maps short link"
            value={googleReviewUrl}
            onChange={(e) => setGoogleReviewUrl(e.target.value)}
            className={`w-full rounded-xl border bg-white py-4 pl-12 pr-4 font-sans text-base text-slate-900 outline-none ring-brand-500 placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 ${
              flashLinkedFields
                ? "border-brand-400 ring-2 ring-brand-200 transition-all"
                : "border-slate-200"
            }`}
          />
        </div>
        <p className="mt-2 text-xs leading-relaxed text-slate-500">
          Paste from{" "}
          <strong className="font-medium text-slate-700">
            Google Business Profile
          </strong>{" "}
          (Ask for reviews). You can also search above to auto-fill this field.
        </p>
      </div>

      <div>
        <label htmlFor={businessNameId} className="mb-2 block text-sm font-semibold text-slate-900">
          Business name (from selected link)
        </label>
        <input
          id={businessNameId}
          type="text"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          placeholder="Will appear after selecting a business link"
          className={`w-full rounded-xl border bg-white px-4 py-3 font-sans text-base text-slate-900 outline-none ring-brand-500 focus:border-brand-500 focus:ring-2 ${
            flashLinkedFields
              ? "border-brand-400 ring-2 ring-brand-200 transition-all"
              : "border-slate-200"
          }`}
        />
      </div>
    </div>
  );
}

export function AutoReviewsActivation({ onDashboard }: Props) {
  const otherCrmFieldId = useId();
  const otherTriggerFieldId = useId();
  const [selectedTool, setSelectedTool] = useState<ToolId | null>(null);
  /** When tool is "other", user must enter their CRM / job tool name here. */
  const [otherCrmName, setOtherCrmName] = useState("");
  const [trigger, setTrigger] = useState<TriggerId | null>(null);
  /** When trigger is "other_trigger", describe when review requests should send. */
  const [otherTriggerDescription, setOtherTriggerDescription] = useState("");
  const [googleReviewUrl, setGoogleReviewUrl] = useState("");
  /** Step 4: user must pick one path before continuing. */
  const [step4Path, setStep4Path] = useState<"self" | "concierge" | null>(null);
  const [conciergeSubmitted, setConciergeSubmitted] = useState(false);
  const [persistError, setPersistError] = useState<string | null>(null);
  const [isPersisting, setIsPersisting] = useState(false);
  const [prefillAttempted, setPrefillAttempted] = useState(false);
  const [googleBusinessName, setGoogleBusinessName] = useState("");

  useEffect(() => {
    if (prefillAttempted) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/v1/auth/me", { cache: "no-store" });
        const data = (await res.json().catch(() => ({}))) as {
          primary_location?: { name?: string; google_review_url?: string | null };
        };
        const prefill = data?.primary_location?.google_review_url?.trim();
        const prefillName = data?.primary_location?.name?.trim() ?? "";
        if (!cancelled && prefill && !googleReviewUrl.trim()) {
          setGoogleReviewUrl(prefill);
        }
        if (!cancelled && prefillName && !googleBusinessName.trim()) {
          setGoogleBusinessName(prefillName);
        }
      } catch {
        /* ignore prefill failures; user can still paste/search manually */
      } finally {
        if (!cancelled) setPrefillAttempted(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [prefillAttempted, googleReviewUrl, googleBusinessName]);

  const step1Complete = useMemo(() => {
    if (selectedTool === null) return false;
    if (selectedTool === "other") {
      return otherCrmName.trim().length >= 2;
    }
    return true;
  }, [selectedTool, otherCrmName]);

  const step2Complete = useMemo(() => {
    if (trigger === null) return false;
    if (trigger === "other_trigger") {
      return otherTriggerDescription.trim().length >= 2;
    }
    return true;
  }, [trigger, otherTriggerDescription]);

  const googleLooksValid = useMemo(() => {
    const t = googleReviewUrl.trim();
    if (t.length < 8) return false;
    try {
      const u = new URL(t.startsWith("http") ? t : `https://${t}`);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  }, [googleReviewUrl]);

  const stepStatuses = useMemo(() => {
    const s1 = step1Complete;
    const s2 = step2Complete;
    const s3 = googleLooksValid;
    const s4 = step4Path !== null;
    const current =
      !s1 ? 1 : !s2 ? 2 : !s3 ? 3 : 4;
    return {
      current,
      circle: (n: 1 | 2 | 3 | 4): "done" | "current" | "todo" => {
        const done =
          (n === 1 && s1) ||
          (n === 2 && s2) ||
          (n === 3 && s3) ||
          (n === 4 && s4);
        if (done) return "done";
        if (n === current) return "current";
        return "todo";
      },
      lineAfter: (n: 1 | 2 | 3) =>
        (n === 1 && s1) || (n === 2 && s2) || (n === 3 && s3),
    };
  }, [step1Complete, step2Complete, googleLooksValid, step4Path]);

  const persistActivation = useCallback(async (): Promise<boolean> => {
    if (!selectedTool || !trigger || !step4Path || !googleLooksValid) {
      setPersistError("Complete every step before continuing.");
      return false;
    }
    setPersistError(null);
    setIsPersisting(true);
    try {
      const res = await fetch("/api/v1/activation/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool: selectedTool,
          tool_other:
            selectedTool === "other" ? otherCrmName.trim() : null,
          trigger,
          trigger_other:
            trigger === "other_trigger"
              ? otherTriggerDescription.trim()
              : null,
          google_review_url: googleReviewUrl.trim(),
          setup_path: step4Path === "self" ? "self_serve" : "concierge",
        }),
      });
      const raw = await res.text();
      let data: { error?: { message?: string } } = {};
      try {
        data = JSON.parse(raw) as typeof data;
      } catch {
        /* ignore */
      }
      if (!res.ok) {
        setPersistError(
          data?.error?.message ?? "Could not save your setup. Try again.",
        );
        return false;
      }
      return true;
    } catch {
      setPersistError("Network error. Check your connection and try again.");
      return false;
    } finally {
      setIsPersisting(false);
    }
  }, [
    selectedTool,
    otherCrmName,
    trigger,
    otherTriggerDescription,
    googleReviewUrl,
    googleLooksValid,
    step4Path,
  ]);

  if (conciergeSubmitted) {
    return (
      <div
        className="fixed inset-0 z-[100] flex flex-col overflow-y-auto bg-[#f8fafc]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="activation-success-title"
      >
        <ActivationHeader />
        <main className="flex flex-1 flex-col items-center px-6 py-12">
          <div className="w-full max-w-[640px] rounded-xl border border-slate-100 bg-white p-12 text-center shadow-lg ring-1 ring-slate-200/80">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-brand-100 text-brand-600">
              <IconVerified className="h-10 w-10" />
            </div>
            <h2
              id="activation-success-title"
              className="text-balance font-sans text-2xl font-semibold tracking-tight text-slate-900 sm:text-[32px] sm:leading-tight"
            >
              We&apos;ve got it from here
            </h2>
            <p className="mx-auto mt-4 max-w-sm text-lg leading-relaxed text-slate-600">
              Our team will reach out within 2 hours to confirm your integration
              and finalize the setup.
            </p>
            <button
              type="button"
              onClick={onDashboard}
              className="mt-8 inline-flex min-h-[48px] items-center justify-center rounded-lg bg-brand-600 px-8 py-4 text-base font-semibold text-white shadow-md transition hover:bg-brand-700 active:scale-[0.98]"
            >
              Go to Dashboard
            </button>
          </div>
        </main>
        <ActivationFooter />
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col overflow-y-auto bg-[#f8fafc]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="activation-title"
    >
      <div
        className="pointer-events-none fixed left-[-10%] top-[20%] -z-10 h-[400px] w-[400px] rounded-full bg-brand-500/[0.07] blur-[100px]"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed bottom-[10%] right-[-10%] -z-10 h-[500px] w-[500px] rounded-full bg-orange-400/[0.06] blur-[120px]"
        aria-hidden
      />

      <ActivationHeader />

      <main className="flex flex-1 flex-col items-center px-6 py-12">
        <div className="mb-10 w-full max-w-[640px] text-center">
          <h1
            id="activation-title"
            className="mb-3 text-balance font-sans text-3xl font-bold tracking-tight text-slate-900 sm:text-[40px] sm:leading-[1.2] sm:tracking-[-0.02em]"
          >
            You&apos;re all set. Let&apos;s turn on Auto Reviews. Just one more
            step.
          </h1>
          <p className="font-sans text-lg leading-relaxed text-slate-600">
            Choose your tool and we&apos;ll help connect it.
          </p>
        </div>

        <div className="w-full max-w-[640px] space-y-8">
          <Stepper statuses={stepStatuses} />

          <div className="rounded-xl border border-slate-100 bg-white p-8 shadow-[0_4px_10px_rgba(0,0,0,0.04)]">
            <section className="space-y-6">
              <div>
                <h3 className="font-sans text-xl font-semibold leading-snug text-slate-900 sm:text-2xl">
                  Step 1: Pick your tool
                </h3>
                <p className="-mt-1 text-sm text-slate-600">
                  Where you track jobs or payments
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                {TOOLS.map(({ id, label, Icon }) => {
                  const active = selectedTool === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        setSelectedTool(id);
                        if (id !== "other") setOtherCrmName("");
                      }}
                      className={`group flex flex-col items-center justify-center rounded-xl border p-6 transition-all ${
                        active
                          ? "border-brand-600 bg-brand-50 ring-2 ring-brand-600"
                          : "border-slate-200 hover:border-brand-500 hover:bg-brand-50/40"
                      }`}
                    >
                      <Icon
                        className={`mb-3 h-10 w-10 transition-colors ${
                          active
                            ? "text-brand-600"
                            : "text-slate-500 group-hover:text-brand-600"
                        }`}
                      />
                      <span
                        className={`text-center text-base font-semibold ${
                          active ? "text-slate-900" : "text-slate-600"
                        }`}
                      >
                        {label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {selectedTool === "other" ? (
                <div className="rounded-xl border border-brand-200 bg-brand-50/40 p-5 ring-1 ring-brand-600/15">
                  <label
                    htmlFor={otherCrmFieldId}
                    className="block text-sm font-semibold text-slate-900"
                  >
                    CRM or tool name
                  </label>
                  <p className="mt-1 text-xs text-slate-600">
                    Tell us what you use to track jobs, customers, or payments so
                    we can plan your connection.
                  </p>
                  <input
                    id={otherCrmFieldId}
                    type="text"
                    name="other_crm"
                    autoComplete="organization"
                    placeholder="e.g. ServiceTitan, HubSpot, Buildertrend…"
                    value={otherCrmName}
                    onChange={(e) => setOtherCrmName(e.target.value)}
                    className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-sans text-base text-slate-900 outline-none ring-brand-500 placeholder:text-slate-400 focus:border-brand-500 focus:ring-2"
                  />
                  {otherCrmName.trim().length > 0 &&
                  otherCrmName.trim().length < 2 ? (
                    <p className="mt-2 text-xs text-amber-800">
                      Enter at least 2 characters.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </section>

            <hr className="my-10 border-slate-200" />

            <section className="space-y-6">
              <h3 className="font-sans text-xl font-semibold leading-snug text-slate-900 sm:text-2xl">
                Step 2: Pick your trigger
              </h3>
              <div className="space-y-3">
                {TRIGGERS.map((t) => (
                  <label
                    key={t.id}
                    className={`flex cursor-pointer items-center rounded-xl border p-4 transition-all hover:bg-slate-50 ${
                      trigger === t.id
                        ? "border-brand-600 bg-brand-50/50 ring-1 ring-brand-600"
                        : "border-slate-200"
                    }`}
                  >
                    <input
                      type="radio"
                      name="trigger"
                      className="h-5 w-5 border-slate-300 text-brand-600 focus:ring-brand-500"
                      checked={trigger === t.id}
                      onChange={() => {
                        setTrigger(t.id);
                        if (t.id !== "other_trigger") {
                          setOtherTriggerDescription("");
                        }
                      }}
                    />
                    <div className="ml-4">
                      <span className="block font-sans text-base text-slate-900">
                        {t.title}
                      </span>
                      {t.hint ? (
                        <span className="text-xs text-slate-500">{t.hint}</span>
                      ) : null}
                    </div>
                  </label>
                ))}
              </div>

              {trigger === "other_trigger" ? (
                <div className="rounded-xl border border-brand-200 bg-brand-50/40 p-5 ring-1 ring-brand-600/15">
                  <label
                    htmlFor={otherTriggerFieldId}
                    className="block text-sm font-semibold text-slate-900"
                  >
                    Describe your trigger
                  </label>
                  <p className="mt-1 text-xs text-slate-600">
                    When should we send review requests after something happens in
                    your workflow?
                  </p>
                  <textarea
                    id={otherTriggerFieldId}
                    name="other_trigger"
                    rows={3}
                    placeholder="e.g. When an invoice is marked paid in ServiceTitan…"
                    value={otherTriggerDescription}
                    onChange={(e) =>
                      setOtherTriggerDescription(e.target.value)
                    }
                    className="mt-3 w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 font-sans text-base text-slate-900 outline-none ring-brand-500 placeholder:text-slate-400 focus:border-brand-500 focus:ring-2"
                  />
                  {otherTriggerDescription.trim().length > 0 &&
                  otherTriggerDescription.trim().length < 2 ? (
                    <p className="mt-2 text-xs text-amber-800">
                      Enter at least 2 characters.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </section>

            <hr className="my-10 border-slate-200" />

            <section className="space-y-6">
              <div>
                <h3 className="font-sans text-xl font-semibold leading-snug text-slate-900 sm:text-2xl">
                  Step 3: Provide your Google Business Review link
                </h3>
                <p className="-mt-1 text-sm text-slate-600">
                  Same technology as signup: Google Places search, or paste your
                  own link.
                </p>
              </div>
              <GoogleReviewLinkStep
                googleReviewUrl={googleReviewUrl}
                setGoogleReviewUrl={setGoogleReviewUrl}
                businessName={googleBusinessName}
                setBusinessName={setGoogleBusinessName}
              />
            </section>

            <hr className="my-10 border-slate-200" />

            <section className="space-y-6">
              <div>
                <h3 className="font-sans text-xl font-semibold leading-snug text-slate-900 sm:text-2xl">
                  Step 4: Turn on Auto Reviews
                </h3>
                <p className="-mt-1 text-sm text-slate-600">
                  Choose how you want to finish setup — then continue.
                </p>
              </div>

              <div className="space-y-3" role="radiogroup" aria-label="Setup path">
                <label
                  className={`flex cursor-pointer gap-4 rounded-xl border p-5 transition-all hover:bg-slate-50 ${
                    step4Path === "self"
                      ? "border-brand-600 bg-brand-50/70 ring-2 ring-brand-600"
                      : "border-slate-200"
                  }`}
                >
                  <input
                    type="radio"
                    name="step4_path"
                    value="self"
                    className="mt-1 h-5 w-5 shrink-0 border-slate-300 text-brand-600 focus:ring-brand-500"
                    checked={step4Path === "self"}
                    onChange={() => setStep4Path("self")}
                  />
                  <div className="min-w-0 flex-1">
                    <span className="mb-2 inline-block rounded-full bg-brand-600 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                      Fastest
                    </span>
                    <span className="block font-sans text-base font-semibold text-slate-900">
                      Turn on Auto Reviews (self-serve)
                    </span>
                    <p className="mt-1 text-sm leading-relaxed text-slate-600">
                      We&apos;ll guide you in the product. Usually takes a few
                      minutes. We&apos;ll connect your workflow and notify you
                      when it&apos;s live.
                    </p>
                  </div>
                </label>

                <label
                  className={`flex cursor-pointer gap-4 rounded-xl border p-5 transition-all hover:bg-slate-50 ${
                    step4Path === "concierge"
                      ? "border-brand-600 bg-brand-50/70 ring-2 ring-brand-600"
                      : "border-slate-200"
                  }`}
                >
                  <input
                    type="radio"
                    name="step4_path"
                    value="concierge"
                    className="mt-1 h-5 w-5 shrink-0 border-slate-300 text-brand-600 focus:ring-brand-500"
                    checked={step4Path === "concierge"}
                    onChange={() => setStep4Path("concierge")}
                  />
                  <div className="min-w-0 flex-1">
                    <span className="block font-sans text-base font-semibold text-slate-900">
                      Have Hatsoffly set it up
                    </span>
                    <p className="mt-1 text-sm leading-relaxed text-slate-600">
                      Our team handles the integration for you. We&apos;ll reach
                      out to confirm details.
                    </p>
                  </div>
                </label>
              </div>

              {persistError ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
                  {persistError}
                </p>
              ) : null}

              <button
                type="button"
                disabled={step4Path === null || isPersisting}
                onClick={async () => {
                  if (step4Path === null) return;
                  const ok = await persistActivation();
                  if (!ok) return;
                  if (step4Path === "self") onDashboard();
                  else setConciergeSubmitted(true);
                }}
                className="flex w-full min-h-[52px] items-center justify-center rounded-xl bg-brand-600 px-6 py-4 text-base font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 active:scale-[0.99]"
              >
                {isPersisting
                  ? "Saving…"
                  : step4Path === null
                    ? "Select an option above to continue"
                    : step4Path === "self"
                      ? "Continue to dashboard"
                      : "Continue with Hatsoffly setup"}
              </button>
            </section>

            <p className="mt-6 text-center text-xs text-slate-500">
              We only use customer name and phone. You can change this anytime.
            </p>
          </div>

          <div className="mb-8 text-center">
            <button
              type="button"
              disabled={isPersisting}
              onClick={async () => {
                const ok = await persistActivation();
                if (ok) onDashboard();
              }}
              className="inline-flex items-center justify-center gap-1 text-sm font-medium text-brand-700 transition hover:underline disabled:opacity-50"
            >
              Send your first request manually →
            </button>
            <p className="mx-auto mt-2 max-w-md text-xs text-slate-500">
              Saves your setup (same as Continue) and opens your dashboard — finish
              Steps 1–4 first.
            </p>
          </div>

          <div className="mb-8 rounded-xl bg-slate-100 p-10">
            <h4 className="mb-6 text-center text-xs font-semibold uppercase tracking-[0.15em] text-slate-600">
              Auto Reviews start after this step
            </h4>
            <div className="grid gap-y-6 gap-x-8 md:grid-cols-2">
              {[
                "We connect your workflow",
                "Requests go out automatically",
                "Happy customers go to Google",
                "Unhappy customers go private",
              ].map((text) => (
                <div key={text} className="flex items-start gap-4">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white">
                    <IconCheck className="h-3.5 w-3.5" />
                  </div>
                  <p className="text-sm text-slate-800">{text}</p>
                </div>
              ))}
            </div>
            <p className="mt-8 border-t border-slate-200/80 pt-4 text-center text-xs text-slate-500">
              Most setups are completed the same day.
            </p>
          </div>

          <p className="mx-auto mb-10 max-w-lg text-center text-xs leading-relaxed text-slate-500">
            <span className="font-semibold text-slate-700">
              Safe &amp; Secure:
            </span>{" "}
            We never share your customer data. It&apos;s only used to send
            review requests based on the trigger you set up.
          </p>
        </div>
      </main>

      <ActivationFooter />
    </div>
  );
}

function ActivationHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-100 bg-white shadow-sm">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4">
        <span className="font-sans text-xl font-bold tracking-tight text-brand-700">
          Hatsoffly
        </span>
        <div className="flex items-center gap-2 sm:gap-4">
          <a
            href={supportMailto("Hatsoffly — help with activation")}
            className="rounded-full p-2 text-slate-500 transition hover:bg-slate-50 hover:text-brand-600 active:scale-95"
            aria-label="Help"
          >
            <IconHelp className="h-6 w-6" />
          </a>
          <Link
            href="/dashboard"
            className="rounded-full p-2 text-slate-500 transition hover:bg-slate-50 hover:text-brand-600 active:scale-95"
            aria-label="Account"
          >
            <IconAccount className="h-6 w-6" />
          </Link>
        </div>
      </div>
    </header>
  );
}

function ActivationFooter() {
  return (
    <footer className="mt-auto border-t border-slate-100 bg-slate-50 py-12">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-4 px-8 md:flex-row">
        <p className="font-sans text-xs text-slate-500">
          © 2026 Hatsoffly. All rights reserved.
        </p>
        <div className="flex flex-wrap justify-center gap-6">
          <Link
            href="/privacy"
            className="font-sans text-xs text-slate-400 underline underline-offset-4 transition hover:text-brand-600"
          >
            Privacy Policy
          </Link>
          <Link
            href="/terms"
            className="font-sans text-xs text-slate-400 underline underline-offset-4 transition hover:text-brand-600"
          >
            Terms of Service
          </Link>
          <a
            href={supportMailto()}
            className="font-sans text-xs text-slate-400 underline underline-offset-4 transition hover:text-brand-600"
          >
            Contact Support
          </a>
        </div>
      </div>
    </footer>
  );
}

function Stepper({
  statuses,
}: {
  statuses: {
    circle: (n: 1 | 2 | 3 | 4) => "done" | "current" | "todo";
    lineAfter: (n: 1 | 2 | 3) => boolean;
  };
}) {
  const nums: [1, 2, 3, 4] = [1, 2, 3, 4];
  return (
    <div className="mb-8 flex flex-wrap items-center justify-center gap-y-2">
      {nums.map((n, idx) => (
        <Fragment key={n}>
          <StepCircle n={n} status={statuses.circle(n)} />
          {idx < 3 ? (
            <div
              className={`mx-1 h-[2px] w-6 sm:w-8 ${
                statuses.lineAfter(n as 1 | 2 | 3)
                  ? "bg-brand-600"
                  : "bg-slate-200"
              }`}
              aria-hidden
            />
          ) : null}
        </Fragment>
      ))}
    </div>
  );
}

function StepCircle({
  n,
  status,
}: {
  n: number;
  status: "done" | "current" | "todo";
}) {
  if (status === "done") {
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
        {n}
      </div>
    );
  }
  if (status === "current") {
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-brand-600 bg-brand-50 text-sm font-bold text-brand-800 ring-2 ring-brand-600/30">
        {n}
      </div>
    );
  }
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-slate-200 text-sm font-bold text-slate-400">
      {n}
    </div>
  );
}

function IconBank(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={props.className} aria-hidden>
      <path
        d="M3 21h18M5 21V10.5M19 21V10.5M12 21V10.5M3 10.5L12 3l9 7.5M7.5 10.5h9v3h-9v-3z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconWrench(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={props.className} aria-hidden>
      <path
        d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.36 6.36a2 2 0 01-2.83-2.83l6.36-6.36a6 6 0 017.94-7.94z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconSquare(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={props.className} aria-hidden>
      <rect
        x="4"
        y="4"
        width="16"
        height="16"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.75"
      />
    </svg>
  );
}

function IconHomeWork(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={props.className} aria-hidden>
      <path
        d="M3 21h9M9 21V12l9-6v15M14 21v-6h5v6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconAdd(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={props.className} aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M12 8v8M8 12h8"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconLink(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={props.className} aria-hidden>
      <path
        d="M10 13a5 5 0 007.07 0l1.41-1.41a5 5 0 000-7.07l-1.06-1.06a5 5 0 00-7.07 0M14 11a5 5 0 00-7.07 0L5.52 12.41a5 5 0 000 7.07l1.06 1.06a5 5 0 007.07 0"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconCheck(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={props.className} aria-hidden>
      <path
        d="M5 13l4 4L19 7"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconVerified(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={props.className} aria-hidden>
      <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-1 17l-5-5 1.41-1.41L11 15.17l7.59-7.59L20 9l-9 9z" />
    </svg>
  );
}

function IconHelp(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={props.className} aria-hidden>
      <path
        d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconAccount(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={props.className} aria-hidden>
      <path
        d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
