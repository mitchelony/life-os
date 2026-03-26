"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge, Panel, SectionHeading, StatCard } from "@/components/ui";
import { type DecisionSnapshot } from "@/lib/decision";
import { describeTrend } from "@/lib/decision-view";
import { formatMoney, formatSignedMoney } from "@/lib/finance";

function shortDate(value?: string) {
  if (!value) return "No date";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function eventDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function DashboardScreen({ snapshot }: { snapshot: DecisionSnapshot }) {
  const primary = snapshot.focus.primaryAction;
  const secondary = snapshot.focus.secondaryAction;
  const actionPreview = snapshot.orderedActionQueue.slice(0, 4);

  return (
    <div className="space-y-4 pb-24 md:space-y-6 md:pb-6">
      <Panel className="overflow-hidden bg-[linear-gradient(135deg,rgba(15,28,22,0.98),rgba(52,97,81,0.94))] text-bg">
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <Badge className="border-white/15 bg-white/10 text-white">Finance OS</Badge>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">Know what is free, what is next, and what is tightening the week.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/78">{snapshot.focus.whyNow}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link href="/quick-add" className="inline-flex items-center justify-center rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-[#183126]">
                Log money
              </Link>
              <Link href="/roadmap" className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-medium text-white">
                Open roadmap
              </Link>
              <Link href="/tasks" className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-medium text-white">
                Open actions
              </Link>
            </div>
          </div>

          <div className="grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[24px] border border-white/15 bg-white/10 p-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-white/60">Free now</p>
                <p className="mt-2 text-4xl font-semibold tracking-tight tabular-nums">{formatSignedMoney(snapshot.freeNow.amount)}</p>
                <p className="mt-2 text-sm leading-6 text-white/74">Cash not currently tied down.</p>
              </div>
              <div className="rounded-[24px] border border-white/15 bg-white/10 p-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-white/60">Free after planned income</p>
                <p className="mt-2 text-4xl font-semibold tracking-tight tabular-nums">{formatSignedMoney(snapshot.freeAfterPlannedIncome.amount)}</p>
                <p className="mt-2 text-sm leading-6 text-white/74">What stays free after reliable inflow and allocations.</p>
              </div>
            </div>
            <div className="rounded-[24px] border border-white/15 bg-white/10 p-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-white/60">Do now</p>
              <p className="mt-2 text-xl font-semibold tracking-tight">{primary?.title ?? "No immediate action yet"}</p>
              <p className="mt-1 text-sm leading-6 text-white/72">{primary?.detail ?? snapshot.focus.whyNow}</p>
              {secondary ? <p className="mt-3 text-sm text-white/72">Then: {secondary.title}</p> : null}
            </div>
          </div>
        </div>
      </Panel>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Panel>
          <SectionHeading eyebrow="Action Queue" title="Do now, then next" description="This list is ordered so you do not have to recompute the week in your head." />
          <div className="mt-5 space-y-3">
            {actionPreview.map((action) => (
              <div key={action.id} className="flex items-start justify-between gap-4 rounded-[20px] border border-line bg-white/72 p-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="border-transparent bg-accent-soft text-accent">{action.lane.replaceAll("_", " ")}</Badge>
                    <Badge>{action.status}</Badge>
                  </div>
                  <p className="mt-3 text-base font-semibold tracking-tight text-ink">{action.title}</p>
                  <p className="mt-1 text-sm leading-6 text-muted">{action.detail ?? shortDate(action.dueOn)}</p>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 text-muted" />
              </div>
            ))}
            {!actionPreview.length ? (
              <div className="rounded-[20px] border border-dashed border-line bg-white/56 p-4 text-sm text-muted">No actions yet. Open Roadmap or add a manual action.</div>
            ) : null}
          </div>
        </Panel>

        <Panel>
          <SectionHeading eyebrow="Cashflow" title="At a glance" description="Enough to see pressure without turning the page into a spreadsheet." />
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <StatCard label="Planned inflow (14d)" value={formatMoney(snapshot.cashflow.next14PlannedInflow)} />
            <StatCard label="Required outflow (14d)" value={formatMoney(snapshot.cashflow.next14RequiredOutflow)} />
            <StatCard label="Trailing 30d net" value={formatMoney(snapshot.cashflow.trailing30Net)} detail={`In ${formatMoney(snapshot.cashflow.trailing30Inflow)} / Out ${formatMoney(snapshot.cashflow.trailing30Outflow)}`} />
            <StatCard label="Next pressure" value={snapshot.cashflow.nextPressurePoint ?? "Nothing urgent"} detail={snapshot.cashflow.nextIncomeDate ? `Next income ${shortDate(snapshot.cashflow.nextIncomeDate)}` : "No reliable income planned"} />
          </div>
        </Panel>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <Panel>
          <SectionHeading eyebrow="Momentum" title={describeTrend(snapshot.progress.sevenDay.direction)} description="Outcome-first progress across cash, debt, overdue pressure, and completed actions." />
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <StatCard label="7 day free now" value={formatSignedMoney(snapshot.progress.sevenDay.freeNowDelta)} />
            <StatCard label="7 day debt" value={formatSignedMoney(snapshot.progress.sevenDay.totalDebtDelta)} detail="Negative is better here" />
            <StatCard label="7 day overdue" value={String(snapshot.progress.sevenDay.overdueDelta)} detail="Negative means fewer overdue items" />
            <StatCard label="7 day actions" value={String(snapshot.progress.sevenDay.completedActionsDelta)} />
            <StatCard label="Goal completion" value={`${Math.round(snapshot.progress.goalCompletionRate)}%`} />
            <StatCard label="Completed actions" value={String(snapshot.progress.completedActions7d)} detail="Last 7 days" />
          </div>
        </Panel>

        <Panel>
          <SectionHeading eyebrow="Recent updates" title="What changed" description="Latest money and planning movement." />
          <div className="mt-5 space-y-3">
            {snapshot.recentUpdates.length ? (
              snapshot.recentUpdates.map((update) => (
                <div key={update.id} className="rounded-[20px] border border-line bg-white/72 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge>{update.eventType.replaceAll("_", " ")}</Badge>
                    <span className="text-xs text-muted">{eventDate(update.occurredAt)}</span>
                  </div>
                  <p className="mt-3 text-base font-semibold tracking-tight text-ink">{update.title}</p>
                  <p className="mt-1 text-sm leading-6 text-muted">{update.detail ?? "No extra detail."}</p>
                  {typeof update.amount === "number" ? <p className="mt-2 text-sm font-medium text-ink">{formatMoney(update.amount)}</p> : null}
                </div>
              ))
            ) : (
              <div className="rounded-[20px] border border-dashed border-line bg-white/56 p-4 text-sm text-muted">No fresh updates yet. Your next logged action or relaunch event will show here.</div>
            )}
          </div>
        </Panel>
      </section>
    </div>
  );
}
