"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Panel, SectionHeading, StatCard } from "@/components/ui";
import { api, type BackendDebt } from "@/lib/api";
import { useDecisionSnapshot } from "@/lib/decision";
import { describeTrend } from "@/lib/decision-view";
import { formatMoney } from "@/lib/finance";
import { findLinkedAction } from "@/lib/planning-view";

function dueLabel(value?: string | null) {
  if (!value) return "No due date";
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function debtDirection(debt: BackendDebt, metricCurrentValue?: number, metricStartValue?: number) {
  if (metricCurrentValue == null || metricStartValue == null) return "No baseline yet";
  if (metricCurrentValue < metricStartValue) return "Moving forward";
  if (metricCurrentValue > metricStartValue) return "Moving backward";
  return "Holding steady";
}

export default function DebtsPage() {
  const { snapshot, loading } = useDecisionSnapshot();
  const [debts, setDebts] = useState<BackendDebt[]>([]);

  useEffect(() => {
    void api.listDebts().then(setDebts);
  }, []);

  const debtGoals = useMemo(
    () =>
      new Map(
        (snapshot?.roadmap.goals ?? [])
          .filter((goal) => goal.linkedType === "debt" && goal.linkedId)
          .map((goal) => [goal.linkedId as string, goal]),
      ),
    [snapshot?.roadmap.goals],
  );

  if (loading && !snapshot && debts.length === 0) {
    return (
      <div className="space-y-4 pb-24 md:space-y-6 md:pb-6">
        <Panel>
          <SectionHeading eyebrow="Debts" title="Loading debt pressure" description="Pulling debt balances, minimums, and the current action order." />
        </Panel>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24 md:space-y-6 md:pb-6">
      <Panel>
        <SectionHeading
          eyebrow="Debts"
          title="Minimums, payoff pressure, and what to do next"
          description="Each debt should show where it sits in the queue instead of living as a separate list."
        />
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <StatCard label="Total debt" value={formatMoney(snapshot?.progress.totalDebt ?? 0)} />
          <StatCard label="7 day direction" value={describeTrend(snapshot?.progress.sevenDay.direction ?? "steady")} />
          <StatCard label="Free after planned income" value={formatMoney(snapshot?.freeAfterPlannedIncome.amount ?? 0)} />
        </div>
      </Panel>

      <section className="grid gap-4 lg:grid-cols-2">
        {debts.map((item) => {
          const nextAction = findLinkedAction(snapshot?.orderedActionQueue ?? [], "debt", item.id);
          const goal = debtGoals.get(item.id);

          return (
            <Panel key={item.id} className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge>{item.status}</Badge>
                    {goal ? <Badge className="border-transparent bg-accent-soft text-accent">{goal.priority}</Badge> : null}
                  </div>
                  <h2 className="mt-3 text-xl font-semibold tracking-tight">{item.name}</h2>
                  <p className="mt-1 text-sm text-muted">{dueLabel(item.due_on)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-muted">Balance</p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">{formatMoney(item.balance)}</p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <StatCard label="Minimum" value={formatMoney(item.minimum_payment)} detail="Required before extra paydown." />
                <StatCard
                  label="Direction"
                  value={debtDirection(item, goal?.metricCurrentValue, goal?.metricStartValue)}
                  detail={goal?.title ?? "Link a roadmap goal to track payoff progress here."}
                />
              </div>

              <div className="rounded-[22px] border border-line bg-[rgba(244,241,233,0.84)] p-4">
                <p className="text-[10px] uppercase tracking-[0.22em] text-muted">Next recommended action</p>
                <p className="mt-2 text-lg font-semibold tracking-tight text-ink">{nextAction?.title ?? "No linked action yet"}</p>
                <p className="mt-2 text-sm leading-6 text-muted">
                  {nextAction?.detail ??
                    (item.minimum_payment > 0
                      ? `This debt is pulling ${formatMoney(item.minimum_payment)} out of your free cash before the next reliable income.`
                      : "Add a linked action or paycheck allocation so this debt shows up in the execution queue.")}
                </p>
              </div>

              {goal ? (
                <div className="rounded-[22px] border border-line bg-white/72 p-4">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-muted">Roadmap context</p>
                  <p className="mt-2 text-base font-semibold tracking-tight text-ink">{goal.title}</p>
                  <p className="mt-2 text-sm leading-6 text-muted">{goal.description || "No extra context yet."}</p>
                  <p className="mt-3 text-xs text-muted">{Math.round(goal.progress)}% complete</p>
                </div>
              ) : null}

              {item.notes ? <p className="text-sm leading-6 text-muted">{item.notes}</p> : null}
            </Panel>
          );
        })}
      </section>
    </div>
  );
}
