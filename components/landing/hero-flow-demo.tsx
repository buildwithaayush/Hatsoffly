"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

const coral = "text-[#F28E63]";
const ink = "text-[#155E63]";
const inkMuted = "text-[#155E63]/78";
const tealBg = "bg-[#2A8C89]";
const creamBg = "bg-[#F7F1EB]";
const coralBtn = "bg-[#F28E63]";

type SceneId = "trigger" | "sms" | "feedback" | "google";

const SCENE_ORDER: SceneId[] = ["trigger", "sms", "feedback", "google"];

const SCENE_LABEL: Record<SceneId, string> = {
  trigger: "Integration fires",
  sms: "SMS goes out",
  feedback: "Customer taps",
  google: "Happy → Google",
};

export function HeroFlowDemo() {
  const reduce = useReducedMotion();
  const [sceneIndex, setSceneIndex] = useState(0);
  const scene = SCENE_ORDER[sceneIndex];

  /** Time each scene stays visible before advancing (was 3.8s — slower for calmer hero). */
  const intervalMs = reduce ? 99999999 : 6000;

  useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(() => {
      setSceneIndex((i) => (i + 1) % SCENE_ORDER.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [reduce, intervalMs]);

  return (
    <div className="relative space-y-5">
      {/* Window chrome */}
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
        <div className="flex items-center justify-between gap-3">
          <span className={`text-[11px] font-bold uppercase tracking-[0.22em] ${coral}`}>
            Live simulation
          </span>
          <motion.span
            key={scene}
            initial={reduce ? false : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-full px-3 py-1 text-[11px] font-bold ${creamBg} ring-1 ring-[#155E63]/12 ${ink}`}
          >
            {SCENE_LABEL[scene]}
          </motion.span>
        </div>
        <h3 className={`mt-3 text-2xl font-black leading-tight md:text-3xl ${ink}`}>
          From trigger → text → outcome.
        </h3>
        <p className={`mt-2 text-[15px] leading-relaxed ${inkMuted}`}>
          Same paths your live account runs — shown here as a looping preview.
        </p>
      </div>

      <div className="relative min-h-[280px] overflow-hidden rounded-3xl bg-[#F7F1EB]/60 p-5 ring-1 ring-[#155E63]/10 sm:min-h-[300px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={scene}
            initial={
              reduce ? undefined : { opacity: 0, x: 28, filter: "blur(6px)" }
            }
            animate={{
              opacity: 1,
              x: 0,
              filter: reduce ? undefined : "blur(0px)",
            }}
            exit={
              reduce ? undefined : { opacity: 0, x: -24, filter: "blur(4px)" }
            }
            transition={
              reduce
                ? { duration: 0 }
                : { duration: 0.72, ease: [0.22, 1, 0.36, 1] }
            }
            className="space-y-4"
          >
            {scene === "trigger" && <TriggerScene reduced={!!reduce} />}
            {scene === "sms" && <SmsScene reduced={!!reduce} />}
            {scene === "feedback" && (
              <FeedbackScene reduced={!!reduce} />
            )}
            {scene === "google" && <GoogleScene reduced={!!reduce} />}
          </motion.div>
        </AnimatePresence>

        {/* Scene dots */}
        <div className="mt-6 flex justify-center gap-2 pt-2">
          {SCENE_ORDER.map((id, i) => (
            <button
              key={id}
              type="button"
              aria-label={`Show step ${i + 1}: ${SCENE_LABEL[id]}`}
              aria-current={scene === id ? "step" : undefined}
              className={`h-2 rounded-full transition-all duration-300 ${
                scene === id
                  ? "w-8 bg-[#2A8C89]"
                  : "w-2 bg-[#155E63]/20 hover:bg-[#155E63]/35"
              }`}
              onClick={() => setSceneIndex(i)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function TriggerScene({ reduced }: { reduced: boolean }) {
  return (
    <div className="space-y-4">
      <motion.div
        layout
        className="rounded-2xl bg-white p-4 shadow-lg ring-1 ring-[#155E63]/08"
        animate={
          reduced
            ? undefined
            : {
                boxShadow: [
                  "0 10px 40px -16px rgba(21,94,99,0.15)",
                  "0 14px 48px -12px rgba(242,142,99,0.22)",
                  "0 10px 40px -16px rgba(21,94,99,0.15)",
                ],
              }
        }
        transition={
          reduced ? undefined : { duration: 3.4, repeat: Infinity, ease: "easeInOut" }
        }
      >
        <div className={`text-[11px] font-bold uppercase tracking-wide ${coral}`}>
          Trigger
        </div>
        <p className={`mt-2 text-[15px] font-semibold ${ink}`}>
          Job completed · Invoice paid
        </p>
        <div className="mt-3 flex items-center gap-2 text-[12px] font-semibold text-emerald-700">
          <motion.span
            className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white"
            animate={reduced ? undefined : { scale: [1, 1.15, 1] }}
            transition={
              reduced ? undefined : { duration: 2.2, repeat: Infinity, delay: 0.2 }
            }
            aria-hidden
          >
            ✓
          </motion.span>
          CRM event matched your rule
        </div>
      </motion.div>

      <div className="flex justify-center py-1">
        <motion.div
          className="h-9 w-9 rounded-full border-2 border-dashed border-[#155E63]/25"
          animate={
            reduced ? undefined : { rotate: [0, 180, 360], scale: [1, 1.05, 1] }
          }
          transition={
            reduced ? undefined : { duration: 5, repeat: Infinity, ease: "linear" }
          }
          aria-hidden
        />
        <motion.div
          className="-ml-4 flex items-center justify-center rounded-full bg-[#F28E63] px-4 py-2 text-[11px] font-bold text-white shadow-lg"
          animate={reduced ? undefined : { y: [0, -4, 0] }}
          transition={
            reduced ? undefined : { duration: 2.5, repeat: Infinity, ease: "easeInOut" }
          }
        >
          Queue → SMS
        </motion.div>
      </div>
    </div>
  );
}

function SmsScene({ reduced }: { reduced: boolean }) {
  return (
    <div className="mx-auto max-w-[340px] space-y-3">
      <div className={`rounded-2xl ${creamBg} px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-[#155E63]/50`}>
        Messages · Hatsoffly
      </div>
      <motion.div
        initial={reduced ? undefined : { opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={
          reduced ? undefined : { delay: 0.12, duration: 0.7, ease: [0.22, 1, 0.36, 1] }
        }
        className="ml-auto max-w-[92%] rounded-2xl rounded-br-md bg-white px-4 py-3 shadow-xl ring-1 ring-[#155E63]/10"
      >
        <p className={`text-[13px] leading-relaxed ${ink}`}>
          Hi <span className="font-semibold">Jamie</span> — quick moment about
          today&apos;s visit from{" "}
          <span className="font-semibold text-[#2A8C89]">Bright Fix Plumbing</span>.
          How did we do?
        </p>
        <motion.div
          className="mt-3 inline-block rounded-lg bg-[#F7F1EB] px-3 py-2 text-[12px] font-semibold text-[#2A8C89] ring-1 ring-[#155E63]/10"
          animate={
            reduced ? undefined : { opacity: [0.65, 1, 0.65] }
          }
          transition={
            reduced ? undefined : { duration: 2.5, repeat: Infinity }
          }
        >
          Tap to rate →
        </motion.div>
      </motion.div>

      <motion.div
        className="flex justify-end gap-1 pr-1"
        initial={reduced ? undefined : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: reduced ? 0 : 0.45 }}
        aria-hidden
      >
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-[#155E63]/35"
            animate={
              reduced ? undefined : { opacity: [0.3, 1, 0.3], scale: [1, 1.2, 1] }
            }
            transition={{
              duration: 1.65,
              repeat: Infinity,
              delay: i * 0.25,
              ease: "easeInOut",
            }}
          />
        ))}
      </motion.div>
    </div>
  );
}

function FeedbackScene({ reduced }: { reduced: boolean }) {
  return (
    <div className="space-y-4">
      <div className={`rounded-2xl bg-white p-5 shadow-lg ring-1 ring-[#155E63]/08`}>
        <p className={`text-[11px] font-bold uppercase tracking-wide ${coral}`}>
          Customer sees
        </p>
        <p className={`mt-3 text-sm leading-relaxed ${inkMuted}`}>
          One tap routes happy voices to Google — rough experiences stay private.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <motion.span
            className={`inline-flex cursor-default rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-lg ${tealBg}`}
            animate={
              reduced
                ? undefined
                : {
                    scale: [1, 1.06, 1],
                    boxShadow: [
                      "0 10px 30px -10px rgba(42,140,137,0.35)",
                      "0 14px 36px -8px rgba(242,142,99,0.35)",
                      "0 10px 30px -10px rgba(42,140,137,0.35)",
                    ],
                  }
            }
            transition={
              reduced ? undefined : { duration: 3.1, repeat: Infinity, ease: "easeInOut" }
            }
          >
            👍 Great
          </motion.span>
          <motion.span
            className={`inline-flex cursor-default rounded-full bg-[#F7F1EB] px-5 py-2.5 text-sm font-semibold ring-1 ring-[#155E63]/12 ${ink}`}
            whileHover={{ scale: 1.02 }}
          >
            👎 Not quite
          </motion.span>
        </div>
      </div>
      <motion.p
        className="text-center text-[12px] font-semibold text-emerald-700"
        initial={reduced ? undefined : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 28 }}
      >
        ↑ Great selected — opening Google review link
      </motion.p>
    </div>
  );
}

function GoogleScene({ reduced }: { reduced: boolean }) {
  const stagger = reduced ? 0 : 0.08;
  return (
    <div className="flex flex-col items-center justify-center gap-5 py-2">
      <motion.div
        className="flex gap-0.5 text-amber-400 drop-shadow-sm"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: {
            transition: { staggerChildren: stagger, delayChildren: reduced ? 0 : 0.05 },
          },
        }}
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <motion.span
            key={n}
            variants={{
              hidden: { opacity: 0, y: 14, rotate: -18, scale: 0.6 },
              visible: { opacity: 1, y: 0, rotate: 0, scale: 1 },
            }}
            transition={{ type: "spring", stiffness: 420, damping: 20 }}
            className="text-2xl leading-none"
            aria-hidden
          >
            ★
          </motion.span>
        ))}
      </motion.div>
      <motion.div
        className="rounded-2xl bg-white px-6 py-4 text-center shadow-xl ring-1 ring-[#155E63]/10"
        animate={
          reduced ? undefined : { y: [0, -3, 0] }
        }
        transition={
          reduced ? undefined : { duration: 3.4, repeat: Infinity, ease: "easeInOut" }
        }
      >
        <p className={`text-[11px] font-bold uppercase tracking-wide ${coral}`}>
          Google Business
        </p>
        <p className={`mt-2 text-[15px] font-bold ${ink}`}>Leave a public review</p>
        <motion.div
          className={`mx-auto mt-3 h-9 max-w-[11rem] rounded-xl ${coralBtn} shadow-md`}
          animate={
            reduced ? undefined : { opacity: [0.85, 1, 0.85] }
          }
          transition={
            reduced ? undefined : { duration: 2.2, repeat: Infinity }
          }
          aria-hidden
        />
      </motion.div>
      <p className={`text-center text-[12px] font-semibold ${inkMuted}`}>
        Loop restarts · trigger fires again on the next job
      </p>
    </div>
  );
}
