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
    <div className="space-y-6 pb-24 md:pb-6">
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="overflow-hidden rounded-[34px] border border-line bg-[linear-gradient(135deg,rgba(16,32,24,0.96),rgba(61,111,94,0.92))] p-6 text-bg shadow-soft md:p-8"
      >
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <Badge className="border-white/28 bg-[rgba(255,255,255,0.18)] text-white">Today</Badge>
            <h1 className="mt-5 max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">Your life is visible.</h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-white/82">
              The dashboard keeps the next bill, the next income, and the next action in view so you can spend with
              less friction.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/quick-add"
                className="inline-flex items-center justify-center rounded-full bg-[rgba(255,255,255,0.96)] px-4 py-2.5 text-sm font-semibold text-[#173126] transition duration-200 hover:-translate-y-0.5 hover:bg-white"
              >
                Log money
              </Link>
              <Link
                href="/tasks"
                className="inline-flex items-center justify-center rounded-full border border-white/38 bg-[rgba(245,240,232,0.18)] px-4 py-2.5 text-sm font-medium text-white transition duration-200 hover:-translate-y-0.5 hover:bg-[rgba(255,255,255,0.24)]"
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
                Includes expected income that lands before the next horizon after bills, debt minimums, and guardrails
                are protected.
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
          </div>
        </div>
      </motion.section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total cash" value={formatMoney(dashboard.cashSummary.totalCash)} detail="All active accounts" />
        <StatCard label="Checking" value={formatMoney(dashboard.cashSummary.checking)} detail="Daily operating cash" />
        <StatCard label="Savings" value={formatMoney(dashboard.cashSummary.savings)} detail="Protected cash floor" />
        <StatCard label="Tracked debt" value={formatMoney(dashboard.cashSummary.totalDebt)} detail="Minimums and balances in view" />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <Panel>
          <SectionHeading
            eyebrow="Priority"
            title="Top actions"
            description="The most important items this week are surfaced first so nothing urgent gets buried."
          />
          <div className="mt-5 space-y-3">
            {dashboard.topPriorities.map((task, index) => (
              <MotionCard key={task.id} delay={0.05 * index}>
                <div className="flex items-start justify-between gap-4 rounded-[24px] border border-line bg-white/70 p-4">
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
            description="A compact readout of the numbers you want without digging through history."
          />
          <div className="mt-5 space-y-3">
            <InfoRow icon={Wallet} label="Upcoming income" value={formatMoney(dashboard.cashSummary.upcomingIncome)} />
            <InfoRow icon={ReceiptText} label="Overdue obligations" value={formatMoney(dashboard.cashSummary.overdueObligations)} />
            <InfoRow icon={CreditCard} label="Current debt" value={formatMoney(dashboard.cashSummary.totalDebt)} />
            <InfoRow icon={Landmark} label="Liquid cash" value={formatMoney(dashboard.availableSpend.liquidCash)} />
          </div>
          <div className="mt-6 rounded-[24px] bg-accent-soft p-4">
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

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Panel>
          <SectionHeading eyebrow="Accounts" title="Status snapshot" description="The active accounts and what each one currently holds." />
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {dashboard.accounts.map((account) => (
              <div key={account.id} className="rounded-[24px] border border-line bg-white/70 p-4">
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
          <SectionHeading eyebrow="Activity" title="Recent entries" description="A glanceable history of what moved recently." />
          <div className="mt-5 space-y-3">
            {dashboard.recentTransactions.length ? (
              dashboard.recentTransactions.map((entry) => (
                <div key={entry.id} className="rounded-[24px] border border-line bg-white/70 p-4">
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
              <div className="rounded-[24px] border border-dashed border-line bg-white/50 p-5 text-sm text-muted">
                No money has been logged yet. Use Quick add to create your first real entry.
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
