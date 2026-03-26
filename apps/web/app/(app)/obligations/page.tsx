"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Panel, SectionHeading, StatCard } from "@/components/ui";
import { api, type BackendObligation } from "@/lib/api";
import { useDecisionSnapshot } from "@/lib/decision";
import { describeTrend } from "@/lib/decision-view";
import { formatMoney } from "@/lib/finance";
import { findLinkedAction } from "@/lib/planning-view";

function dueLabel(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function recurrenceLabel(value: string) {
  return value === "one_time" ? "One time" : value.replace("_", " ");
}

function obligationDirection(isPaid: boolean, dueOn: string) {
  if (isPaid) return "Moving forward";
  if (new Date(dueOn).getTime() < Date.now()) return "Moving backward";
  return "Holding steady";
}

export default function ObligationsPage() {
  const { snapshot, loading } = useDecisionSnapshot();
  const [obligations, setObligations] = useState<BackendObligation[]>([]);

  useEffect(() => {
    void api.listObligations().then(setObligations);
  }, []);

  const obligationGoals = useMemo(
    () =>
      new Map(
        (snapshot?.roadmap.goals ?? [])
          .filter((goal) => goal.linkedType === "obligation" && goal.linkedId)
          .map((goal) => [goal.linkedId as string, goal]),
      ),
    [snapshot?.roadmap.goals],
  );

  if (loading && !snapshot && obligations.length === 0) {
    return (
      <div className="space-y-4 pb-24 md:space-y-6 md:pb-6">
        <Panel>
          <SectionHeading eyebrow="Obligations" title="Loading bill pressure" description="Pulling what is due, what is overdue, and what gets paid first." />
        </Panel>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24 md:space-y-6 md:pb-6">
      <Panel>
        <SectionHeading
          eyebrow="Obligations"
          title="Bills and required payments in the same flow as the roadmap"
          description="These are not just reminders. They should explain current pressure and the next move."
        />
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <StatCard label="Overdue count" value={String(snapshot?.progress.overdueCount ?? 0)} />
          <StatCard label="7 day direction" value={describeTrend(snapshot?.progress.sevenDay.direction ?? "steady")} />
          <StatCard label="Free now" value={formatMoney(snapshot?.freeNow.amount ?? 0)} />
        </div>
      </Panel>

      <section className="grid gap-4 lg:grid-cols-2">
        {obligations.map((item) => {
          const nextAction = findLinkedAction(snapshot?.orderedActionQueue ?? [], "obligation", item.id);
          const goal = obligationGoals.get(item.id);

          return (
            <Panel key={item.id} className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge>{recurrenceLabel(item.frequency)}</Badge>
                    <Badge className={item.is_paid ? "border-transparent bg-accent-soft text-accent" : undefined}>
                      {item.is_paid ? "paid" : "open"}
                    </Badge>
                  </div>
                  <h2 className="mt-3 text-xl font-semibold tracking-tight">{item.name}</h2>
                  <p className="mt-1 text-sm text-muted">{dueLabel(item.due_on)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-muted">Amount</p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">{formatMoney(item.amount)}</p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <StatCard label="Direction" value={obligationDirection(item.is_paid, item.due_on)} detail={goal?.title ?? "Link a roadmap goal to track this bill."} />
                <StatCard
                  label="Pressure"
                  value={item.is_paid ? "Handled" : "Required"}
                  detail={item.is_paid ? "Already resolved." : `${formatMoney(item.amount)} is tied up before you can call the rest of the money free.`}
                />
              </div>

              <div className="rounded-[22px] border border-line bg-[rgba(244,241,233,0.84)] p-4">
                <p className="text-[10px] uppercase tracking-[0.22em] text-muted">Next recommended action</p>
                <p className="mt-2 text-lg font-semibold tracking-tight text-ink">{nextAction?.title ?? "No linked action yet"}</p>
                <p className="mt-2 text-sm leading-6 text-muted">
                  {nextAction?.detail ??
                    (item.is_paid
                      ? "This obligation is already handled."
                      : "Create a linked action or paycheck allocation so this bill takes its place in the execution queue.")}
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
