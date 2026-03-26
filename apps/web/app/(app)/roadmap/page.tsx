"use client";

import { Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge, Button, InlineField, Input, Panel, SectionHeading, Select, Textarea } from "@/components/ui";
import { api, type BackendDebt, type BackendObligation } from "@/lib/api";
import { notifyDecisionChanged, useDecisionSnapshot } from "@/lib/decision";
import { formatMoney } from "@/lib/finance";
import { getGoalOpenStepCount, getPlanAllocatedAmount, getPlanRemainingAmount } from "@/lib/planning-view";

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
  onCreateStep: (goalId: string, draft: { title: string; dueOn: string }) => Promise<void>;
  onUpdateStep: (stepId: string, patch: { status?: string }) => Promise<void>;
}) {
  const [stepTitle, setStepTitle] = useState("");
  const [stepDueOn, setStepDueOn] = useState("");
  const [pending, setPending] = useState(false);

  async function run(task: () => Promise<void>) {
    setPending(true);
    try {
      await task();
      setStepTitle("");
      setStepDueOn("");
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
  onCreateAllocation: (planId: string, draft: AllocationDraft) => Promise<void>;
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
      await onCreateAllocation(plan.id, draft);
      setDraft(emptyAllocationDraft);
      setShowComposer(false);
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
  const { snapshot, loading, refresh } = useDecisionSnapshot();
  const [debts, setDebts] = useState<BackendDebt[]>([]);
  const [obligations, setObligations] = useState<BackendObligation[]>([]);
  const [goalDraft, setGoalDraft] = useState<GoalDraft>(emptyGoalDraft);
  const [planDraft, setPlanDraft] = useState<PlanDraft>(emptyPlanDraft);
  const [goalComposerOpen, setGoalComposerOpen] = useState(false);
  const [planComposerOpen, setPlanComposerOpen] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    void Promise.all([api.listDebts(), api.listObligations()]).then(([nextDebts, nextObligations]) => {
      setDebts(nextDebts);
      setObligations(nextObligations);
    });
  }, []);

  const linkedEntityOptions = useMemo(
    () => [
      ...obligations.map((item) => ({ value: `obligation:${item.id}`, label: `Obligation: ${item.name}` })),
      ...debts.map((item) => ({ value: `debt:${item.id}`, label: `Debt: ${item.name}` })),
    ],
    [debts, obligations],
  );

  async function sync(task: () => Promise<unknown>) {
    setPending(true);
    try {
      await task();
      notifyDecisionChanged();
      await refresh();
    } finally {
      setPending(false);
    }
  }

  async function createGoal() {
    if (!goalDraft.title.trim()) return;
    await sync(() =>
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
    );
    setGoalDraft(emptyGoalDraft);
    setGoalComposerOpen(false);
  }

  async function createPlan() {
    if (!planDraft.label.trim() || !planDraft.amount) return;
    await sync(() =>
      api.createIncomePlan({
        label: planDraft.label.trim(),
        amount: Number(planDraft.amount),
        expected_on: planDraft.expectedOn || null,
        is_reliable: planDraft.isReliable,
        status: "planned",
        notes: planDraft.notes.trim() || null,
      }),
    );
    setPlanDraft(emptyPlanDraft);
    setPlanComposerOpen(false);
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

      <section className="space-y-3">
        <SectionHeading eyebrow="Paycheck plans" title="Put expected income in order before it lands" description="Each plan should show how the next reliable money gets committed." />
        {snapshot?.roadmap.plans.length ? (
          <div className="space-y-3">
            {snapshot.roadmap.plans.map((plan) => (
              <IncomePlanCard
                key={plan.id}
                plan={plan}
                debts={debts}
                obligations={obligations}
                onCreateAllocation={(planId, draft) =>
                  sync(() =>
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
                  )
                }
              />
            ))}
          </div>
        ) : (
          <Panel className="border-dashed bg-white/56 text-sm text-muted">No paycheck plan yet. Add the next reliable income and break it into explicit moves.</Panel>
        )}
      </section>
      <section className="space-y-3">
        <SectionHeading eyebrow="Goals" title="Active outcomes with real step progress" description="Goals stay here only if they change what you need to do with money next." />
        {snapshot?.roadmap.goals.length ? (
          <div className="space-y-3">
            {snapshot.roadmap.goals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                debts={debts}
                obligations={obligations}
                onGoalUpdate={(goalId, patch) => sync(() => api.updateRoadmapGoal(goalId, patch))}
                onCreateStep={(goalId, draft) =>
                  sync(() =>
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
                  )
                }
                onUpdateStep={(stepId, patch) => sync(() => api.updateRoadmapStep(stepId, patch))}
              />
            ))}
          </div>
        ) : (
          <Panel className="border-dashed bg-white/56 text-sm text-muted">No active goals yet. Add the one financial outcome that should shape your next few payments.</Panel>
        )}
      </section>

    </div>
  );
}
