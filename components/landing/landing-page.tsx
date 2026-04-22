"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { Reveal } from "@/components/landing/reveal";
import { supportEmail, supportMailto } from "@/lib/support";

const ink = "text-[#155E63]";
const inkMuted = "text-[#155E63]/78";
const coralBtn = "bg-[#F28E63] hover:bg-[#eb7a4e]";
const tealBtn = "bg-[#2A8C89] hover:bg-[#247a77]";
const cream = "bg-[#F7F1EB]";
const coralText = "text-[#F28E63]";
const HOVER_CORAL = "transition hover:text-[#F28E63]";

const features = [
  {
    title: "Works with your current workflow",
    copy: "Hatsoffly plugs into the tools you already use — no new logins for your crew on day one.",
  },
  {
    title: "Automatic SMS review requests",
    copy: "Fire after payment, job complete, or any milestone your CRM or FSM emits.",
  },
  {
    title: "Private feedback first",
    copy: "Intercept unhappy experiences before they become one-star headlines.",
  },
  {
    title: "Smart follow-ups",
    copy: "Nudge customers who didn’t tap the first time — tuned cadence, carrier-safe copy.",
  },
];

const steps = [
  "Connect triggers you already track — job closed, invoice paid, appointment done.",
  "Hatsoffly texts customers at the right moment with your brand voice.",
  "Happy flows → Google. Rough flows → private feedback → your team fixes it.",
];

const useCases = [
  "Home services",
  "Healthcare",
  "Solo operators",
  "Local retail",
  "Professional services",
  "Multi-location",
];

const floatingCards = [
  { score: "4.6", sub: "182 reviews", bg: "bg-[#C8B7F2]", rotate: "-rotate-6", delay: 0 },
  { score: "4.9", sub: "612 reviews", bg: "bg-[#F4AA06]", rotate: "rotate-2", delay: 0.08 },
  { score: "4.8", sub: "3.9k ratings", bg: "bg-[#A8D5B2]", rotate: "-rotate-3", delay: 0.16 },
];

function HeroAurora() {
  const reduce = useReducedMotion();
  if (reduce) {
    return (
      <>
        <div className="hs-aurora-blob pointer-events-none absolute -left-24 top-0 h-80 w-80 rounded-full bg-[#2A8C89]/14" />
        <div className="hs-aurora-blob pointer-events-none absolute -right-32 top-24 h-96 w-96 rounded-full bg-[#F28E63]/14" />
      </>
    );
  }
  return (
    <>
      <motion.div
        className="hs-aurora-blob pointer-events-none absolute -left-24 top-0 h-80 w-80 rounded-full bg-[#2A8C89]/16"
        animate={{ x: [0, 24, 0], y: [0, -18, 0], scale: [1, 1.06, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="hs-aurora-blob pointer-events-none absolute -right-32 top-24 h-96 w-96 rounded-full bg-[#F28E63]/15"
        animate={{ x: [0, -20, 0], y: [0, 22, 0], scale: [1, 1.05, 1] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="hs-aurora-blob pointer-events-none absolute bottom-20 left-1/3 h-64 w-64 rounded-full bg-emerald-400/6"
        animate={{ opacity: [0.35, 0.55, 0.35] }}
        transition={{ duration: 10, repeat: Infinity }}
      />
    </>
  );
}

export function LandingPage() {
  const reduce = useReducedMotion();

  return (
    <div className={`min-h-screen ${cream} ${ink}`}>
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-black/[0.06] bg-[#F7F1EB]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-[4.25rem] w-full max-w-7xl items-center justify-between px-5 lg:px-10">
          <Link href="/" className="flex items-center gap-3" aria-label="Hatsoffly home">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#2A8C89] text-lg font-black text-white shadow-lg shadow-[#155E63]/15">
              H
            </span>
            <span className="text-xl font-black tracking-tight">Hatsoffly</span>
          </Link>
          <nav className="hidden items-center gap-9 text-[15px] font-semibold md:flex">
            <a href="#features" className={HOVER_CORAL}>
              Features
            </a>
            <a href="#how-it-works" className={HOVER_CORAL}>
              How it works
            </a>
            <a href="#industries" className={HOVER_CORAL}>
              Who it&apos;s for
            </a>
            <a href="#pricing" className={HOVER_CORAL}>
              Pricing
            </a>
            <a href="#cta" className={HOVER_CORAL}>
              Get started
            </a>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="hidden min-h-[44px] rounded-full border border-[#155E63]/18 px-5 py-2.5 text-sm font-semibold md:inline-flex md:items-center"
            >
              Log in
            </Link>
            <Link
              href="/onboarding"
              className={`inline-flex min-h-[44px] items-center justify-center rounded-full px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#F28E63]/25 transition hover:-translate-y-0.5 ${coralBtn}`}
            >
              Start free
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Warm hero */}
        <section className="relative overflow-hidden bg-[#F7F1EB] pb-24 pt-16 lg:pb-32 lg:pt-20">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_100%_at_0%_0%,rgba(42,140,137,0.08),transparent_55%),radial-gradient(80%_90%_at_100%_0%,rgba(242,142,99,0.12),transparent_60%)]"
            aria-hidden
          />
          <HeroAurora />

          <div className="relative mx-auto grid max-w-7xl gap-14 px-5 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16 lg:px-10">
            <div>
              {reduce ? (
                <>
                  <p className="inline-flex rounded-full border border-[#155E63]/15 bg-white/70 px-4 py-2 text-sm font-semibold text-[#155E63] shadow-sm">
                    Simple review growth for small businesses
                  </p>
                  <h1 className="mt-8 max-w-xl text-4xl font-black leading-[1.05] tracking-tight text-[#155E63] md:text-6xl lg:text-[3.35rem]">
                    Get more Google reviews —{" "}
                    <span className="bg-gradient-to-r from-[#155E63] via-[#2A8C89] to-[#F28E63] bg-clip-text text-transparent">
                      automatically.
                    </span>
                  </h1>
                </>
              ) : (
                <motion.div
                  initial="hidden"
                  animate="visible"
                  variants={{
                    visible: { transition: { staggerChildren: 0.09 } },
                    hidden: {},
                  }}
                >
                  <motion.p
                    variants={{
                      hidden: { opacity: 0, y: 16 },
                      visible: { opacity: 1, y: 0 },
                    }}
                    transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                    className="inline-flex rounded-full border border-[#155E63]/15 bg-white/70 px-4 py-2 text-sm font-semibold text-[#155E63] shadow-sm"
                  >
                    Simple review growth for small businesses
                  </motion.p>
                  <motion.h1
                    variants={{
                      hidden: { opacity: 0, y: 22 },
                      visible: { opacity: 1, y: 0 },
                    }}
                    transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
                    className="mt-8 max-w-xl text-4xl font-black leading-[1.05] tracking-tight text-[#155E63] md:text-6xl lg:text-[3.35rem]"
                  >
                    Get more Google reviews —{" "}
                    <span className="bg-gradient-to-r from-[#155E63] via-[#2A8C89] to-[#F28E63] bg-clip-text text-transparent">
                      automatically.
                    </span>
                  </motion.h1>
                </motion.div>
              )}

              <p className="mt-7 max-w-lg text-lg leading-relaxed text-[#155E63]/78 md:text-xl">
                Automatically ask customers for reviews at the right moment, without extra work for
                your team.
              </p>

              <div className="mt-10 flex flex-wrap gap-4">
                <Link
                  href="/onboarding"
                  className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-[#F28E63] px-9 py-3.5 text-[15px] font-bold text-[#0a1210] shadow-xl shadow-emerald-500/10 transition hover:-translate-y-0.5 hover:brightness-105"
                >
                  Start getting reviews
                </Link>
                <a
                  href="#how-it-works"
                  className="inline-flex min-h-[52px] items-center justify-center rounded-full border border-[#155E63]/20 bg-white px-9 py-3.5 text-[15px] font-bold text-[#155E63] shadow-sm transition hover:bg-[#fffaf6]"
                >
                  See how it works
                </a>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-2 text-[12px] font-semibold text-[#155E63]/70">
                <span className="mr-1 uppercase tracking-[0.16em] text-[#155E63]/45">Works with</span>
                {["ServiceTitan", "Housecall Pro", "Jobber", "Google Business"].map((tool) => (
                  <span
                    key={tool}
                    className="rounded-full border border-[#155E63]/12 bg-white/85 px-3 py-1.5 shadow-sm"
                  >
                    {tool}
                  </span>
                ))}
              </div>

              <div className="mt-12 grid max-w-lg grid-cols-3 gap-3">
                {[
                  ["2–3×", "consistent asks"],
                  ["1 stack", "SMS + private path"],
                  ["Minutes", "to first live text"],
                ].map(([a, b], i) => (
                  <motion.div
                    key={a}
                    initial={reduce ? undefined : { opacity: 0, y: 14 }}
                    whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.15 + i * 0.06, duration: 0.5 }}
                    className="rounded-2xl border border-[#155E63]/12 bg-white p-4 shadow-sm"
                  >
                    <div className={`text-xl font-black ${coralText}`}>{a}</div>
                    <div className="mt-1 text-[13px] font-medium leading-snug text-[#155E63]/75">
                      {b}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Product canvas */}
            <div className="relative lg:min-h-[540px]">
              <div className="pointer-events-none absolute -right-4 top-8 hidden gap-3 lg:flex">
                {floatingCards.map((c, i) => (
                  <motion.div
                    key={c.bg}
                    initial={reduce ? undefined : { opacity: 0, y: 24 }}
                    animate={
                      reduce ? undefined : { opacity: 1, y: [0, -8, 0] }
                    }
                    transition={{
                      opacity: { delay: c.delay, duration: 0.55 },
                      y: { duration: 5.5 + i * 0.4, repeat: Infinity, ease: "easeInOut" },
                    }}
                    className={`flex w-28 flex-col rounded-2xl ${c.bg} px-3 py-3 shadow-2xl ring-1 ring-black/10 ${c.rotate}`}
                  >
                    <span className="text-lg font-black text-[#155E63]">{c.score}</span>
                    <span className="text-[11px] font-bold uppercase tracking-wide text-[#155E63]/70">
                      {c.sub}
                    </span>
                  </motion.div>
                ))}
              </div>

              <motion.div
                initial={reduce ? undefined : { opacity: 0, scale: 0.98 }}
                whileInView={reduce ? undefined : { opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                className="relative overflow-hidden rounded-[2rem] border border-[#155E63]/10 bg-white shadow-2xl shadow-[#155E63]/12"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-[#F7F1EB]/70 to-transparent" />
                <div className="relative space-y-6 p-7 lg:p-9">
                  <div className="flex items-center justify-between rounded-2xl border border-[#155E63]/10 bg-[#F7F1EB]/65 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#F28E63]" />
                      <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#155E63]/45">
                      Hatsoffly flow
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#F28E63]">
                      Live flow
                    </span>
                    <h3 className="mt-3 text-2xl font-black leading-tight text-[#155E63] md:text-3xl">
                      From trigger → text → outcome.
                    </h3>
                    <p className="mt-3 text-[15px] leading-relaxed text-[#155E63]/75">
                      Every send is logged, every path measurable — no surprise one-stars.
                    </p>
                  </div>

                  <div className="space-y-4 rounded-3xl bg-[#F7F1EB]/60 p-5 ring-1 ring-[#155E63]/10">
                    <div className="rounded-2xl bg-white p-4 shadow-lg">
                      <div className={`text-[11px] font-bold uppercase tracking-wide ${coralText}`}>
                        Trigger
                      </div>
                      <p className="mt-2 text-[15px] font-semibold text-[#155E63]">
                        Job completed · invoice paid
                      </p>
                    </div>
                    <div className="flex justify-center">
                      <span className="rounded-full bg-[#F28E63] px-4 py-1.5 text-[11px] font-bold text-white shadow-lg">
                        SMS dispatched
                      </span>
                    </div>
                    <div className="rounded-2xl bg-white p-5 shadow-lg">
                      <p className={`text-[11px] font-bold uppercase tracking-wide ${coralText}`}>
                        Customer sees
                      </p>
                      <p className={`mt-3 text-sm leading-relaxed ${inkMuted}`}>
                        Quick tap — thumbs up sends them to Google. Thumbs down opens private
                        feedback.
                      </p>
                      <div className="mt-4 flex gap-2">
                        <span className={`rounded-full px-4 py-2 text-sm font-semibold text-white ${tealBtn}`}>
                          👍 Great
                        </span>
                        <span className="rounded-full bg-[#F7F1EB] px-4 py-2 text-sm font-semibold text-[#155E63] ring-1 ring-[#155E63]/12">
                          👎 Not quite
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Marquee */}
        <section className="border-y border-[#155E63]/10 bg-white py-5">
          <div className="rf-marquee-wrap">
            <div className="rf-marquee-track gap-20 px-6 text-[13px] font-bold uppercase tracking-[0.2em] text-[#155E63]/45">
              {[0, 1].map((k) => (
                <span key={k} className="flex shrink-0 gap-20">
                  <span>Hatsoffly · Built for local service brands</span>
                  <span>Automated asks · Private routing · Google-ready</span>
                  <span>HVAC · Dental · Retail · Solo operators</span>
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="scroll-mt-24 bg-white py-24">
          <div className="mx-auto max-w-7xl px-5 lg:px-10">
            <Reveal>
              <p className={`text-sm font-black uppercase tracking-[0.2em] ${coralText}`}>Features</p>
              <h2 className="mt-4 max-w-3xl text-4xl font-black tracking-tight md:text-5xl">
                Everything you need — without another dashboard to babysit.
              </h2>
              <p className={`mt-5 max-w-2xl text-lg leading-relaxed ${inkMuted}`}>
                Opinionated defaults, concierge paths when your stack needs wiring.
              </p>
            </Reveal>

            <div className="mt-16 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {features.map((f, i) => (
                <Reveal key={f.title} delay={i * 0.05}>
                  <div className="group flex h-full flex-col rounded-[1.75rem] border border-[#155E63]/10 bg-[#F7F1EB]/50 p-8 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-[#F28E63]/35 hover:bg-white hover:shadow-xl">
                    <div
                      className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2A8C89]/12 text-lg font-black text-[#2A8C89] ring-1 ring-[#155E63]/10 transition group-hover:bg-[#F28E63]/15 group-hover:text-[#155E63] group-hover:ring-[#F28E63]/25"
                      aria-hidden
                    >
                      {i + 1}
                    </div>
                    <h3 className="text-xl font-black text-[#155E63]">{f.title}</h3>
                    <p className={`mt-4 text-[15px] leading-relaxed ${inkMuted}`}>{f.copy}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Runs automatically band */}
        <Reveal>
          <section className="border-y border-[#155E63]/8 bg-[#F7F1EB]/80 py-16">
            <div className="mx-auto max-w-7xl px-5 lg:px-10">
              <div className="rounded-[2rem] border border-[#155E63]/10 bg-white p-10 shadow-sm lg:p-12">
                <p className={`text-sm font-black uppercase tracking-[0.2em] ${coralText}`}>
                  Runs in the background
                </p>
                <h3 className="mt-4 text-3xl font-black md:text-4xl">
                  No campaigns to stitch. No blast lists.
                </h3>
                <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    "Connect once",
                    "Triggers from your stack",
                    "Carrier-safe sends",
                    "Private unhappy path",
                  ].map((t) => (
                    <div
                      key={t}
                      className="rounded-2xl border border-[#155E63]/8 bg-[#F7F1EB]/50 p-6 text-[17px] font-black"
                    >
                      {t}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </Reveal>

        {/* Before / After + why (single dark band for visual consistency) */}
        <section className="bg-[#155E63] py-24 text-white lg:py-28">
          <div className="mx-auto max-w-7xl px-5 lg:px-10">
            <div className="grid gap-14 lg:grid-cols-2">
              <Reveal>
                <h3 className="text-3xl font-black">Before Hatsoffly</h3>
                <ul className="mt-6 space-y-3 text-[17px] text-white/85">
                  <li className="flex gap-3">
                    <span className={`shrink-0 ${coralText}`}>×</span>
                    <span>Reviews feel random</span>
                  </li>
                  <li className="flex gap-3">
                    <span className={`shrink-0 ${coralText}`}>×</span>
                    <span>Crew forgets to ask</span>
                  </li>
                  <li className="flex gap-3">
                    <span className={`shrink-0 ${coralText}`}>×</span>
                    <span>Quiet detractors slip through</span>
                  </li>
                </ul>
              </Reveal>
              <Reveal delay={0.08}>
                <h3 className="text-3xl font-black">After Hatsoffly</h3>
                <ul className="mt-6 space-y-3 text-[17px] text-white/85">
                  <li className="flex gap-3">
                    <span className="shrink-0 text-emerald-300">✓</span>
                    <span>Asks go out automatically</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="shrink-0 text-emerald-300">✓</span>
                    <span>Happy → Google consistently</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="shrink-0 text-emerald-300">✓</span>
                    <span>Rough → private first</span>
                  </li>
                </ul>
              </Reveal>
            </div>

            <div className="mt-20 border-t border-white/15 pt-20 lg:mt-24 lg:pt-24">
              <div className="grid gap-12 lg:grid-cols-[1fr_1.05fr] lg:items-center">
                <Reveal>
                  <p className="text-sm font-black uppercase tracking-[0.2em] text-[#F4C6AF]">
                    Why it matters
                  </p>
                  <h2 className="mt-4 text-4xl font-black leading-[1.1] tracking-tight md:text-[2.75rem]">
                    Great work doesn’t become reviews by accident.
                  </h2>
                  <p className="mt-6 text-lg leading-relaxed text-white/78">
                    Without a system, happy customers drift — and unhappy ones surface in public.
                  </p>
                </Reveal>
                <div className="grid gap-4 sm:grid-cols-3">
                  {["Customers forget", "Teams don’t ask", "Signal lost"].map((t, i) => (
                    <Reveal key={t} delay={i * 0.06}>
                      <div className="rounded-[1.5rem] border border-white/15 bg-white/10 p-6 backdrop-blur-sm transition hover:bg-white/15">
                        <div className="text-lg font-black">{t}</div>
                      </div>
                    </Reveal>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How */}
        <section id="how-it-works" className="scroll-mt-24 bg-white py-24">
          <div className="mx-auto grid max-w-7xl gap-14 px-5 lg:grid-cols-[0.92fr_1.08fr] lg:gap-16 lg:px-10">
            <Reveal>
              <p className={`text-sm font-black uppercase tracking-[0.2em] ${coralText}`}>
                How it works
              </p>
              <h2 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">
                One flow your whole team can ignore — in the best way.
              </h2>
              <p className={`mt-6 text-lg leading-relaxed ${inkMuted}`}>
                Ship the core loop fast; wire deeper integrations when you&apos;re ready.
              </p>
            </Reveal>
            <div className="flex flex-col gap-4">
              {steps.map((step, i) => (
                <Reveal key={step} delay={i * 0.06}>
                  <div className="flex gap-4 rounded-[1.5rem] border border-[#155E63]/10 bg-[#F7F1EB]/40 p-6 transition hover:border-[#F28E63]/25 hover:bg-white">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F28E63] text-lg font-black text-white shadow-lg">
                      {i + 1}
                    </span>
                    <p className={`pt-1 text-[17px] leading-relaxed ${ink}`}>{step}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Industries */}
        <section id="industries" className="scroll-mt-24 bg-[#F7F1EB]/60 py-24">
          <div className="mx-auto max-w-7xl px-5 lg:px-10">
            <Reveal className="mx-auto max-w-3xl text-center">
              <p className={`text-sm font-black uppercase tracking-[0.2em] ${coralText}`}>
                Who it&apos;s for
              </p>
              <h2 className="mt-4 text-4xl font-black md:text-5xl">
                Operators who live and die by reputation.
              </h2>
            </Reveal>
            <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {useCases.map((item, i) => (
                <Reveal key={item} delay={(i % 6) * 0.04}>
                  <div className="rounded-[1.5rem] border border-[#155E63]/10 bg-white py-8 text-center text-lg font-black shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
                    {item}
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="scroll-mt-24 bg-white py-24 lg:py-28">
          <div className="mx-auto max-w-6xl px-5 lg:px-10">
            <Reveal className="mx-auto max-w-2xl text-center">
              <div className="mb-3 text-sm font-semibold text-[#2A8C89]">
                Most teams feel momentum within the first week
              </div>
              <h2 className="text-4xl font-black md:text-5xl">Straightforward pricing.</h2>
              <p className={`mt-5 text-lg ${inkMuted}`}>
                Illustrative tiers — finalize with billing in-app.
              </p>
            </Reveal>

            <div className="mt-16 grid gap-6 md:grid-cols-3">
              <Reveal>
                <div className="flex h-full flex-col rounded-[1.75rem] border border-[#155E63]/14 bg-[#F7F1EB]/35 p-9 shadow-sm">
                  <div className="text-lg font-bold text-[#155E63]">Monthly</div>
                  <p className={`mt-1 text-sm ${inkMuted}`}>Flexible</p>
                  <div className="mt-8 text-5xl font-black text-[#155E63]">$24.95</div>
                  <div className={`text-sm ${inkMuted}`}>/month</div>
                  <Link
                    href="/onboarding"
                    className={`mt-auto inline-flex min-h-[48px] w-full items-center justify-center rounded-full px-6 py-3.5 text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5 ${tealBtn}`}
                  >
                    Try monthly
                  </Link>
                </div>
              </Reveal>

              <Reveal delay={0.06}>
                <div className="relative flex h-full flex-col rounded-[1.75rem] border-2 border-[#F28E63] bg-white p-9 shadow-xl">
                  <span className="absolute right-5 top-5 rounded-full bg-[#2A8C89] px-3 py-1 text-[11px] font-bold text-white">
                    Save 20%
                  </span>
                  <div className="text-lg font-bold text-[#155E63]">6 months</div>
                  <p className={`mt-1 text-sm ${inkMuted}`}>Best for growth</p>
                  <div className="mt-8 text-5xl font-black text-[#155E63]">$19.95</div>
                  <div className={`text-sm ${inkMuted}`}>/month</div>
                  <Link
                    href="/onboarding"
                    className={`mt-auto inline-flex min-h-[48px] w-full items-center justify-center rounded-full px-6 py-3.5 text-sm font-bold text-[#0a1210] shadow-lg transition hover:-translate-y-0.5 hover:brightness-105 ${coralBtn}`}
                  >
                    Try bi-annual
                  </Link>
                </div>
              </Reveal>

              <Reveal delay={0.12}>
                <div className="relative flex h-full flex-col rounded-[1.75rem] border border-[#155E63]/14 bg-[#F7F1EB]/35 p-9 shadow-sm">
                  <span className="absolute right-5 top-5 rounded-full bg-[#2A8C89] px-3 py-1 text-[11px] font-bold text-white">
                    Save 47%
                  </span>
                  <div className="text-lg font-bold text-[#155E63]">Annual</div>
                  <p className={`mt-1 text-sm ${inkMuted}`}>Lowest effective rate</p>
                  <div className="mt-8 text-5xl font-black text-[#155E63]">$14.95</div>
                  <div className={`text-sm ${inkMuted}`}>/month</div>
                  <Link
                    href="/onboarding"
                    className="mt-auto inline-flex min-h-[48px] w-full items-center justify-center rounded-full border-2 border-[#155E63]/20 bg-white px-6 py-3.5 text-sm font-bold text-[#155E63] shadow-sm transition hover:-translate-y-0.5 hover:border-[#155E63]/35 hover:bg-[#F7F1EB]"
                  >
                    Try annual
                  </Link>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section id="cta" className="scroll-mt-20 px-5 pb-28 lg:px-10">
          <Reveal>
            <div className="mx-auto max-w-5xl overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-[#155E63] via-[#1a6b66] to-[#2A8C89] px-8 py-16 text-center text-white shadow-2xl lg:px-20">
              <h2 className="text-4xl font-black tracking-tight md:text-5xl">
                Turn more happy jobs into public proof.
              </h2>
              <p className="mx-auto mt-6 max-w-2xl text-lg text-white/85">
                Start with a real test SMS on your phone — then scale with the same stack in
                production.
              </p>
              <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row sm:gap-5">
                <Link
                  href="/onboarding"
                  className={`inline-flex min-h-[52px] items-center justify-center rounded-full px-10 py-3.5 text-[15px] font-bold text-[#0a1210] shadow-xl transition hover:-translate-y-0.5 ${coralBtn}`}
                >
                  Start free
                </Link>
                <a
                  href={supportMailto("Hatsoffly demo")}
                  className="inline-flex min-h-[52px] items-center justify-center rounded-full border border-white/30 bg-white/10 px-10 py-3.5 text-[15px] font-bold backdrop-blur transition hover:bg-white/20"
                >
                  Book a demo
                </a>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-[#155E63]/10 bg-[#F7F1EB] py-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-5 text-sm text-[#155E63]/72 md:flex-row lg:px-10">
          <div>© {new Date().getFullYear()} Hatsoffly. All rights reserved.</div>
          <div className="flex flex-wrap items-center justify-center gap-8 font-semibold">
            <Link href="/privacy" className={HOVER_CORAL}>
              Privacy
            </Link>
            <Link href="/terms" className={HOVER_CORAL}>
              Terms
            </Link>
            <Link href="/login" className={HOVER_CORAL}>
              Log in
            </Link>
            <a href={supportMailto("Hatsoffly support")} className={HOVER_CORAL}>
              {supportEmail()}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
