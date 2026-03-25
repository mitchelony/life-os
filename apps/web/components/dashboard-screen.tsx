"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Badge, Panel, SectionHeading } from "@/components/ui";
import { formatMoney, formatSignedMoney } from "@/lib/finance";
import { getDashboardWeekSignals } from "@/lib/dashboard-view";
import type { DashboardSnapshot } from "@/lib/types";
import type { ReactNode } from "react";

function MotionCard({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay }}>
      {children}
    </motion.div>
  );
}

function dueLabel(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

export function DashboardScreen({ dashboard }: { dashboard: DashboardSnapshot }) {
  const weekSignals = getDashboardWeekSignals(dashboard);
  const visibleTopPriorities = dashboard.topPriorities.slice(0, 3);

  return (
    <div className="space-y-4 pb-24 md:space-y-6 md:pb-6">
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="space-y-3 md:hidden"
      >
        <div className="overflow-hidden rounded-[28px] border border-line bg-[linear-gradient(145deg,rgba(16,32,24,0.98),rgba(44,88,73,0.96))] p-5 text-bg shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.24em] text-white/56">Right now</p>
              <div className="mt-2 text-[2.35rem] font-semibold tracking-tight tabular-nums">
                {formatSignedMoney(dashboard.availableSpend.availableNow)}
              </div>
            </div>
            <Badge className="border-white/18 bg-[rgba(255,255,255,0.12)] text-white">Dashboard</Badge>
          </div>

          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/18 bg-[rgba(255,255,255,0.1)] px-3 py-1.5 text-xs text-white/84">
            <span className="uppercase tracking-[0.2em] text-white/56">Through next income</span>
            <span className="font-semibold tabular-nums">{formatMoney(dashboard.availableSpend.availableThroughNextIncome)}</span>
          </div>

          <div className="mt-4 rounded-[22px] bg-[rgba(255,255,255,0.1)] p-4">
            <p className="text-[10px] uppercase tracking-[0.22em] text-white/60">What matters first</p>
            <p className="mt-2 text-base font-semibold leading-6 text-white">{dashboard.nextItem}</p>
            <p className="mt-1 text-sm leading-6 text-white/74">
              {dashboard.roadmap.focus.whyNow || dashboard.afterThat}
            </p>
          </div>

          <div className="mt-4 flex gap-2">
            <Link
              href="/quick-add"
              className="inline-flex flex-1 items-center justify-center rounded-full bg-[rgba(255,255,255,0.96)] px-4 py-3 text-sm font-semibold text-[#173126]"
            >
              Log money
            </Link>
            <Link
              href="/roadmap"
              className="inline-flex flex-1 items-center justify-center rounded-full border border-white/22 bg-[rgba(255,255,255,0.1)] px-4 py-3 text-sm font-medium text-white"
            >
              Open roadmap
            </Link>
          </div>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="hidden overflow-hidden rounded-[28px] border border-line bg-[linear-gradient(135deg,rgba(16,32,24,0.96),rgba(61,111,94,0.92))] p-5 text-bg shadow-soft md:block md:rounded-[34px] md:p-8"
      >
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <Badge className="border-white/28 bg-[rgba(255,255,255,0.18)] text-white">Today</Badge>
            <h1 className="mt-4 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl md:mt-5 md:text-5xl">What matters right now.</h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-white/82">
              Start with the safe number, the next move, and the few things shaping this week.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap">
              <Link
                href="/quick-add"
                className="inline-flex items-center justify-center rounded-full bg-[rgba(255,255,255,0.96)] px-4 py-2.5 text-sm font-semibold text-[#173126] transition duration-200 hover:-translate-y-0.5 hover:bg-white sm:w-auto"
              >
                Log money
              </Link>
              <Link
                href="/tasks"
                className="inline-flex items-center justify-center rounded-full border border-white/38 bg-[rgba(245,240,232,0.18)] px-4 py-2.5 text-sm font-medium text-white transition duration-200 hover:-translate-y-0.5 hover:bg-[rgba(255,255,255,0.24)] sm:w-auto"
              >
                Open roadmap
              </Link>
            </div>
          </div>

          <div className="grid gap-3">
            <div className="rounded-[28px] border border-white/24 bg-[rgba(255,255,255,0.14)] p-5 backdrop-blur">
              <p className="text-[11px] uppercase tracking-[0.24em] text-white/74">Available now</p>
              <div className="mt-3 text-5xl font-semibold tracking-tight tabular-nums">
                {formatSignedMoney(dashboard.availableSpend.availableNow)}
              </div>
              <p className="mt-2 text-sm leading-6 text-white/82">
                Money that looks safe after protected cash, bills, minimums, and essentials.
              </p>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/24 bg-[rgba(255,255,255,0.12)] px-3 py-1.5 text-xs text-white/88">
                <span className="uppercase tracking-[0.22em] text-white/64">Through next income</span>
                <span className="font-semibold tabular-nums">{formatMoney(dashboard.availableSpend.availableThroughNextIncome)}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[24px] border border-white/24 bg-[rgba(255,255,255,0.14)] p-4 backdrop-blur">
                <p className="text-[11px] uppercase tracking-[0.24em] text-white/74">What matters first</p>
                <p className="mt-2 text-sm font-medium leading-6 text-white">{dashboard.nextItem}</p>
              </div>
              <div className="rounded-[24px] border border-white/24 bg-[rgba(255,255,255,0.14)] p-4 backdrop-blur">
                <p className="text-[11px] uppercase tracking-[0.24em] text-white/74">What comes next</p>
                <p className="mt-2 text-sm font-medium leading-6 text-white">{dashboard.afterThat}</p>
              </div>
            </div>
            <div className="rounded-[24px] border border-white/24 bg-[rgba(255,255,255,0.14)] p-4 backdrop-blur">
              <p className="text-[11px] uppercase tracking-[0.24em] text-white/74">Why now</p>
              <p className="mt-2 text-sm font-medium leading-6 text-white">{dashboard.roadmap.focus.whyNow}</p>
            </div>
          </div>
        </div>
      </motion.section>

      <section className="grid gap-4 md:gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <Panel>
          <SectionHeading
            eyebrow="Priority"
            title="Top actions"
            description="The most important things to deal with first."
          />
          <div className="mt-5 space-y-3">
            {visibleTopPriorities.map((task, index) => (
              <MotionCard key={task.id} delay={0.05 * index}>
                <div className="flex items-start justify-between gap-4 rounded-[20px] border border-line bg-white/70 p-4 md:rounded-[24px]">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-accent-soft text-accent">{task.priority}</Badge>
                      <span className="text-xs text-muted">{dueLabel(task.dueDate)}</span>
                    </div>
                    <p className="mt-3 text-sm font-medium text-ink">{task.title}</p>
                    {task.linkedTo ? <p className="mt-1 text-xs text-muted">{task.linkedTo}</p> : null}
                  </div>
                  <ArrowRight className="mt-1 h-4 w-4 text-muted" />
                </div>
              </MotionCard>
            ))}
          </div>
        </Panel>

        <Panel>
          <SectionHeading
            eyebrow="Spend"
            title="Safe-to-spend breakdown"
            description="This is the shortest explanation of how the number is being shaped."
          />
          <div className="mt-5 space-y-3">
            <InfoRow label="Liquid cash" value={formatMoney(dashboard.availableSpend.liquidCash)} />
            <InfoRow label="Protected buffer" value={formatMoney(dashboard.availableSpend.protectedCashBuffer)} />
            <InfoRow label="Bills before next income" value={formatMoney(dashboard.availableSpend.obligationsDueBeforeNextIncome)} />
            <InfoRow label="Debt minimums" value={formatMoney(dashboard.availableSpend.debtMinimumsDueBeforeNextIncome)} />
          </div>
          <div className="mt-6 rounded-[22px] bg-accent-soft p-4 md:rounded-[24px]">
            <p className="text-[11px] uppercase tracking-[0.24em] text-accent">Final numbers</p>
            <div className="mt-3 space-y-2 text-sm text-ink">
              <BreakdownRow label="Liquid cash" value={formatMoney(dashboard.availableSpend.liquidCash)} />
              <BreakdownRow label="Protected buffer" value={`− ${formatMoney(dashboard.availableSpend.protectedCashBuffer)}`} />
              <BreakdownRow label="Savings floor" value={`− ${formatMoney(dashboard.availableSpend.manualReserves)}`} />
              <BreakdownRow
                label="Bills before next income"
                value={`− ${formatMoney(dashboard.availableSpend.obligationsDueBeforeNextIncome)}`}
              />
              <BreakdownRow
                label="Debt minimums"
                value={`− ${formatMoney(dashboard.availableSpend.debtMinimumsDueBeforeNextIncome)}`}
              />
              <BreakdownRow
                label="Essentials remaining"
                value={`− ${formatMoney(dashboard.availableSpend.essentialSpendRemaining)}`}
              />
              <BreakdownRow
                label="Reliable income before next income"
                value={`+ ${formatMoney(dashboard.availableSpend.reliableIncomeBeforeNextIncome)}`}
              />
              {dashboard.availableSpend.strategyAllocations.map((item) => (
                <BreakdownRow key={item.id} label={item.label} value={`− ${formatMoney(item.amount)}`} />
              ))}
              {dashboard.availableSpend.strategyDebtExtraPayments.map((item) => (
                <BreakdownRow key={item.id} label={item.label} value={`− ${formatMoney(item.amount)}`} />
              ))}
              {dashboard.availableSpend.strategyObligationInstallments.map((item) => (
                <BreakdownRow key={item.id} label={item.label} value={`− ${formatMoney(item.amount)}`} />
              ))}
              <div className="flex items-center justify-between border-t border-line pt-2 text-sm font-semibold">
                <span>Available now</span>
                <span>{formatSignedMoney(dashboard.availableSpend.availableNow)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-line pt-2 text-sm font-semibold">
                <span>Available through next income</span>
                <span>{formatSignedMoney(dashboard.availableSpend.availableThroughNextIncome)}</span>
              </div>
            </div>
          </div>
        </Panel>
      </section>

      <section>
        <Panel>
          <SectionHeading
            eyebrow="This week"
            title="Keep the week in view"
            description="Only the few things that can change the week meaningfully belong here."
          />
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {weekSignals.map((signal) => (
              <div key={signal.id} className="rounded-[20px] border border-line bg-white/70 p-4 md:rounded-[24px]">
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted">{signal.label}</p>
                <p className="mt-2 text-base font-semibold tracking-tight text-ink">{signal.title}</p>
                <p className="mt-1 text-sm leading-6 text-muted">{signal.detail}</p>
              </div>
            ))}
          </div>
        </Panel>
      </section>
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[22px] border border-line bg-white/70 p-4">
      <span className="text-sm font-medium text-ink">{label}</span>
      <span className="text-sm font-semibold tabular-nums text-ink">{value}</span>
    </div>
  );
}

function BreakdownRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-muted">{label}</span>
      <span className="text-sm font-medium tabular-nums">{value}</span>
    </div>
  );
}
