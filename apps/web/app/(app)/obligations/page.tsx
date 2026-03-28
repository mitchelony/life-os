"use client";

import { useEffect, useMemo, useState } from "react";
import { useFeedback } from "@/components/feedback-provider";
import { Badge, Button, InlineField, Input, Panel, SectionHeading, Select, StatCard, Textarea } from "@/components/ui";
import { api, type BackendObligation } from "@/lib/api";
import { notifyDecisionChanged, useDecisionSnapshot } from "@/lib/decision";
import { describeTrend } from "@/lib/decision-view";
import { compareDateValues, formatDateValue, parseDateValue } from "@/lib/dates";
import { formatMoney } from "@/lib/finance";
import { findLinkedAction } from "@/lib/planning-view";

function dueLabel(value: string) {
  return formatDateValue(value, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function recurrenceLabel(value: string) {
  return value === "one_time" ? "One time" : value.replace("_", " ");
}

function obligationDirection(isPaid: boolean, dueOn: string) {
  if (isPaid) return "Moving forward";
  if (parseDateValue(dueOn).getTime() < Date.now()) return "Moving backward";
  return "Holding steady";
}

const frequencyOptions: Array<BackendObligation["frequency"]> = ["one_time", "weekly", "biweekly", "monthly", "yearly"];

type ObligationDraft = {
  name: string;
  amount: string;
  dueOn: string;
  frequency: BackendObligation["frequency"];
  notes: string;
  isPaid: boolean;
};

function buildDraft(item: BackendObligation): ObligationDraft {
  return {
    name: item.name,
    amount: item.amount.toFixed(2),
    dueOn: item.due_on,
    frequency: item.frequency,
    notes: item.notes ?? "",
    isPaid: item.is_paid,
  };
}

function ObligationCard({
  item,
  nextActionTitle,
  nextActionDetail,
  goal,
  onSave,
  onPaidChange,
}: {
  item: BackendObligation;
  nextActionTitle?: string;
  nextActionDetail?: string;
  goal?: {
    title: string;
    description: string;
    progress: number;
  };
  onSave: (obligationId: string, draft: ObligationDraft) => Promise<boolean>;
  onPaidChange: (obligationId: string, isPaid: boolean) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [draft, setDraft] = useState<ObligationDraft>(() => buildDraft(item));

  useEffect(() => {
    setDraft(buildDraft(item));
  }, [item]);

  async function run(task: () => Promise<void>) {
    setPending(true);
    try {
      await task();
    } finally {
      setPending(false);
    }
  }

  return (
    <Panel className="space-y-4">
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
          <Button variant="ghost" className="mt-3 h-9 px-3" onClick={() => setEditing((current) => !current)}>
            {editing ? "Close" : "Edit"}
          </Button>
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
        <p className="mt-2 text-lg font-semibold tracking-tight text-ink">{nextActionTitle ?? "No linked action yet"}</p>
        <p className="mt-2 text-sm leading-6 text-muted">
          {nextActionDetail ??
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

      {editing ? (
        <div className="grid gap-4 rounded-[22px] border border-line bg-white/78 p-4 md:grid-cols-2">
          <InlineField label="Name">
            <Input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
          </InlineField>
          <InlineField label="Amount">
            <Input
              inputMode="decimal"
              value={draft.amount}
              onChange={(event) => setDraft((current) => ({ ...current, amount: event.target.value }))}
            />
          </InlineField>
          <InlineField label="Due date">
            <Input type="date" value={draft.dueOn} onChange={(event) => setDraft((current) => ({ ...current, dueOn: event.target.value }))} />
          </InlineField>
          <InlineField label="Frequency">
            <Select value={draft.frequency} onChange={(event) => setDraft((current) => ({ ...current, frequency: event.target.value as BackendObligation["frequency"] }))}>
              {frequencyOptions.map((option) => (
                <option key={option} value={option}>
                  {recurrenceLabel(option)}
                </option>
              ))}
            </Select>
          </InlineField>
          <div className="md:col-span-2">
            <InlineField label="Notes" helper="Optional">
              <Textarea
                rows={3}
                value={draft.notes}
                onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
                placeholder="Add context that helps you decide what to do when this comes due."
              />
            </InlineField>
          </div>
          <div className="flex flex-wrap gap-2 md:col-span-2">
            <Button
              disabled={pending || !draft.name.trim() || !draft.amount.trim() || !draft.dueOn}
              onClick={() =>
                run(async () => {
                  const saved = await onSave(item.id, draft);
                  if (saved) {
                    setEditing(false);
                  }
                })
              }
            >
              Save obligation
            </Button>
            <Button
              variant="ghost"
              disabled={pending}
              onClick={() => {
                setDraft(buildDraft(item));
                setEditing(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button disabled={pending} onClick={() => run(() => onPaidChange(item.id, !item.is_paid))}>
          {item.is_paid ? "Reopen bill" : "Mark paid"}
        </Button>
        <Button variant="ghost" disabled={pending} onClick={() => setEditing(true)}>
          Edit details
        </Button>
      </div>

      {item.notes && !editing ? <p className="text-sm leading-6 text-muted">{item.notes}</p> : null}
    </Panel>
  );
}

export default function ObligationsPage() {
  const { snapshot, loading, refresh } = useDecisionSnapshot();
  const { pushFeedback } = useFeedback();
  const [obligations, setObligations] = useState<BackendObligation[]>([]);

  async function refreshObligations() {
    const nextObligations = await api.listObligations();
    setObligations(nextObligations);
  }

  useEffect(() => {
    void refreshObligations();
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
  const sortedObligations = useMemo(
    () =>
      [...obligations].sort((left, right) => {
        if (left.is_paid !== right.is_paid) {
          return left.is_paid ? 1 : -1;
        }
        const dueDateComparison = compareDateValues(left.due_on, right.due_on);
        if (dueDateComparison !== 0) return dueDateComparison;
        return left.name.localeCompare(right.name);
      }),
    [obligations],
  );

  async function sync(task: () => Promise<unknown>, successTitle: string, errorTitle: string) {
    try {
      await task();
      notifyDecisionChanged();
      await Promise.all([refreshObligations(), refresh()]);
      pushFeedback({ tone: "success", title: successTitle });
      return true;
    } catch (error) {
      pushFeedback({
        tone: "error",
        title: errorTitle,
        description: error instanceof Error ? error.message : "Try again.",
      });
      return false;
    }
  }

  async function saveObligation(obligationId: string, draft: ObligationDraft) {
    const amount = Number(draft.amount);
    return sync(
      () =>
        api.updateObligation(obligationId, {
          name: draft.name.trim(),
          amount: Number.isFinite(amount) ? amount : 0,
          due_on: draft.dueOn,
          frequency: draft.frequency,
          is_paid: draft.isPaid,
          is_recurring: draft.frequency !== "one_time",
          notes: draft.notes.trim() || null,
        }),
      "Obligation saved.",
      "Could not save obligation.",
    );
  }

  async function updatePaidState(obligationId: string, isPaid: boolean) {
    await sync(
      () => api.updateObligation(obligationId, { is_paid: isPaid }),
      isPaid ? "Obligation marked paid." : "Obligation reopened.",
      "Could not update obligation.",
    );
  }

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
        {sortedObligations.map((item) => {
          const nextAction = findLinkedAction(snapshot?.orderedActionQueue ?? [], "obligation", item.id);
          const goal = obligationGoals.get(item.id);

          return (
            <ObligationCard
              key={item.id}
              item={item}
              nextActionTitle={nextAction?.title}
              nextActionDetail={nextAction?.detail}
              goal={goal}
              onSave={saveObligation}
              onPaidChange={updatePaidState}
            />
          );
        })}
      </section>
    </div>
  );
}
