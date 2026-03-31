"use client";

import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";
import { Badge, Panel, SectionHeading, StatCard, cn } from "@/components/ui";
import { type DecisionSnapshot } from "@/lib/decision";
import { describeTrend, getActionLaneSummary, getAvailableSpendBreakdownRows, isInactiveActionStatus } from "@/lib/decision-view";
import { formatDateValue } from "@/lib/dates";
import { formatMoney, formatSignedMoney } from "@/lib/finance";

function shortDate(value?: string) {
  if (!value) return "No date";
  return formatDateValue(value, {
    month: "short",
    day: "numeric",
  });
}

function eventDate(value: string) {
  return formatDateValue(value, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function DashboardScreen({
  snapshot,
  preferences = {
    showCashflow: true,
    showMomentum: true,
    showRecentUpdates: true,
  },
}: {
  snapshot: DecisionSnapshot;
  preferences?: {
    showCashflow: boolean;
    showMomentum: boolean;
    showRecentUpdates: boolean;
  };
}) {
  const primary = snapshot.focus.primaryAction;
  const secondary = snapshot.focus.secondaryAction;
  const actionPreview = snapshot.orderedActionQueue.filter((action) => !isInactiveActionStatus(action.status)).slice(0, 5);
  const spendNowRows = getAvailableSpendBreakdownRows(snapshot.freeNow.breakdown);
  const spendAfterRows = getAvailableSpendBreakdownRows(snapshot.freeAfterPlannedIncome.breakdown);
  const laneSummary = getActionLaneSummary(snapshot.orderedActionQueue);
  const liveLaneSummary = laneSummary.filter((item) => item.key !== "inactive");

  return (
    <div className="mx-auto max-w-[1260px] space-y-4 pb-24 md:space-y-6 md:pb-6">
      <Panel className="overflow-hidden bg-[linear-gradient(135deg,rgba(20,35,29,0.98),rgba(46,84,73,0.96))] text-white">
        <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <Badge className="border-white/14 bg-white/8 text-white">Dashboard</Badge>
            <p className="mt-5 text-[10px] uppercase tracking-[0.24em] text-white/58">Available now</p>
            <div className="mt-2 text-[3.7rem] font-semibold tracking-tight tabular-nums md:text-[4.75rem]">
              {formatSignedMoney(snapshot.freeNow.amount)}
            </div>
            <p className="mt-3 max-w-2xl text-base leading-7 text-white/76">{snapshot.focus.whyNow}</p>

            <div className="mt-6 flex flex-wrap gap-2">
              <Link href="/quick-add" className="inline-flex items-center justify-center rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-ink">
                Log money
              </Link>
              <Link href="/roadmap" className="inline-flex items-center justify-center rounded-full border border-white/16 bg-white/8 px-4 py-2.5 text-sm font-medium text-white">
                Open copilot
              </Link>
              <Link href="/tasks" className="inline-flex items-center justify-center rounded-full border border-white/16 bg-white/8 px-4 py-2.5 text-sm font-medium text-white">
                Open actions
              </Link>
            </div>

            <div className="mt-6 grid gap-2 sm:grid-cols-3">
              {liveLaneSummary.map((item) => (
                <div key={item.key} className="rounded-[20px] border border-white/10 bg-white/8 px-4 py-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-white/55">{item.label}</p>
                  <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{item.count}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3">
            <div className="rounded-[26px] border border-white/10 bg-white/8 p-5">
              <p className="text-[10px] uppercase tracking-[0.22em] text-white/55">Through next income</p>
              <p className="mt-2 text-4xl font-semibold tracking-tight tabular-nums">{formatSignedMoney(snapshot.freeAfterPlannedIncome.amount)}</p>
              <p className="mt-2 text-sm leading-6 text-white/72">
                What stays free after expected inflow, due bills, minimums, and your essentials target.
              </p>
            </div>

            <div className="rounded-[26px] border border-white/10 bg-white/8 p-5">
              <p className="text-[10px] uppercase tracking-[0.22em] text-white/55">Copilot focus</p>
              <div className="mt-3 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">{primary?.title ?? "No immediate action yet"}</p>
                    <p className="mt-1 text-sm leading-6 text-white/68">{primary?.detail ?? snapshot.focus.whyNow}</p>
                  </div>
                  <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-white/55" />
                </div>
                {secondary ? (
                  <div className="border-t border-white/10 pt-3">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/55">Then next</p>
                    <p className="mt-1 text-sm font-medium text-white">{secondary.title}</p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </Panel>

      <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <Panel className="space-y-4">
          <SectionHeading
            eyebrow="Top actions"
            title="Do now, then next"
            description="This queue is ordered so you do not have to redo the week in your head after the plan changes."
          />
          <div className="space-y-2">
            {actionPreview.length ? (
              actionPreview.map((action, index) => (
                <div key={action.id} className="flex items-start gap-3 rounded-[22px] border border-line bg-[rgba(255,255,255,0.62)] px-4 py-4">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="border-transparent bg-accent-soft text-accent">{action.lane.replaceAll("_", " ")}</Badge>
                      <Badge>{action.status}</Badge>
                    </div>
                    <p className="mt-3 text-base font-semibold tracking-tight text-ink">{action.title}</p>
                    <p className="mt-1 text-sm leading-6 text-muted">{action.detail ?? shortDate(action.dueOn)}</p>
                  </div>
                  <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted" />
                </div>
              ))
            ) : (
              <div className="rounded-[22px] border border-dashed border-line bg-white/56 p-4 text-sm text-muted">
                No actions yet. Open Roadmap or add a manual action.
              </div>
            )}
          </div>
        </Panel>

        <Panel className="space-y-4">
          <SectionHeading
            eyebrow="Spend breakdown"
            title="See what is tightening the number"
            description="The formula stays readable: cash in view first, then the money already spoken for."
          />

          <div className="grid gap-3">
            <div className="rounded-[22px] border border-line bg-[rgba(255,255,255,0.62)] p-4">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-muted">Available now</p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums text-ink">{formatSignedMoney(snapshot.freeNow.amount)}</p>
                </div>
                <p className="text-xs text-muted">Before future income</p>
              </div>
              <div className="mt-4 space-y-2">
                {spendNowRows.map((row) => (
                  <div key={row.key} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-muted">{row.label}</span>
                    <span className={cn("font-medium tabular-nums", row.tone === "positive" ? "text-success" : "text-ink")}>
                      {row.amount > 0 ? "+" : ""}
                      {formatMoney(row.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[22px] border border-line bg-[rgba(246,250,248,0.8)] p-4">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-muted">Through next income</p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums text-ink">{formatSignedMoney(snapshot.freeAfterPlannedIncome.amount)}</p>
                </div>
                <p className="text-xs text-muted">Including expected inflow</p>
              </div>
              <div className="mt-4 space-y-2">
                {spendAfterRows.map((row) => (
                  <div key={row.key} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-muted">{row.label}</span>
                    <span className={cn("font-medium tabular-nums", row.tone === "positive" ? "text-success" : "text-ink")}>
                      {row.amount > 0 ? "+" : ""}
                      {formatMoney(row.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Panel>
      </section>

      {preferences.showCashflow ? (
        <Panel>
          <SectionHeading
            eyebrow="This week"
            title="Pressure and timing"
            description="Enough to see what is tightening the next few days without turning the page into a report."
          />
          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <StatCard label="Planned inflow (14d)" value={formatMoney(snapshot.cashflow.next14PlannedInflow)} />
            <StatCard label="Required outflow (14d)" value={formatMoney(snapshot.cashflow.next14RequiredOutflow)} />
            <StatCard
              label="Next pressure"
              value={snapshot.cashflow.nextPressurePoint ?? "Nothing urgent"}
              detail={snapshot.cashflow.nextIncomeDate ? `Next income ${shortDate(snapshot.cashflow.nextIncomeDate)}` : "No reliable income planned"}
            />
            <StatCard
              label="Trailing 30d net"
              value={formatMoney(snapshot.cashflow.trailing30Net)}
              detail={`In ${formatMoney(snapshot.cashflow.trailing30Inflow)} / Out ${formatMoney(snapshot.cashflow.trailing30Outflow)}`}
            />
          </div>
        </Panel>
      ) : null}

      {(preferences.showMomentum || preferences.showRecentUpdates) ? (
        <section className="grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
          {preferences.showMomentum ? (
            <Panel>
              <SectionHeading
                eyebrow="Momentum"
                title={describeTrend(snapshot.progress.sevenDay.direction)}
                description="Outcome-first movement across free cash, debt, overdue pressure, and completed actions."
              />
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <StatCard label="7 day free now" value={formatSignedMoney(snapshot.progress.sevenDay.freeNowDelta)} />
                <StatCard label="7 day debt" value={formatSignedMoney(snapshot.progress.sevenDay.totalDebtDelta)} detail="Negative is better here" />
                <StatCard label="7 day overdue" value={String(snapshot.progress.sevenDay.overdueDelta)} detail="Negative means fewer overdue items" />
                <StatCard label="7 day actions" value={String(snapshot.progress.sevenDay.completedActionsDelta)} />
                <StatCard label="Goal completion" value={`${Math.round(snapshot.progress.goalCompletionRate)}%`} />
                <StatCard label="Completed actions" value={String(snapshot.progress.completedActions7d)} detail="Last 7 days" />
              </div>
            </Panel>
          ) : null}

          {preferences.showRecentUpdates ? (
            <Panel>
              <SectionHeading
                eyebrow="Recent updates"
                title="What changed"
                description="Latest money and planning movement, kept lower on the page so it supports the decision path instead of competing with it."
              />
              <div className="mt-5 space-y-2">
                {snapshot.recentUpdates.length ? (
                  snapshot.recentUpdates.map((update) => (
                    <div key={update.id} className="rounded-[22px] border border-line bg-[rgba(255,255,255,0.62)] px-4 py-4">
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
                  <div className="rounded-[22px] border border-dashed border-line bg-white/56 p-4 text-sm text-muted">
                    No fresh updates yet. Your next logged action or relaunch event will show here.
                  </div>
                )}
              </div>
            </Panel>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
