"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, BrainCircuit, GraduationCap, ShieldCheck, Sparkles, WalletCards } from "lucide-react";
import { Badge, Panel } from "@/components/ui";
import { HomeGate } from "@/components/home-gate";
import { hasAuthSession } from "@/lib/auth";
import { getRootPageMode, type RootPageMode } from "@/lib/root-page";

const preview = {
  cards: [
    {
      id: "available_now",
      eyebrow: "Available now",
      title: "$84",
      summary: "What you can spend today.",
      detail: "A clear number after bills, essentials, and your buffer.",
      tieIn: "Dashboard",
      tone: "light",
    },
    {
      id: "income_mix",
      eyebrow: "Income mix",
      title: "Campus pay + support",
      summary: "Student money comes from more than one place.",
      detail: "Track shifts, refunds, transfers, side gigs, and support in one plan.",
      tieIn: "Income",
      tone: "dark",
    },
    {
      id: "through_next_income",
      eyebrow: "Through next income",
      title: "$229",
      summary: "What stays safe until more money lands.",
      detail: "See the next two moves before the next deposit hits.",
      tieIn: "Planning horizon",
      tone: "dark",
    },
    {
      id: "copilot_focus",
      eyebrow: "Copilot focus",
      title: "Friday income plan",
      summary: "The next call the app recommends.",
      detail: "When plans change, the copilot reshuffles the order for you.",
      tieIn: "Roadmap + Copilot",
      tone: "light",
    },
  ],
};

const previewOrder = preview.cards.map((card) => card.id);
const leftColumnIds = ["available_now", "through_next_income"] as const;
const rightColumnIds = ["income_mix", "copilot_focus"] as const;

function buildPreviewColumns(activeId: ((typeof preview.cards)[number]["id"]) | null) {
  if (!activeId) {
    return [leftColumnIds, rightColumnIds] as const;
  }

  if (leftColumnIds.includes(activeId as (typeof leftColumnIds)[number])) {
    return [[activeId], previewOrder.filter((id) => id !== activeId)] as const;
  }

  return [previewOrder.filter((id) => id !== activeId), [activeId]] as const;
}

const landingSections = [
  {
    title: "A copilot that helps you decide what to do next",
    body: "When a refund is late, your hours change, or a bill shows up early, the copilot helps you reorder the plan around what matters most now.",
    icon: BrainCircuit,
  },
  {
    title: "Built for the way student money actually works",
    body: "Track part-time shifts, parent support, refund checks, side gigs, scholarships, and competition payouts without pretending your life runs on a salary.",
    icon: GraduationCap,
  },
  {
    title: "Clarity before the money arrives",
    body: "See what is safe to spend now, what is safe through the next income, and what should get paid first when money lands.",
    icon: WalletCards,
  },
] as const;

const workflow = [
  {
    step: "01",
    title: "Choose your starting point",
    body: "Create an account, then start blank or load sample student data if you want to see the app working right away.",
  },
  {
    step: "02",
    title: "Map your next income",
    body: "Add the money you expect from work, parents, refunds, or side gigs so the app knows what is actually coming.",
  },
  {
    step: "03",
    title: "Follow the next move",
    body: "Use the dashboard, roadmap, and copilot to decide what gets paid first when income hits.",
  },
] as const;

const typedHighlights = [
  "Guided onboarding with optional sample student data",
  "Built for refunds, side gigs, campus pay, and parent support",
  "See what is safe to spend before the next income lands",
  "Get a student-first plan when money comes in unevenly",
] as const;

function TypedHighlight() {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [displayText, setDisplayText] = useState<string>(typedHighlights[0] ?? "");
  const [isDeleting, setIsDeleting] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncReducedMotion = () => setReducedMotion(mediaQuery.matches);
    syncReducedMotion();
    mediaQuery.addEventListener("change", syncReducedMotion);
    return () => mediaQuery.removeEventListener("change", syncReducedMotion);
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      setDisplayText(typedHighlights[0] ?? "");
      return;
    }

    const currentPhrase = typedHighlights[phraseIndex] ?? "";
    const typingDelay = isDeleting ? 34 : 58;
    const pauseDelay = isDeleting ? 180 : 1500;

    const timeout = window.setTimeout(() => {
      if (!isDeleting) {
        const nextText = currentPhrase.slice(0, displayText.length + 1);
        setDisplayText(nextText);
        if (nextText === currentPhrase) {
          setIsDeleting(true);
        }
        return;
      }

      const nextText = currentPhrase.slice(0, Math.max(0, displayText.length - 1));
      setDisplayText(nextText);
      if (!nextText.length) {
        setIsDeleting(false);
        setPhraseIndex((current) => (current + 1) % typedHighlights.length);
      }
    }, displayText === currentPhrase || displayText.length === 0 ? pauseDelay : typingDelay);

    return () => window.clearTimeout(timeout);
  }, [displayText, isDeleting, phraseIndex, reducedMotion]);

  return (
    <span
      className="inline-flex min-h-[1.5rem] items-center gap-1"
      aria-label={typedHighlights[phraseIndex] ?? typedHighlights[0]}
    >
      <span>{displayText}</span>
      {!reducedMotion ? <span className="h-4 w-px animate-pulse bg-current/75" aria-hidden="true" /> : null}
    </span>
  );
}

function LandingPage() {
  const [activePreviewCard, setActivePreviewCard] = useState<((typeof preview.cards)[number]["id"]) | null>(null);
  const [leftColumn, rightColumn] = buildPreviewColumns(activePreviewCard);

  return (
    <main className="min-h-screen">
      <section className="relative overflow-hidden bg-[linear-gradient(135deg,rgba(13,24,20,0.98),rgba(38,69,60,0.96))] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.12),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(149,197,171,0.12),transparent_22%)]" />
        <div className="relative mx-auto flex min-h-screen w-full max-w-[1380px] flex-col px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[1.4rem] font-semibold tracking-[0.18em] text-white sm:text-[1.65rem]">LIFE OS</p>
              <p className="mt-1 text-sm text-white/72">Money clarity for student life</p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="inline-flex min-h-[2.75rem] items-center justify-center rounded-full border border-white/14 bg-white/8 px-4 text-sm font-medium text-white transition hover:bg-white/14"
              >
                Sign in
              </Link>
              <Link
                href="/login"
                className="inline-flex min-h-[2.75rem] items-center justify-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-ink transition hover:-translate-y-0.5"
              >
                Create account
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="grid flex-1 content-start gap-10 py-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-start lg:py-14">
            <motion.div
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: "easeOut" }}
              className="max-w-xl"
            >
              <Badge className="border-white/14 bg-white/10 text-white">Built for student cash flow</Badge>
              <h1 className="mt-6 text-[3rem] font-semibold leading-[0.9] tracking-tight text-white sm:text-[4.2rem] lg:text-[5rem]">
                Student money is different.
                <br />
                Your money app should be too.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-white/76 sm:text-lg">
                Most finance apps are built for stable paychecks and adult routines. Life OS is built for student life, with irregular income, real bills, and a built-in copilot that helps you decide what gets paid first.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/login"
                  className="inline-flex min-h-[3rem] items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-ink transition hover:-translate-y-0.5"
                >
                  Get started
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="#how-it-works"
                  className="inline-flex min-h-[3rem] items-center justify-center rounded-full border border-white/14 bg-white/8 px-5 text-sm font-medium text-white transition hover:bg-white/14"
                >
                  See how it works
                </a>
              </div>
              <div className="mt-6 grid gap-3 text-sm text-white/68 sm:grid-cols-[minmax(0,40rem)_max-content] sm:items-center">
                <span className="inline-flex min-w-0 items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  <TypedHighlight />
                </span>
                <span className="inline-flex items-center gap-2 sm:justify-self-start">
                  <ShieldCheck className="h-4 w-4" />
                  Private by default
                </span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 36 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.08, ease: "easeOut" }}
              className="lg:justify-self-end"
            >
              <div className="rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.06))] p-4 shadow-[0_30px_80px_rgba(0,0,0,0.24)] backdrop-blur-xl sm:p-5">
                <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.14),rgba(255,255,255,0.05))] p-5 sm:p-6">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-white/55">Student preview</p>
                  <div
                    className="mt-4 grid gap-4 md:h-[23rem] md:grid-cols-2 md:items-stretch"
                    onMouseLeave={() => setActivePreviewCard(null)}
                  >
                    {[leftColumn, rightColumn].map((column, columnIndex) => (
                      <motion.div key={columnIndex} layout className="flex h-full flex-col gap-4">
                        {column.map((cardId) => {
                          const card = preview.cards.find((item) => item.id === cardId);
                          if (!card) return null;

                          const isActive = activePreviewCard === card.id;
                          const isLight = card.tone === "light";
                          const isStackedColumn = Boolean(activePreviewCard) && column.length > 1;
                          const isCompact = Boolean(activePreviewCard) && !isActive;

                          return (
                            <motion.button
                              key={card.id}
                              type="button"
                              layout
                              onMouseEnter={() => setActivePreviewCard(card.id)}
                              onFocus={() => setActivePreviewCard(card.id)}
                              className={`rounded-[24px] border px-5 py-5 text-left transition duration-300 ${
                                isLight
                                  ? "border-[rgba(245,239,231,0.4)] bg-[rgba(245,239,231,0.94)] text-ink"
                                  : "border-white/10 bg-white/10 text-white"
                              } ${isActive ? "shadow-[0_18px_40px_rgba(0,0,0,0.16)]" : ""} ${
                                activePreviewCard
                                  ? isActive
                                    ? "h-full"
                                    : isStackedColumn
                                      ? "min-h-0 flex-1 py-4"
                                      : "min-h-0 flex-1"
                                  : "min-h-0 flex-1"
                              }`}
                              animate={{ y: isActive ? -2 : 0 }}
                              transition={{ layout: { duration: 0.28, ease: "easeOut" }, y: { duration: 0.18, ease: "easeOut" } }}
                            >
                              <div className="flex h-full flex-col">
                                <p className={`text-[10px] uppercase tracking-[0.2em] ${isLight ? "text-muted" : "text-white/55"}`}>{card.eyebrow}</p>
                                <h3
                                  className={`mt-2 font-semibold tracking-tight ${
                                    isCompact
                                      ? "text-[1.35rem] leading-tight"
                                      : card.id === "available_now"
                                      ? "text-[3rem]"
                                      : card.id === "through_next_income"
                                        ? "text-3xl"
                                        : "text-[1.85rem] leading-tight"
                                  }`}
                                >
                                  {card.title}
                                </h3>
                                {!isCompact ? <p className={`mt-3 text-sm leading-6 ${isLight ? "text-muted" : "text-white/72"}`}>{card.summary}</p> : null}

                                <motion.div
                                  initial={false}
                                  animate={{
                                    height: isActive ? "auto" : 0,
                                    opacity: isActive ? 1 : 0,
                                    marginTop: isActive ? 14 : 0,
                                  }}
                                  transition={{ duration: 0.22, ease: "easeOut" }}
                                  className="overflow-hidden"
                                >
                                  <div className={`border-t pt-4 ${isLight ? "border-ink/10" : "border-white/10"}`}>
                                    <p className={`text-sm leading-6 ${isLight ? "text-muted" : "text-white/68"}`}>{card.detail}</p>
                                    <p className={`mt-3 text-[10px] uppercase tracking-[0.2em] ${isLight ? "text-muted" : "text-white/50"}`}>
                                      {card.tieIn}
                                    </p>
                                  </div>
                                </motion.div>
                              </div>
                            </motion.button>
                          );
                        })}
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1380px] px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="grid gap-6 border-t border-line pt-8 lg:grid-cols-3 lg:pt-10">
          {landingSections.map((section, index) => {
            const Icon = section.icon;
            return (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.35 }}
                transition={{ duration: 0.45, delay: index * 0.08, ease: "easeOut" }}
                className="space-y-4"
              >
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-accent-soft text-accent">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="text-2xl font-semibold tracking-tight text-ink">{section.title}</h2>
                <p className="max-w-md text-base leading-7 text-muted">{section.body}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      <section id="how-it-works" className="mx-auto w-full max-w-[1380px] px-4 py-4 sm:px-6 lg:px-8 lg:py-8">
        <Panel className="overflow-hidden bg-[linear-gradient(135deg,rgba(20,35,29,0.98),rgba(46,84,73,0.96))] p-0 text-white">
          <div className="grid gap-0 lg:grid-cols-[0.72fr_1.28fr]">
            <div className="border-b border-white/10 p-6 lg:border-b-0 lg:border-r lg:p-8">
              <p className="text-[10px] uppercase tracking-[0.24em] text-white/55">How it works</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Built for life between deposits, not just life between paychecks.</h2>
              <p className="mt-4 max-w-md text-base leading-7 text-white/72">
                Life OS is designed around the question students actually ask: when the next money hits, what gets paid first, what can wait, and what does the copilot recommend now?
              </p>
            </div>
            <div className="divide-y divide-white/10">
              {workflow.map((item) => (
                <div key={item.step} className="grid gap-3 p-6 sm:grid-cols-[120px_1fr] sm:p-8">
                  <p className="text-[1.9rem] font-semibold tracking-tight text-white/38">{item.step}</p>
                  <div>
                    <p className="text-xl font-semibold tracking-tight text-white">{item.title}</p>
                    <p className="mt-2 max-w-2xl text-base leading-7 text-white/68">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </section>

      <section className="mx-auto w-full max-w-[1380px] px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="flex flex-col gap-6 border-t border-line pt-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-[10px] uppercase tracking-[0.24em] text-muted">Get set up fast</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              Stop forcing student life into money tools built for someone else.
            </h2>
            <p className="mt-4 text-base leading-7 text-muted">
              Start with your own numbers or use sample student data, then let Life OS turn uneven income into a plan you can actually follow.
            </p>
          </div>
          <Link
            href="/login"
            className="inline-flex min-h-[3rem] items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-bg transition hover:-translate-y-0.5 hover:bg-[#0f1a16]"
          >
            Open Life OS
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </main>
  );
}

export function RootPage() {
  const [mode, setMode] = useState<RootPageMode>(() => (typeof window === "undefined" ? "landing" : getRootPageMode(hasAuthSession())));

  useEffect(() => {
    setMode(getRootPageMode(hasAuthSession()));
  }, []);

  if (mode === "app_gate") {
    return <HomeGate />;
  }

  return <LandingPage />;
}
