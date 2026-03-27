"use client";

import { useEffect, useMemo, useState } from "react";
import { useFeedback } from "@/components/feedback-provider";
import { Badge, Button, InlineField, Input, Panel, SectionHeading, Select, StatCard, Textarea } from "@/components/ui";
import { api, type BackendDebt } from "@/lib/api";
import { notifyDecisionChanged, useDecisionSnapshot } from "@/lib/decision";
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

const debtStatusOptions: Array<BackendDebt["status"]> = ["active", "paused", "paid_off"];

type DebtDraft = {
  name: string;
  balance: string;
  minimumPayment: string;
  dueOn: string;
  status: BackendDebt["status"];
  notes: string;
};

function buildDraft(item: BackendDebt): DebtDraft {
  return {
    name: item.name,
    balance: item.balance.toFixed(2),
    minimumPayment: item.minimum_payment.toFixed(2),
    dueOn: item.due_on ?? "",
    status: item.status,
    notes: item.notes ?? "",
  };
}

function DebtCard({
  item,
  nextActionTitle,
  nextActionDetail,
  goal,
  onSave,
}: {
  item: BackendDebt;
  nextActionTitle?: string;
  nextActionDetail?: string;
  goal?: {
    title: string;
    description: string;
    progress: number;
    priority: string;
    metricCurrentValue?: number;
    metricStartValue?: number;
  };
  onSave: (debtId: string, draft: DebtDraft) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [draft, setDraft] = useState<DebtDraft>(() => buildDraft(item));

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
            <Badge>{item.status}</Badge>
            {goal ? <Badge className="border-transparent bg-accent-soft text-accent">{goal.priority}</Badge> : null}
          </div>
          <h2 className="mt-3 text-xl font-semibold tracking-tight">{item.name}</h2>
          <p className="mt-1 text-sm text-muted">{dueLabel(item.due_on)}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted">Balance</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">{formatMoney(item.balance)}</p>
          <Button variant="ghost" className="mt-3 h-9 px-3" onClick={() => setEditing((current) => !current)}>
            {editing ? "Close" : "Edit"}
          </Button>
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
        <p className="mt-2 text-lg font-semibold tracking-tight text-ink">{nextActionTitle ?? "No linked action yet"}</p>
        <p className="mt-2 text-sm leading-6 text-muted">
          {nextActionDetail ??
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

      {editing ? (
        <div className="grid gap-4 rounded-[22px] border border-line bg-white/78 p-4 md:grid-cols-2">
          <InlineField label="Debt name">
            <Input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
          </InlineField>
          <InlineField label="Status">
            <Select value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as BackendDebt["status"] }))}>
              {debtStatusOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </InlineField>
          <InlineField label="Current balance">
            <Input
              inputMode="decimal"
              value={draft.balance}
              onChange={(event) => setDraft((current) => ({ ...current, balance: event.target.value }))}
            />
          </InlineField>
          <InlineField label="Minimum payment">
            <Input
              inputMode="decimal"
              value={draft.minimumPayment}
              onChange={(event) => setDraft((current) => ({ ...current, minimumPayment: event.target.value }))}
            />
          </InlineField>
          <InlineField label="Due date">
            <Input type="date" value={draft.dueOn} onChange={(event) => setDraft((current) => ({ ...current, dueOn: event.target.value }))} />
          </InlineField>
          <div className="md:col-span-2">
            <InlineField label="Notes" helper="Optional">
              <Textarea
                rows={3}
                value={draft.notes}
                onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
                placeholder="Keep only the context that changes what you do next."
              />
            </InlineField>
          </div>
          <div className="flex flex-wrap gap-2 md:col-span-2">
            <Button
              disabled={pending || !draft.name.trim() || !draft.balance.trim()}
              onClick={() =>
                run(async () => {
                  const saved = await onSave(item.id, draft);
                  if (saved) {
                    setEditing(false);
                  }
                })
              }
            >
              Save debt
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

      {item.notes && !editing ? <p className="text-sm leading-6 text-muted">{item.notes}</p> : null}
    </Panel>
  );
}

export default function DebtsPage() {
  const { snapshot, loading, refresh } = useDecisionSnapshot();
  const { pushFeedback } = useFeedback();
  const [debts, setDebts] = useState<BackendDebt[]>([]);

  async function loadDebts() {
    const nextDebts = await api.listDebts();
    setDebts(nextDebts);
  }

  useEffect(() => {
    void loadDebts();
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

  async function sync(task: () => Promise<unknown>, successTitle: string, errorTitle: string) {
    try {
      await task();
      notifyDecisionChanged();
      await Promise.all([loadDebts(), refresh()]);
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

  async function saveDebt(debtId: string, draft: DebtDraft) {
    const balance = Number(draft.balance);
    const minimumPayment = Number(draft.minimumPayment);
    return sync(
      () =>
        api.updateDebt(debtId, {
          name: draft.name.trim(),
          balance: Number.isFinite(balance) ? balance : 0,
          minimum_payment: Number.isFinite(minimumPayment) ? minimumPayment : 0,
          due_on: draft.dueOn || null,
          status: draft.status,
          notes: draft.notes.trim() || null,
        }),
      "Debt saved.",
      "Could not save debt.",
    );
  }

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
            <DebtCard
              key={item.id}
              item={item}
              nextActionTitle={nextAction?.title}
              nextActionDetail={nextAction?.detail}
              goal={goal}
              onSave={saveDebt}
            />
          );
        })}
      </section>
    </div>
  );
}
