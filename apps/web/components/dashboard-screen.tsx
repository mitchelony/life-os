"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, CreditCard, Landmark, ReceiptText, Wallet, Sparkles } from "lucide-react";
import { Badge, Panel, SectionHeading, StatCard } from "@/components/ui";
import { formatMoney, formatSignedMoney } from "@/lib/finance";
import type { DashboardSnapshot } from "@/lib/types";
import type { ComponentType, ReactNode } from "react";

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

function recurrenceLabel(value: string) {
  return value === "one-time" ? "One time" : value.charAt(0).toUpperCase() + value.slice(1);
}

export function DashboardScreen({ dashboard }: { dashboard: DashboardSnapshot }) {
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
              <p className="text-[10px] uppercase tracking-[0.24em] text-white/56">Safe through next income</p>
              <div className="mt-2 text-[2.35rem] font-semibold tracking-tight tabular-nums">
                {formatMoney(dashboard.availableSpend.availableThroughNextIncome)}
              </div>
            </div>
            <Badge className="border-white/18 bg-[rgba(255,255,255,0.12)] text-white">Today</Badge>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <MiniMetric label="Available now" value={formatSignedMoney(dashboard.availableSpend.availableNow)} />
            <MiniMetric label="Upcoming income" value={formatMoney(dashboard.cashSummary.upcomingIncome)} />
          </div>

          <div className="mt-4 rounded-[22px] bg-[rgba(255,255,255,0.1)] p-4">
            <p className="text-[10px] uppercase tracking-[0.22em] text-white/60">Next move</p>
            <p className="mt-2 text-base font-semibold leading-6 text-white">{dashboard.nextItem}</p>
            <p className="mt-1 text-sm leading-6 text-white/74">{dashboard.afterThat}</p>
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

        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Cash" value={formatMoney(dashboard.cashSummary.totalCash)} detail="All accounts" />
          <StatCard label="Debt" value={formatMoney(dashboard.cashSummary.totalDebt)} detail="Tracked balances" />
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
            <h1 className="mt-4 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl md:mt-5 md:text-5xl">Your life is visible.</h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-white/82">
              See what is due next, what money is coming in, and what to do first.
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
                Review weekly actions
              </Link>
            </div>
          </div>

          <div className="grid gap-3">
            <div className="rounded-[28px] border border-white/24 bg-[rgba(255,255,255,0.14)] p-5 backdrop-blur">
              <p className="text-[11px] uppercase tracking-[0.24em] text-white/74">Available through next income</p>
              <div className="mt-3 text-5xl font-semibold tracking-tight tabular-nums">
                {formatMoney(dashboard.availableSpend.availableThroughNextIncome)}
              </div>
              <p className="mt-2 text-sm leading-6 text-white/82">
                This includes income you expect before your next big money check-in.
              </p>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/24 bg-[rgba(255,255,255,0.12)] px-3 py-1.5 text-xs text-white/88">
                <span className="uppercase tracking-[0.22em] text-white/64">Available now</span>
                <span className="font-semibold tabular-nums">{formatSignedMoney(dashboard.availableSpend.availableNow)}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[24px] border border-white/24 bg-[rgba(255,255,255,0.14)] p-4 backdrop-blur">
                <p className="text-[11px] uppercase tracking-[0.24em] text-white/74">What&apos;s next</p>
                <p className="mt-2 text-sm font-medium leading-6 text-white">{dashboard.nextItem}</p>
              </div>
              <div className="rounded-[24px] border border-white/24 bg-[rgba(255,255,255,0.14)] p-4 backdrop-blur">
                <p className="text-[11px] uppercase tracking-[0.24em] text-white/74">After that</p>
                <p className="mt-2 text-sm font-medium leading-6 text-white">{dashboard.afterThat}</p>
              </div>
            </div>
            {dashboard.roadmap.focus.nextStep ? (
              <div className="rounded-[24px] border border-white/24 bg-[rgba(255,255,255,0.14)] p-4 backdrop-blur">
                <p className="text-[11px] uppercase tracking-[0.24em] text-white/74">Next paycheck flow</p>
                <p className="mt-2 text-sm font-medium leading-6 text-white">{dashboard.roadmap.focus.nextStep.title}</p>
                <p className="mt-1 text-xs leading-5 text-white/78">{dashboard.roadmap.focus.whyNow}</p>
              </div>
            ) : null}
          </div>
        </div>
      </motion.section>

      <section className="hidden gap-3 sm:grid-cols-2 xl:grid md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total cash" value={formatMoney(dashboard.cashSummary.totalCash)} detail="All active accounts" />
        <StatCard label="Checking" value={formatMoney(dashboard.cashSummary.checking)} detail="Daily operating cash" />
        <StatCard label="Savings" value={formatMoney(dashboard.cashSummary.savings)} detail="Protected cash floor" />
        <StatCard label="Tracked debt" value={formatMoney(dashboard.cashSummary.totalDebt)} detail="Minimums and balances in view" />
      </section>

      <section className="grid gap-4 md:gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <Panel>
          <SectionHeading
            eyebrow="Priority"
            title="Top actions"
            description="The most important things to deal with first."
          />
          <div className="mt-5 space-y-3">
            {dashboard.topPriorities.map((task, index) => (
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
            eyebrow="Snapshot"
            title="Money at a glance"
            description="The key numbers in one place."
          />
          <div className="mt-5 space-y-3">
            <InfoRow icon={Wallet} label="Upcoming income" value={formatMoney(dashboard.cashSummary.upcomingIncome)} />
            <InfoRow icon={ReceiptText} label="Overdue obligations" value={formatMoney(dashboard.cashSummary.overdueObligations)} />
            <InfoRow icon={CreditCard} label="Current debt" value={formatMoney(dashboard.cashSummary.totalDebt)} />
            <InfoRow icon={Landmark} label="Liquid cash" value={formatMoney(dashboard.availableSpend.liquidCash)} />
          </div>
          <div className="mt-6 rounded-[22px] bg-accent-soft p-4 md:rounded-[24px]">
            <p className="text-[11px] uppercase tracking-[0.24em] text-accent">Safe-spend breakdown</p>
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

      <section className="grid gap-4 md:gap-6 xl:grid-cols-[1fr_1fr]">
        <Panel>
          <SectionHeading eyebrow="Accounts" title="Account snapshot" description="See what is in each account right now." />
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {dashboard.accounts.map((account) => (
              <div key={account.id} className="rounded-[20px] border border-line bg-white/70 p-4 md:rounded-[24px]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-ink">{account.name}</p>
                    <p className="text-xs text-muted">{account.institution}</p>
                  </div>
                  <Badge>{account.type.replace("_", " ")}</Badge>
                </div>
                <div className="mt-4 text-2xl font-semibold tracking-tight tabular-nums">{formatMoney(account.balance)}</div>
                {account.notes ? <p className="mt-2 text-xs leading-5 text-muted">{account.notes}</p> : null}
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <SectionHeading eyebrow="Activity" title="Recent entries" description="Your latest money entries." />
          <div className="mt-5 space-y-3">
            {dashboard.recentTransactions.length ? (
              dashboard.recentTransactions.map((entry) => (
                <div key={entry.id} className="rounded-[20px] border border-line bg-white/70 p-4 md:rounded-[24px]">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-ink">{entry.title}</p>
                      <p className="mt-1 text-xs text-muted">
                        {entry.counterparty} • {entry.account} • {dueLabel(entry.date)}
                      </p>
                    </div>
                    <p className={entry.kind === "income" ? "text-sm font-semibold text-success" : "text-sm font-semibold text-ink"}>
                      {entry.kind === "income" ? "+" : "−"}
                      {formatMoney(entry.amount)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[20px] border border-dashed border-line bg-white/50 p-5 text-sm text-muted md:rounded-[24px]">
                Nothing has been logged yet. Use Quick add to save your first entry.
              </div>
            )}
          </div>
        </Panel>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {dashboard.obligations.map((obligation) => (
          <Panel key={obligation.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.26em] text-muted">Obligation</p>
                <h3 className="mt-2 text-base font-semibold tracking-tight">{obligation.name}</h3>
                <p className="mt-1 text-sm text-muted">
                  {dueLabel(obligation.dueDate)} {obligation.recurrence !== "one-time" ? `• ${recurrenceLabel(obligation.recurrence)}` : ""}
                </p>
                {obligation.strategy ? (
                  <p className="mt-1 text-xs leading-5 text-muted">
                    {obligation.strategy.handling === "pay_over_time"
                      ? `Strategy: pay over time${obligation.strategy.installmentAmount ? ` • reserve ${formatMoney(obligation.strategy.installmentAmount)}` : ""}`
                      : "Strategy: pay once"}
                  </p>
                ) : null}
              </div>
              <Sparkles className="h-4 w-4 text-accent" />
            </div>
            <div className="mt-5 text-3xl font-semibold tracking-tight tabular-nums">{formatMoney(obligation.amount)}</div>
          </Panel>
        ))}
      </section>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[22px] border border-line bg-white/70 p-4">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-accent-soft p-2">
          <Icon className="h-4 w-4 text-accent" />
        </div>
        <span className="text-sm font-medium text-ink">{label}</span>
      </div>
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

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-white/14 bg-[rgba(255,255,255,0.08)] p-3">
      <p className="text-[10px] uppercase tracking-[0.18em] text-white/58">{label}</p>
      <p className="mt-2 text-lg font-semibold tracking-tight tabular-nums text-white">{value}</p>
    </div>
  );
}
