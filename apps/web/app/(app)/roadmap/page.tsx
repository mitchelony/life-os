"use client";

import { Plus, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useFeedback } from "@/components/feedback-provider";
import { RoadmapCopilotPanel } from "@/components/roadmap-copilot-panel";
import { Badge, Button, InlineField, Input, Panel, SectionHeading, Select, Textarea } from "@/components/ui";
import { api, type BackendDebt, type BackendObligation, type BackendSetupPayload } from "@/lib/api";
import { notifyDecisionChanged, useDecisionSnapshot } from "@/lib/decision";
import { formatMoney } from "@/lib/finance";
import { parseStrategyDocument } from "@/lib/local-state";
import { getGoalOpenStepCount, getGoalSections, getPlanAllocatedAmount, getPlanRemainingAmount } from "@/lib/planning-view";

const goalStatusOptions = ["active", "planned", "blocked", "completed"];
const goalPriorityOptions = ["low", "medium", "high", "critical"];
const stepStatusOptions = ["todo", "in_progress", "blocked", "done"];
const allocationTypeOptions = ["obligation_payment", "debt_payment", "buffer", "essentials", "manual"];

type GoalDraft = {
  title: string;
  description: string;
  priority: string;
  targetDate: string;
  linkedType: string;
  linkedId: string;
};

type PlanDraft = {
  label: string;
  amount: string;
  expectedOn: string;
  isReliable: boolean;
  notes: string;
};

type AllocationDraft = {
  label: string;
  amount: string;
  allocationType: string;
  linkedType: string;
  linkedId: string;
};

const emptyGoalDraft: GoalDraft = {
  title: "",
  description: "",
  priority: "high",
  targetDate: "",
  linkedType: "",
  linkedId: "",
};

const emptyPlanDraft: PlanDraft = {
  label: "",
  amount: "",
  expectedOn: "",
  isReliable: true,
  notes: "",
};

const emptyAllocationDraft: AllocationDraft = {
  label: "",
  amount: "",
  allocationType: "manual",
  linkedType: "",
  linkedId: "",
};

function shortDate(value?: string) {
  if (!value) return "No date";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function linkedEntityLabel(
  linkedType: string | undefined,
  linkedId: string | undefined,
  debts: BackendDebt[],
  obligations: BackendObligation[],
) {
  if (!linkedType || !linkedId) return "Not linked";
  if (linkedType === "debt") return debts.find((item) => item.id === linkedId)?.name ?? "Linked debt";
  if (linkedType === "obligation") return obligations.find((item) => item.id === linkedId)?.name ?? "Linked obligation";
  return "Linked item";
}

function GoalCard({
  goal,
  debts,
  obligations,
  onGoalUpdate,
  onCreateStep,
  onUpdateStep,
}: {
  goal: NonNullable<ReturnType<typeof useDecisionSnapshot>["snapshot"]>["roadmap"]["goals"][number];
  debts: BackendDebt[];
  obligations: BackendObligation[];
  onGoalUpdate: (goalId: string, patch: { status?: string; priority?: string }) => Promise<void>;
  onCreateStep: (goalId: string, draft: { title: string; dueOn: string }) => Promise<boolean>;
  onUpdateStep: (stepId: string, patch: { status?: string }) => Promise<void>;
}) {
  const [stepTitle, setStepTitle] = useState("");
  const [stepDueOn, setStepDueOn] = useState("");
  const [pending, setPending] = useState(false);

  async function run(task: () => Promise<void>) {
    setPending(true);
    try {
      await task();
    } finally {
      setPending(false);
    }
  }

  return (
    <Panel className="space-y-4 bg-white/74">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{goal.status}</Badge>
            <Badge className="border-transparent bg-accent-soft text-accent">{goal.priority}</Badge>
            {goal.linkedType ? <Badge>{linkedEntityLabel(goal.linkedType, goal.linkedId, debts, obligations)}</Badge> : null}
          </div>
          <h2 className="mt-3 text-xl font-semibold tracking-tight text-ink">{goal.title}</h2>
          {goal.description ? <p className="mt-2 text-sm leading-6 text-muted">{goal.description}</p> : null}
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted">Progress</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">{Math.round(goal.progress)}%</p>
          <p className="mt-1 text-xs text-muted">{getGoalOpenStepCount(goal)} open steps</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <InlineField label="Status">
          <Select value={goal.status} onChange={(event) => void onGoalUpdate(goal.id, { status: event.target.value })}>
            {goalStatusOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        </InlineField>
        <InlineField label="Priority">
          <Select value={goal.priority} onChange={(event) => void onGoalUpdate(goal.id, { priority: event.target.value })}>
            {goalPriorityOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        </InlineField>
        <Panel className="bg-[rgba(244,241,233,0.9)]">
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted">Target</p>
          <p className="mt-2 text-lg font-semibold tracking-tight">{shortDate(goal.targetDate)}</p>
        </Panel>
      </div>

      <div className="space-y-2">
        {goal.steps.length ? (
          goal.steps.map((step) => (
            <div key={step.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-line bg-white/90 p-3">
              <div>
                <p className="text-sm font-medium text-ink">{step.title}</p>
                <p className="mt-1 text-xs text-muted">{step.detail ?? shortDate(step.dueOn)}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge>{step.status}</Badge>
                <Select
                  className="min-w-[9rem]"
                  value={step.status}
                  onChange={(event) => void onUpdateStep(step.id, { status: event.target.value })}
                >
                  {stepStatusOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-[18px] border border-dashed border-line bg-white/56 p-3 text-sm text-muted">No steps yet. Add the smallest next move.</div>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_11rem_9rem]">
        <InlineField label="New step">
          <Input value={stepTitle} onChange={(event) => setStepTitle(event.target.value)} placeholder="Call, pay, confirm, or file" />
        </InlineField>
        <InlineField label="Due date">
          <Input type="date" value={stepDueOn} onChange={(event) => setStepDueOn(event.target.value)} />
        </InlineField>
        <div className="flex items-end">
          <Button
            className="w-full"
            disabled={pending || !stepTitle.trim()}
            onClick={() =>
              void run(() =>
                onCreateStep(goal.id, {
                  title: stepTitle.trim(),
                  dueOn: stepDueOn,
                }).then((created) => {
                  if (created) {
                    setStepTitle("");
                    setStepDueOn("");
                  }
                }),
              )
            }
          >
            <Plus className="h-4 w-4" />
            Add step
          </Button>
        </div>
      </div>
    </Panel>
  );
}

function IncomePlanCard({
  plan,
  debts,
  obligations,
  onCreateAllocation,
}: {
  plan: NonNullable<ReturnType<typeof useDecisionSnapshot>["snapshot"]>["roadmap"]["plans"][number];
  debts: BackendDebt[];
  obligations: BackendObligation[];
  onCreateAllocation: (planId: string, draft: AllocationDraft) => Promise<boolean>;
}) {
  const [showComposer, setShowComposer] = useState(false);
  const [pending, setPending] = useState(false);
  const [draft, setDraft] = useState<AllocationDraft>(emptyAllocationDraft);

  const allocated = getPlanAllocatedAmount(plan);
  const remaining = getPlanRemainingAmount(plan);

  async function createAllocation() {
    if (!draft.label.trim() || !draft.amount) return;
    setPending(true);
    try {
      const created = await onCreateAllocation(plan.id, draft);
      if (created) {
        setDraft(emptyAllocationDraft);
        setShowComposer(false);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <Panel className="space-y-4 bg-white/74">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={plan.isReliable ? "border-transparent bg-accent-soft text-accent" : undefined}>
              {plan.isReliable ? "reliable" : "tentative"}
            </Badge>
            <Badge>{plan.status}</Badge>
          </div>
          <h2 className="mt-3 text-xl font-semibold tracking-tight text-ink">{plan.label}</h2>
          <p className="mt-1 text-sm text-muted">{shortDate(plan.expectedOn)}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted">Plan amount</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">{formatMoney(plan.amount)}</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Panel className="bg-[rgba(244,241,233,0.9)]">
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted">Allocated</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{formatMoney(allocated)}</p>
        </Panel>
        <Panel className="bg-[rgba(244,241,233,0.9)]">
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted">Still free</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{formatMoney(remaining)}</p>
        </Panel>
        <div className="flex items-end">
          <Button variant="secondary" className="w-full" onClick={() => setShowComposer((current) => !current)}>
            <Plus className="h-4 w-4" />
            {showComposer ? "Close" : "Add allocation"}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {plan.allocations.length ? (
          plan.allocations.map((allocation) => (
            <div key={allocation.id} className="flex items-start justify-between gap-3 rounded-[18px] border border-line bg-white/90 p-3">
              <div>
                <p className="text-sm font-medium text-ink">{allocation.label}</p>
                <p className="mt-1 text-xs text-muted">
                  {allocation.allocationType.replaceAll("_", " ")}
                  {allocation.linkedType
                    ? ` · ${linkedEntityLabel(allocation.linkedType, allocation.linkedId, debts, obligations)}`
                    : ""}
                </p>
              </div>
              <p className="text-sm font-semibold tabular-nums text-ink">{formatMoney(allocation.amount)}</p>
            </div>
          ))
        ) : (
          <div className="rounded-[18px] border border-dashed border-line bg-white/56 p-3 text-sm text-muted">No allocations yet. Break the paycheck into explicit moves.</div>
        )}
      </div>

      {showComposer ? (
        <div className="grid gap-3 md:grid-cols-2">
          <InlineField label="Label">
            <Input value={draft.label} onChange={(event) => setDraft((current) => ({ ...current, label: event.target.value }))} placeholder="Utilities catch-up payment" />
          </InlineField>
          <InlineField label="Amount">
            <Input value={draft.amount} onChange={(event) => setDraft((current) => ({ ...current, amount: event.target.value }))} placeholder="0.00" inputMode="decimal" />
          </InlineField>
          <InlineField label="Type">
            <Select value={draft.allocationType} onChange={(event) => setDraft((current) => ({ ...current, allocationType: event.target.value }))}>
              {allocationTypeOptions.map((option) => (
                <option key={option} value={option}>
                  {option.replaceAll("_", " ")}
                </option>
              ))}
            </Select>
          </InlineField>
          <InlineField label="Link">
            <Select
              value={draft.linkedType && draft.linkedId ? `${draft.linkedType}:${draft.linkedId}` : ""}
              onChange={(event) => {
                const [linkedType, linkedId] = event.target.value.split(":");
                setDraft((current) => ({
                  ...current,
                  linkedType: linkedType || "",
                  linkedId: linkedId || "",
                }));
              }}
            >
              <option value="">No link</option>
              {obligations.map((item) => (
                <option key={item.id} value={`obligation:${item.id}`}>
                  Obligation: {item.name}
                </option>
              ))}
              {debts.map((item) => (
                <option key={item.id} value={`debt:${item.id}`}>
                  Debt: {item.name}
                </option>
              ))}
            </Select>
          </InlineField>
          <div className="md:col-span-2">
            <Button disabled={pending || !draft.label.trim() || !draft.amount} onClick={() => void createAllocation()}>
              Save allocation
            </Button>
          </div>
        </div>
      ) : null}
    </Panel>
  );
}

export default function RoadmapPage() {
  const { pushFeedback } = useFeedback();
  const { snapshot, loading, refresh } = useDecisionSnapshot();
  const [debts, setDebts] = useState<BackendDebt[]>([]);
  const [obligations, setObligations] = useState<BackendObligation[]>([]);
  const [setupPayload, setSetupPayload] = useState<BackendSetupPayload | null>(null);
  const [mode, setMode] = useState<"focus" | "goals" | "strategy">("focus");
  const [goalDraft, setGoalDraft] = useState<GoalDraft>(emptyGoalDraft);
  const [planDraft, setPlanDraft] = useState<PlanDraft>(emptyPlanDraft);
  const [strategyRaw, setStrategyRaw] = useState("");
  const [strategyError, setStrategyError] = useState<string | null>(null);
  const [strategyFeedback, setStrategyFeedback] = useState<string | null>(null);
  const [goalComposerOpen, setGoalComposerOpen] = useState(false);
  const [planComposerOpen, setPlanComposerOpen] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    void Promise.all([api.listDebts(), api.listObligations(), api.getSetup()]).then(([nextDebts, nextObligations, nextSetup]) => {
      setDebts(nextDebts);
      setObligations(nextObligations);
      setSetupPayload(nextSetup);
      setStrategyRaw(nextSetup.strategy_document ? JSON.stringify(nextSetup.strategy_document, null, 2) : "");
    });
  }, []);

  const linkedEntityOptions = useMemo(
    () => [
      ...obligations.map((item) => ({ value: `obligation:${item.id}`, label: `Obligation: ${item.name}` })),
      ...debts.map((item) => ({ value: `debt:${item.id}`, label: `Debt: ${item.name}` })),
    ],
    [debts, obligations],
  );
  const goalSections = useMemo(() => getGoalSections(snapshot?.roadmap.goals ?? []), [snapshot?.roadmap.goals]);

  async function sync(task: () => Promise<unknown>, successTitle: string, errorTitle: string) {
    setPending(true);
    try {
      await task();
      notifyDecisionChanged();
      await refresh();
      pushFeedback({ tone: "success", title: successTitle });
      return true;
    } catch (error) {
      pushFeedback({
        tone: "error",
        title: errorTitle,
        description: error instanceof Error ? error.message : "Try again in a moment.",
      });
      return false;
    } finally {
      setPending(false);
    }
  }

  async function createGoal() {
    if (!goalDraft.title.trim()) return;
    const created = await sync(
      () =>
        api.createRoadmapGoal({
          title: goalDraft.title.trim(),
          description: goalDraft.description.trim(),
          status: "active",
          priority: goalDraft.priority,
          target_date: goalDraft.targetDate || null,
          linked_type: goalDraft.linkedType || null,
          linked_id: goalDraft.linkedId || null,
          metric_kind: null,
          metric_start_value: null,
          metric_current_value: null,
          metric_target_value: null,
        }),
      "Goal added.",
      "Could not add goal.",
    );
    if (created) {
      setGoalDraft(emptyGoalDraft);
      setGoalComposerOpen(false);
    }
  }

  async function createPlan() {
    if (!planDraft.label.trim() || !planDraft.amount) return;
    const created = await sync(
      () =>
        api.createIncomePlan({
          label: planDraft.label.trim(),
          amount: Number(planDraft.amount),
          expected_on: planDraft.expectedOn || null,
          is_reliable: planDraft.isReliable,
          status: "planned",
          notes: planDraft.notes.trim() || null,
        }),
      "Paycheck plan added.",
      "Could not add paycheck plan.",
    );
    if (created) {
      setPlanDraft(emptyPlanDraft);
      setPlanComposerOpen(false);
    }
  }

  async function handleStrategySave() {
    if (!setupPayload) return;
    setPending(true);
    setStrategyError(null);
    setStrategyFeedback(null);

    try {
      let nextDocument: Record<string, unknown> | null = null;
      if (strategyRaw.trim()) {
        const parsed = parseStrategyDocument(strategyRaw);
        if (!parsed.document) {
          setStrategyError(parsed.errors[0] ?? "Strategy JSON is invalid.");
          return;
        }
        nextDocument = parsed.document as Record<string, unknown>;
      }

      const nextSetup = { ...setupPayload, strategy_document: nextDocument };
      await api.saveSetup(nextSetup);
      setSetupPayload(nextSetup);
      setStrategyFeedback(nextDocument ? "Strategy JSON saved." : "Strategy JSON cleared.");
      notifyDecisionChanged();
      await refresh();
      pushFeedback({
        tone: "success",
        title: nextDocument ? "Strategy saved." : "Strategy cleared.",
      });
    } catch (error) {
      pushFeedback({
        tone: "error",
        title: "Could not save strategy.",
        description: error instanceof Error ? error.message : "Try again in a moment.",
      });
    } finally {
      setPending(false);
    }
  }

  if (loading && !snapshot) {
    return (
      <div className="space-y-4 pb-24 md:space-y-6 md:pb-6">
        <Panel>
          <SectionHeading eyebrow="Roadmap" title="Loading your plan" description="Pulling the current focus, paycheck flow, and goal progress." />
        </Panel>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1180px] space-y-4 pb-24 md:space-y-6 md:pb-6">
      <Panel className="overflow-hidden bg-[linear-gradient(135deg,rgba(15,28,22,0.97),rgba(64,105,89,0.94))] text-bg">
        <SectionHeading
          eyebrow="Roadmap"
          title={snapshot?.focus.primaryAction?.title ?? "Set the next paycheck in order"}
          description={snapshot?.focus.whyNow ?? "Roadmap should answer what gets paid first, what happens after that, and what goal is actually active."}
          tone="inverse"
          action={
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" disabled={pending} onClick={() => setGoalComposerOpen((current) => !current)}>
                <Plus className="h-4 w-4" />
                {goalComposerOpen ? "Close goal" : "Add goal"}
              </Button>
              <Button
                variant="ghost"
                className="border-white/18 bg-white/10 text-white hover:bg-white/16"
                disabled={pending}
                onClick={() => setPlanComposerOpen((current) => !current)}
              >
                <Plus className="h-4 w-4" />
                {planComposerOpen ? "Close plan" : "Add paycheck plan"}
              </Button>
            </div>
          }
        />

        <div className="mt-5 flex flex-wrap gap-2">
          {[
            { key: "focus" as const, label: "Focus" },
            { key: "goals" as const, label: "Goals" },
            { key: "strategy" as const, label: "Strategy" },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setMode(item.key)}
              className={
                item.key === mode
                  ? "rounded-full bg-white px-4 py-2 text-sm font-medium text-ink"
                  : "rounded-full border border-white/16 bg-white/8 px-4 py-2 text-sm font-medium text-white"
              }
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <Panel className="bg-white/10 text-white">
            <p className="text-[10px] uppercase tracking-[0.22em] text-white/65">Focus</p>
            <p className="mt-2 text-lg font-semibold tracking-tight">{snapshot?.focus.primaryAction?.title ?? "No focus yet"}</p>
          </Panel>
          <Panel className="bg-white/10 text-white">
            <p className="text-[10px] uppercase tracking-[0.22em] text-white/65">Goals</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">{snapshot?.roadmap.goals.length ?? 0}</p>
          </Panel>
          <Panel className="bg-white/10 text-white">
            <p className="text-[10px] uppercase tracking-[0.22em] text-white/65">Paycheck plans</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">{snapshot?.roadmap.plans.length ?? 0}</p>
          </Panel>
          <Panel className="bg-white/10 text-white">
            <p className="text-[10px] uppercase tracking-[0.22em] text-white/65">Free after plan</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">{formatMoney(snapshot?.freeAfterPlannedIncome.amount ?? 0)}</p>
          </Panel>
        </div>

        {goalComposerOpen ? (
          <div className="mt-5 grid gap-3 rounded-[24px] border border-white/10 bg-white/10 p-4 md:grid-cols-2">
            <InlineField label="Goal title" tone="inverse">
              <Input value={goalDraft.title} onChange={(event) => setGoalDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Get utilities current and stop the slide" />
            </InlineField>
            <InlineField label="Target date" tone="inverse">
              <Input type="date" value={goalDraft.targetDate} onChange={(event) => setGoalDraft((current) => ({ ...current, targetDate: event.target.value }))} />
            </InlineField>
            <InlineField label="Description" tone="inverse">
              <Textarea rows={3} value={goalDraft.description} onChange={(event) => setGoalDraft((current) => ({ ...current, description: event.target.value }))} placeholder="State the outcome in plain language." />
            </InlineField>
            <div className="grid gap-3">
              <InlineField label="Priority" tone="inverse">
                <Select value={goalDraft.priority} onChange={(event) => setGoalDraft((current) => ({ ...current, priority: event.target.value }))}>
                  {goalPriorityOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Select>
              </InlineField>
              <InlineField label="Link" tone="inverse">
                <Select
                  value={goalDraft.linkedType && goalDraft.linkedId ? `${goalDraft.linkedType}:${goalDraft.linkedId}` : ""}
                  onChange={(event) => {
                    const [linkedType, linkedId] = event.target.value.split(":");
                    setGoalDraft((current) => ({
                      ...current,
                      linkedType: linkedType || "",
                      linkedId: linkedId || "",
                    }));
                  }}
                >
                  <option value="">No link</option>
                  {linkedEntityOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </InlineField>
            </div>
            <div className="md:col-span-2">
              <Button disabled={pending || !goalDraft.title.trim()} onClick={() => void createGoal()}>
                Save goal
              </Button>
            </div>
          </div>
        ) : null}

        {planComposerOpen ? (
          <div className="mt-5 grid gap-3 rounded-[24px] border border-white/10 bg-white/10 p-4 md:grid-cols-2">
            <InlineField label="Plan label" tone="inverse">
              <Input value={planDraft.label} onChange={(event) => setPlanDraft((current) => ({ ...current, label: event.target.value }))} placeholder="When the next paycheck lands" />
            </InlineField>
            <InlineField label="Amount" tone="inverse">
              <Input value={planDraft.amount} onChange={(event) => setPlanDraft((current) => ({ ...current, amount: event.target.value }))} placeholder="0.00" inputMode="decimal" />
            </InlineField>
            <InlineField label="Expected on" tone="inverse">
              <Input type="date" value={planDraft.expectedOn} onChange={(event) => setPlanDraft((current) => ({ ...current, expectedOn: event.target.value }))} />
            </InlineField>
            <InlineField label="Reliability" tone="inverse">
              <Select
                value={planDraft.isReliable ? "reliable" : "tentative"}
                onChange={(event) => setPlanDraft((current) => ({ ...current, isReliable: event.target.value === "reliable" }))}
              >
                <option value="reliable">Reliable</option>
                <option value="tentative">Tentative</option>
              </Select>
            </InlineField>
            <InlineField label="Notes" helper="Optional" tone="inverse">
              <Textarea rows={3} value={planDraft.notes} onChange={(event) => setPlanDraft((current) => ({ ...current, notes: event.target.value }))} placeholder="Keep the intent clear." />
            </InlineField>
            <div className="md:col-span-2">
              <Button disabled={pending || !planDraft.label.trim() || !planDraft.amount} onClick={() => void createPlan()}>
                Save paycheck plan
              </Button>
            </div>
          </div>
        ) : null}
      </Panel>

      {mode === "focus" ? (
        <>
          <RoadmapCopilotPanel
            onPlanningChanged={async () => {
              notifyDecisionChanged();
              await refresh();
            }}
          />

          <section className="space-y-3">
            <SectionHeading
              eyebrow="Paycheck plans"
              title="Put expected income in order before it lands"
              description="Each plan should show how the next reliable money gets committed."
            />
            {snapshot?.roadmap.plans.length ? (
              <div className="space-y-3">
                {snapshot.roadmap.plans.map((plan) => (
                  <IncomePlanCard
                    key={plan.id}
                    plan={plan}
                    debts={debts}
                    obligations={obligations}
                    onCreateAllocation={(planId, draft) =>
                      sync(
                        () =>
                          api.createIncomePlanAllocation({
                            income_plan_id: planId,
                            label: draft.label.trim(),
                            allocation_type: draft.allocationType,
                            amount: Number(draft.amount),
                            sort_order: plan.allocations.length,
                            linked_type: draft.linkedType || null,
                            linked_id: draft.linkedId || null,
                            notes: null,
                          }),
                        "Allocation added.",
                        "Could not add allocation.",
                      )
                    }
                  />
                ))}
              </div>
            ) : (
              <Panel className="border-dashed bg-white/56 text-sm text-muted">
                No paycheck plan yet. Add the next reliable income and break it into explicit moves.
              </Panel>
            )}
          </section>
        </>
      ) : null}

      {mode === "goals" ? (
        <section className="space-y-4">
          <SectionHeading
            eyebrow="Goals"
            title="Active outcomes with real step progress"
            description="Goals stay here only if they change what you need to do with money next."
          />
          {goalSections.length ? (
            goalSections.map((section) => (
              <section key={section.key} className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.24em] text-muted">{section.key}</p>
                    <p className="mt-1 text-sm text-muted">
                      {section.key === "active"
                        ? "The goals shaping current payment order."
                        : section.key === "planned"
                          ? "Outcomes queued behind live pressure."
                          : "Completed goals kept out of the main execution path."}
                    </p>
                  </div>
                  <Badge>{section.goals.length}</Badge>
                </div>
                <div className="space-y-3">
                  {section.goals.map((goal) => (
                    <GoalCard
                      key={goal.id}
                      goal={goal}
                      debts={debts}
                      obligations={obligations}
                      onGoalUpdate={async (goalId, patch) => {
                        await sync(() => api.updateRoadmapGoal(goalId, patch), "Goal updated.", "Could not update goal.");
                      }}
                      onCreateStep={(goalId, draft) =>
                        sync(
                          () =>
                            api.createRoadmapStep({
                              goal_id: goalId,
                              title: draft.title,
                              status: "todo",
                              due_on: draft.dueOn || null,
                              sort_order: goal.steps.length,
                              linked_type: null,
                              linked_id: null,
                              notes: null,
                            }),
                          "Step added.",
                          "Could not add step.",
                        )
                      }
                      onUpdateStep={async (stepId, patch) => {
                        await sync(() => api.updateRoadmapStep(stepId, patch), "Step updated.", "Could not update step.");
                      }}
                    />
                  ))}
                </div>
              </section>
            ))
          ) : (
            <Panel className="border-dashed bg-white/56 text-sm text-muted">
              No active goals yet. Add the one financial outcome that should shape your next few payments.
            </Panel>
          )}
        </section>
      ) : null}

      {mode === "strategy" ? (
        <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <Panel className="space-y-4">
            <SectionHeading
              eyebrow="Strategy JSON"
              title="Keep the strategy document close to the roadmap"
              description="This is advisory planning input, not ledger truth. Save only when the JSON is valid."
              action={
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="ghost"
                    disabled={pending}
                    onClick={() => setStrategyRaw(setupPayload?.strategy_document ? JSON.stringify(setupPayload.strategy_document, null, 2) : "")}
                  >
                    <RefreshCw className="h-4 w-4" />
                    Reload
                  </Button>
                  <Button disabled={pending} onClick={() => void handleStrategySave()}>
                    {pending ? "Saving..." : "Save strategy JSON"}
                  </Button>
                </div>
              }
            />
            <Textarea
              rows={22}
              value={strategyRaw}
              onChange={(event) => {
                setStrategyFeedback(null);
                setStrategyError(null);
                setStrategyRaw(event.target.value);
              }}
              placeholder='Paste or edit strategy JSON. Leave blank to clear it.'
              className="font-mono text-xs leading-6"
            />
            {strategyError ? (
              <div className="rounded-[18px] border border-[rgba(165,57,42,0.2)] bg-[rgba(165,57,42,0.06)] px-4 py-3 text-sm text-ink">
                {strategyError}
              </div>
            ) : null}
            {strategyFeedback ? (
              <div className="rounded-[18px] border border-[rgba(61,111,94,0.18)] bg-[rgba(61,111,94,0.08)] px-4 py-3 text-sm text-ink">
                {strategyFeedback}
              </div>
            ) : null}
          </Panel>

          <Panel className="space-y-4">
            <SectionHeading
              eyebrow="Why keep it here"
              title="Strategy should stay visible while you plan"
              description="The roadmap uses this as advisory input when you want a structured planning layer without mutating money history."
            />
            <div className="grid gap-3">
              <div className="rounded-[22px] border border-line bg-[rgba(255,255,255,0.62)] p-4">
                <p className="text-[10px] uppercase tracking-[0.22em] text-muted">Active goals</p>
                <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">{snapshot?.roadmap.goals.length ?? 0}</p>
              </div>
              <div className="rounded-[22px] border border-line bg-[rgba(255,255,255,0.62)] p-4">
                <p className="text-[10px] uppercase tracking-[0.22em] text-muted">Paycheck plans</p>
                <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">{snapshot?.roadmap.plans.length ?? 0}</p>
              </div>
              <div className="rounded-[22px] border border-line bg-[rgba(255,255,255,0.62)] p-4">
                <p className="text-[10px] uppercase tracking-[0.22em] text-muted">Current focus</p>
                <p className="mt-2 text-base font-semibold tracking-tight text-ink">{snapshot?.focus.primaryAction?.title ?? "No focus yet"}</p>
                <p className="mt-2 text-sm leading-6 text-muted">{snapshot?.focus.whyNow ?? "No advisory context loaded yet."}</p>
              </div>
            </div>
          </Panel>
        </div>
      ) : null}

    </div>
  );
}
