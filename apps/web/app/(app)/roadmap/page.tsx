"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Button, cn, InlineField, Input, Panel, SectionHeading, Select, StatCard, Textarea } from "@/components/ui";
import { formatMoney } from "@/lib/finance";
import {
  buildDashboardFromSetup,
  createEmptyStoredLifeOsSetup,
  saveStrategyToSetup,
  useStoredLifeOsSetup,
} from "@/lib/local-state";
import type { RoadmapCategory, RoadmapItem, RoadmapPriority, RoadmapStatus, RoadmapStep } from "@/lib/types";

const strategyTemplate = JSON.stringify(
  {
    version: 1,
    name: "Debt reset plan",
    summary: "Stabilize cash flow, protect essentials, and reduce high-interest debt first.",
    effectiveDate: "2026-03-23",
    currency: "USD",
    planningHorizonDays: 30,
    goals: [
      {
        id: "goal-credit-card-reset",
        title: "Bring Capital One under control",
        category: "finances",
        status: "active",
        priority: "critical",
        targetDate: "2026-05-15",
        notes: "Protect minimums first, then push extra cash here.",
      },
    ],
    incomePlan: {
      allocations: [
        { id: "alloc-buffer", label: "Protected buffer", type: "fixed", value: 100, priority: 1 },
        { id: "alloc-rent", label: "Rent reserve", type: "fixed", value: 600, priority: 2 },
      ],
    },
    debtPlan: [
      {
        debtName: "Capital One Credit Card",
        mode: "minimum_plus",
        minimumSource: "existing",
        extraPaymentRule: { type: "fixed", value: 75 },
        priority: "critical",
        notes: "Pay minimum plus extra after the buffer is protected.",
      },
    ],
    obligationPlan: [
      {
        obligationName: "Tuition",
        handling: "pay_over_time",
        installment: { amount: 200, cadence: "monthly" },
        priority: "high",
      },
      {
        obligationName: "Rent",
        handling: "pay_once",
        priority: "critical",
      },
    ],
    guidance: {
      focusOrder: ["overdue", "critical_debt", "critical_obligation", "buffer", "goal_progress"],
      recommendedStepStyle: "first_incomplete_step",
    },
  },
  null,
  2,
);

type GoalFormState = {
  title: string;
  description: string;
  category: RoadmapCategory;
  status: RoadmapStatus;
  priority: RoadmapPriority;
  targetDate: string;
  timeframeLabel: string;
  notes: string;
  stepsText: string;
};

const emptyGoalForm: GoalFormState = {
  title: "",
  description: "",
  category: "finances",
  status: "planned",
  priority: "medium",
  targetDate: "",
  timeframeLabel: "",
  notes: "",
  stepsText: "",
};

const categoryOptions = ["all", "finances", "school", "career", "admin", "health", "personal"] as const;
const statusOptions = ["all", "planned", "active", "blocked", "completed", "overdue"] as const;
const priorityOptions = ["all", "low", "medium", "high", "critical"] as const;
const timeframeOptions = ["all", "next_7_days", "next_30_days", "no_date"] as const;
const sortModes = ["most_urgent", "nearest_deadline", "highest_priority", "most_progress", "least_progress"] as const;

function roadmapItemToStored(item: RoadmapItem): RoadmapItem {
  return {
    ...item,
    urgencyScore: undefined,
    reason: undefined,
    derivedNextStep: undefined,
  };
}

function parseSteps(text: string): RoadmapStep[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((title, index) => ({
      id: `manual-step-${index}-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      title,
      completed: false,
    }));
}

function priorityRank(priority: RoadmapPriority) {
  return {
    low: 1,
    medium: 2,
    high: 3,
    critical: 4,
  }[priority];
}

function formatDueLabel(value?: string) {
  if (!value) return "No target date";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function matchesTimeframe(item: RoadmapItem, timeframe: (typeof timeframeOptions)[number]) {
  if (timeframe === "all") return true;
  if (timeframe === "no_date") return !item.targetDate;
  if (!item.targetDate) return false;
  const diffDays = Math.ceil((new Date(item.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (timeframe === "next_7_days") return diffDays <= 7;
  if (timeframe === "next_30_days") return diffDays <= 30;
  return true;
}

export default function RoadmapPage() {
  const { setup, hydrated, save } = useStoredLifeOsSetup();
  const dashboard = useMemo(() => buildDashboardFromSetup(setup), [setup]);
  const [strategyInput, setStrategyInput] = useState(strategyTemplate);
  const [strategyErrors, setStrategyErrors] = useState<string[]>([]);
  const [goalForm, setGoalForm] = useState<GoalFormState>(emptyGoalForm);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<(typeof statusOptions)[number]>("all");
  const [priorityFilter, setPriorityFilter] = useState<(typeof priorityOptions)[number]>("all");
  const [categoryFilter, setCategoryFilter] = useState<(typeof categoryOptions)[number]>("all");
  const [timeframeFilter, setTimeframeFilter] = useState<(typeof timeframeOptions)[number]>("all");
  const [sortMode, setSortMode] = useState<(typeof sortModes)[number]>("most_urgent");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [activeOnly, setActiveOnly] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    setStrategyInput(setup.strategyDocument ? JSON.stringify(setup.strategyDocument, null, 2) : strategyTemplate);
  }, [hydrated, setup.strategyDocument]);

  const visibleItems = useMemo(() => {
    let items = dashboard.roadmap.items.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (priorityFilter !== "all" && item.priority !== priorityFilter) return false;
      if (categoryFilter !== "all" && item.category !== categoryFilter) return false;
      if (!matchesTimeframe(item, timeframeFilter)) return false;
      if (overdueOnly && item.status !== "overdue") return false;
      if (activeOnly && !["active", "blocked", "overdue"].includes(item.status)) return false;
      return true;
    });

    items = items.slice().sort((left, right) => {
      if (sortMode === "most_urgent") return (right.urgencyScore ?? 0) - (left.urgencyScore ?? 0);
      if (sortMode === "nearest_deadline") {
        return (left.targetDate ? new Date(left.targetDate).getTime() : Number.MAX_SAFE_INTEGER) -
          (right.targetDate ? new Date(right.targetDate).getTime() : Number.MAX_SAFE_INTEGER);
      }
      if (sortMode === "highest_priority") return priorityRank(right.priority) - priorityRank(left.priority);
      if (sortMode === "most_progress") return right.progressValue - left.progressValue;
      return left.progressValue - right.progressValue;
    });

    return items;
  }, [activeOnly, categoryFilter, dashboard.roadmap.items, overdueOnly, priorityFilter, sortMode, statusFilter, timeframeFilter]);

  const grouped = useMemo(
    () => ({
      active: visibleItems.filter((item) => ["active", "blocked", "overdue"].includes(item.status)),
      upcoming: visibleItems.filter((item) => item.status === "planned"),
      completed: visibleItems.filter((item) => item.status === "completed"),
    }),
    [visibleItems],
  );

  function upsertRoadmapItem(nextItem: RoadmapItem) {
    const nextSetup = hydrated ? setup : createEmptyStoredLifeOsSetup();
    const storedItem = roadmapItemToStored(nextItem);
    const existingIndex = nextSetup.roadmapItems.findIndex(
      (item) => item.id === storedItem.id || (!!storedItem.linkedStrategyGoalId && item.linkedStrategyGoalId === storedItem.linkedStrategyGoalId),
    );
    const roadmapItems = [...nextSetup.roadmapItems];
    if (existingIndex >= 0) roadmapItems[existingIndex] = storedItem;
    else roadmapItems.push(storedItem);
    save({
      ...nextSetup,
      roadmapItems,
    });
  }

  function removeRoadmapItem(item: RoadmapItem) {
    const nextSetup = hydrated ? setup : createEmptyStoredLifeOsSetup();
    save({
      ...nextSetup,
      roadmapItems: nextSetup.roadmapItems.filter(
        (existing) => existing.id !== item.id && existing.linkedStrategyGoalId !== item.linkedStrategyGoalId,
      ),
    });
  }

  function saveManualGoal() {
    if (!goalForm.title.trim()) return;
    const nextItem: RoadmapItem = {
      id: `manual-goal-${Date.now()}`,
      title: goalForm.title.trim(),
      description: goalForm.description.trim(),
      category: goalForm.category,
      status: goalForm.status,
      priority: goalForm.priority,
      targetDate: goalForm.targetDate || undefined,
      timeframeLabel: goalForm.timeframeLabel.trim(),
      progressMode: goalForm.stepsText.trim() ? "steps" : "percent",
      progressValue: 0,
      steps: parseSteps(goalForm.stepsText),
      notes: goalForm.notes.trim(),
      dependencyIds: [],
      strategyBacked: false,
    };
    upsertRoadmapItem(nextItem);
    setGoalForm(emptyGoalForm);
  }

  function handleStrategySave() {
    const result = saveStrategyToSetup(setup, strategyInput);
    setStrategyErrors(result.errors);
    if (result.errors.length) return;
    save(result.setup);
  }

  function handleStepToggle(item: RoadmapItem, stepId: string) {
    upsertRoadmapItem({
      ...item,
      steps: item.steps.map((step) => (step.id === stepId ? { ...step, completed: !step.completed } : step)),
    });
  }

  function handleItemFieldUpdate(item: RoadmapItem, patch: Partial<RoadmapItem>) {
    upsertRoadmapItem({
      ...item,
      ...patch,
    });
  }

  function toggleExpanded(id: string) {
    setExpandedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  if (!hydrated) {
    return (
      <div className="space-y-6 pb-24 md:pb-6">
        <Panel>
          <SectionHeading eyebrow="Roadmap" title="Loading your plan" description="Pulling your strategy and active goals into one view." />
        </Panel>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 md:pb-6">
      <Panel>
        <SectionHeading
          eyebrow="Roadmap"
          title="Strategy, debt pressure, and goal progress"
          description="Use one planning surface to decide what incoming income should protect, which obligations need staging, and which goal deserves the next push."
        />
      </Panel>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <StatCard label="Active goals" value={dashboard.roadmap.summary.activeCount} detail="Currently in motion" />
        <StatCard label="Overdue" value={dashboard.roadmap.summary.overdueCount} detail="Needs immediate attention" />
        <StatCard label="Completed" value={dashboard.roadmap.summary.completedCount} detail="Finished cleanly" />
        <StatCard label="Debt / obligation pressure" value={dashboard.roadmap.summary.debtOrObligationCount} detail="Finance-linked roadmap items" />
        <StatCard label="Overall progress" value={`${dashboard.roadmap.summary.overallProgress}%`} detail="Across active goals" />
        <StatCard
          label="Most urgent"
          value={dashboard.roadmap.summary.mostUrgentItem?.title ?? "Nothing urgent"}
          detail={dashboard.roadmap.summary.recommendedNextStep?.title ?? "Paste a strategy or add a goal"}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Panel>
          <SectionHeading
            eyebrow="Focus"
            title={dashboard.roadmap.focus.item?.title ?? "No roadmap focus yet"}
            description={dashboard.roadmap.focus.whyNow}
          />
          <div className="mt-5 rounded-[24px] border border-line bg-white/72 p-4">
            <p className="text-[11px] uppercase tracking-[0.24em] text-muted">Best next step</p>
            <p className="mt-2 text-lg font-semibold tracking-tight text-ink">
              {dashboard.roadmap.focus.nextStep?.title ?? "Paste a strategy or add your first major goal."}
            </p>
            <p className="mt-2 text-sm leading-6 text-muted">
              {dashboard.roadmap.focus.nextStep?.reason ??
                "The roadmap will combine deadlines, debt pressure, overdue obligations, and your chosen strategy to decide what should move first."}
            </p>
          </div>
          <div className="mt-4 rounded-[24px] bg-accent-soft p-4">
            <p className="text-[11px] uppercase tracking-[0.24em] text-accent">Current strategy effect</p>
            <div className="mt-3 space-y-2 text-sm text-ink">
              {dashboard.availableSpend.strategyAllocations.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-4">
                  <span>{item.label}</span>
                  <span className="font-semibold tabular-nums">{formatMoney(item.amount)}</span>
                </div>
              ))}
              {dashboard.availableSpend.strategyDebtExtraPayments.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-4">
                  <span>{item.label}</span>
                  <span className="font-semibold tabular-nums">{formatMoney(item.amount)}</span>
                </div>
              ))}
              {dashboard.availableSpend.strategyObligationInstallments.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-4">
                  <span>{item.label}</span>
                  <span className="font-semibold tabular-nums">{formatMoney(item.amount)}</span>
                </div>
              ))}
              {!dashboard.availableSpend.strategyAllocations.length &&
              !dashboard.availableSpend.strategyDebtExtraPayments.length &&
              !dashboard.availableSpend.strategyObligationInstallments.length ? (
                <p className="text-sm text-muted">No strategy reserves are shaping the current horizon yet.</p>
              ) : null}
            </div>
          </div>
        </Panel>

        <Panel>
          <SectionHeading
            eyebrow="Strategy input"
            title="Paste the current plan"
            description="Use strict JSON only. The strategy stays advisory and shapes guidance, not the ledger itself."
            action={<Button onClick={handleStrategySave}>Save strategy</Button>}
          />
          <div className="mt-5 space-y-3">
            <Textarea
              value={strategyInput}
              onChange={(event) => setStrategyInput(event.target.value)}
              rows={18}
              className="font-mono text-[13px] leading-6"
            />
            {strategyErrors.length ? (
              <div className="rounded-[22px] border border-[#d8b4b4] bg-[#fff5f5] p-4 text-sm text-[#7a2f2f]">
                {strategyErrors.map((error) => (
                  <p key={error}>{error}</p>
                ))}
              </div>
            ) : (
              <div className="rounded-[22px] border border-line bg-white/72 p-4 text-sm text-muted">
                Strict JSON only. The strategy parser accepts richer planning fields like `incomePlan.expectedIncome`,
                `spendingRules`, `fixed_total_target`, `externally_covered`, `file_this_week`, and `within_horizon`.
              </div>
            )}
          </div>
        </Panel>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.78fr_1.22fr]">
        <Panel>
          <SectionHeading eyebrow="Add goal" title="Track a major milestone" description="Keep this for meaningful goals, not tiny tasks." />
          <div className="mt-5 space-y-4">
            <InlineField label="Title">
              <Input value={goalForm.title} onChange={(event) => setGoalForm((current) => ({ ...current, title: event.target.value }))} placeholder="Erase the credit card backlog" />
            </InlineField>
            <InlineField label="Description">
              <Textarea
                rows={3}
                value={goalForm.description}
                onChange={(event) => setGoalForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="Why this matters and what done looks like."
              />
            </InlineField>
            <div className="grid gap-4 md:grid-cols-2">
              <InlineField label="Category">
                <Select value={goalForm.category} onChange={(event) => setGoalForm((current) => ({ ...current, category: event.target.value as RoadmapCategory }))}>
                  {categoryOptions.filter((option) => option !== "all").map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Select>
              </InlineField>
              <InlineField label="Priority">
                <Select value={goalForm.priority} onChange={(event) => setGoalForm((current) => ({ ...current, priority: event.target.value as RoadmapPriority }))}>
                  {priorityOptions.filter((option) => option !== "all").map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Select>
              </InlineField>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <InlineField label="Status">
                <Select value={goalForm.status} onChange={(event) => setGoalForm((current) => ({ ...current, status: event.target.value as RoadmapStatus }))}>
                  {statusOptions.filter((option) => option !== "all").map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Select>
              </InlineField>
              <InlineField label="Target date">
                <Input type="date" value={goalForm.targetDate} onChange={(event) => setGoalForm((current) => ({ ...current, targetDate: event.target.value }))} />
              </InlineField>
            </div>
            <InlineField label="Timeframe label" description="Optional: use this when the goal is oriented around a season or phase instead of a hard deadline.">
              <Input value={goalForm.timeframeLabel} onChange={(event) => setGoalForm((current) => ({ ...current, timeframeLabel: event.target.value }))} placeholder="Spring semester" />
            </InlineField>
            <InlineField label="Substeps" description="One actionable checkpoint per line. The first unfinished line becomes the suggested next move.">
              <Textarea
                rows={5}
                value={goalForm.stepsText}
                onChange={(event) => setGoalForm((current) => ({ ...current, stepsText: event.target.value }))}
                placeholder={"Pay rent on time\nReserve 200 for tuition installment\nSend extra to Capital One"}
              />
            </InlineField>
            <InlineField label="Notes">
              <Textarea rows={3} value={goalForm.notes} onChange={(event) => setGoalForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Anything that changes how you want the roadmap to guide this goal." />
            </InlineField>
            <Button className="w-full" onClick={saveManualGoal}>
              Add goal
            </Button>
          </div>
        </Panel>

        <div className="space-y-6">
          <Panel>
            <SectionHeading eyebrow="Filters" title="Keep the view focused" description="Use simple slices so the roadmap answers what matters now instead of showing everything at once." />
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <InlineField label="Status">
                <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as (typeof statusOptions)[number])}>
                  {statusOptions.map((option) => (
                    <option key={option} value={option}>
                      {option.replace("_", " ")}
                    </option>
                  ))}
                </Select>
              </InlineField>
              <InlineField label="Priority">
                <Select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value as (typeof priorityOptions)[number])}>
                  {priorityOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Select>
              </InlineField>
              <InlineField label="Category">
                <Select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value as (typeof categoryOptions)[number])}>
                  {categoryOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Select>
              </InlineField>
              <InlineField label="Timeframe">
                <Select value={timeframeFilter} onChange={(event) => setTimeframeFilter(event.target.value as (typeof timeframeOptions)[number])}>
                  {timeframeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option.replaceAll("_", " ")}
                    </option>
                  ))}
                </Select>
              </InlineField>
              <InlineField label="Sort">
                <Select value={sortMode} onChange={(event) => setSortMode(event.target.value as (typeof sortModes)[number])}>
                  {sortModes.map((option) => (
                    <option key={option} value={option}>
                      {option.replaceAll("_", " ")}
                    </option>
                  ))}
                </Select>
              </InlineField>
              <div className="flex items-end gap-2">
                <Button variant={overdueOnly ? "secondary" : "ghost"} className="flex-1" onClick={() => setOverdueOnly((value) => !value)}>
                  Overdue only
                </Button>
                <Button variant={activeOnly ? "secondary" : "ghost"} className="flex-1" onClick={() => setActiveOnly((value) => !value)}>
                  Active only
                </Button>
              </div>
            </div>
          </Panel>

          {(["active", "upcoming", "completed"] as const).map((group) => {
            const items = grouped[group];
            return (
              <Panel key={group}>
                <SectionHeading
                  eyebrow={group === "active" ? "Active goals" : group === "upcoming" ? "Upcoming goals" : "Completed goals"}
                  title={group === "active" ? "What is moving now" : group === "upcoming" ? "What comes next" : "What is already closed"}
                  description={
                    group === "active"
                      ? "Urgency blends due pressure, debt and obligation strategy, priority, and remaining work."
                      : group === "upcoming"
                        ? "Planned items stay visible without crowding the active focus."
                        : "Finished goals remain as a clean record of progress."
                  }
                />
                <div className="mt-5 space-y-3">
                  {items.length ? (
                    items.map((item) => {
                      const expanded = expandedIds.includes(item.id);
                      return (
                        <div key={item.id} className="rounded-[24px] border border-line bg-white/72 p-4">
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge>{item.status}</Badge>
                                <Badge>{item.priority}</Badge>
                                <Badge>{item.category}</Badge>
                                {item.strategyBacked ? <Badge className="border-transparent bg-accent-soft text-accent">Strategy</Badge> : null}
                              </div>
                              <div>
                                <h3 className="text-lg font-semibold tracking-tight text-ink">{item.title}</h3>
                                <p className="mt-1 text-sm leading-6 text-muted">{item.description || item.reason || "No description yet."}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-[11px] uppercase tracking-[0.24em] text-muted">{item.targetDate ? "Target" : "Timeframe"}</p>
                              <p className="mt-2 text-sm font-medium text-ink">{item.targetDate ? formatDueLabel(item.targetDate) : item.timeframeLabel || "No target date"}</p>
                              <div className="mt-3 text-2xl font-semibold tracking-tight text-ink">{item.progressValue}%</div>
                            </div>
                          </div>
                          <div className="mt-4 h-2 overflow-hidden rounded-full bg-black/6">
                            <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${item.progressValue}%` }} />
                          </div>
                          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                            <div className="text-sm text-muted">
                              Next move: <span className="font-medium text-ink">{item.derivedNextStep ?? item.title}</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {!item.strategyBacked ? (
                                <Button variant="ghost" onClick={() => removeRoadmapItem(item)}>
                                  Remove
                                </Button>
                              ) : null}
                              <Button variant="soft" onClick={() => toggleExpanded(item.id)}>
                                {expanded ? "Hide details" : "Show details"}
                              </Button>
                            </div>
                          </div>
                          {expanded ? (
                            <div className="mt-5 grid gap-4 xl:grid-cols-[0.75fr_0.25fr]">
                              <div className="space-y-3">
                                {item.steps.length ? (
                                  item.steps.map((step) => (
                                    <button
                                      key={step.id}
                                      type="button"
                                      onClick={() => handleStepToggle(item, step.id)}
                                      className={cn(
                                        "flex w-full items-start gap-3 rounded-[18px] border border-line px-4 py-3 text-left transition",
                                        step.completed ? "bg-accent-soft text-muted" : "bg-white/80 text-ink hover:bg-white",
                                      )}
                                    >
                                      <span className={cn("mt-0.5 h-4 w-4 rounded-full border", step.completed ? "border-accent bg-accent" : "border-line")} />
                                      <div>
                                        <p className={cn("text-sm font-medium", step.completed ? "line-through text-muted" : "text-ink")}>{step.title}</p>
                                        {step.notes ? <p className="mt-1 text-xs text-muted">{step.notes}</p> : null}
                                      </div>
                                    </button>
                                  ))
                                ) : (
                                  <div className="rounded-[18px] border border-dashed border-line bg-white/60 p-4 text-sm text-muted">
                                    No substeps yet. The goal itself is the next move.
                                  </div>
                                )}
                                {item.notes ? (
                                  <div className="rounded-[18px] bg-accent-soft p-4 text-sm leading-6 text-ink">{item.notes}</div>
                                ) : null}
                              </div>
                              <div className="space-y-3">
                                <InlineField label="Status">
                                  <Select
                                    value={item.status}
                                    onChange={(event) => handleItemFieldUpdate(item, { status: event.target.value as RoadmapStatus })}
                                  >
                                    {statusOptions.filter((option) => option !== "all").map((option) => (
                                      <option key={option} value={option}>
                                        {option}
                                      </option>
                                    ))}
                                  </Select>
                                </InlineField>
                                <InlineField label="Priority">
                                  <Select
                                    value={item.priority}
                                    onChange={(event) => handleItemFieldUpdate(item, { priority: event.target.value as RoadmapPriority })}
                                  >
                                    {priorityOptions.filter((option) => option !== "all").map((option) => (
                                      <option key={option} value={option}>
                                        {option}
                                      </option>
                                    ))}
                                  </Select>
                                </InlineField>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-[24px] border border-dashed border-line bg-white/56 p-5 text-sm leading-6 text-muted">
                      {dashboard.roadmap.items.length
                        ? "No items match the current filters."
                        : "No roadmap items yet. Add a major goal or paste a strategy to turn this section into a progress map instead of a loose todo list."}
                    </div>
                  )}
                </div>
              </Panel>
            );
          })}
        </div>
      </section>
    </div>
  );
}
