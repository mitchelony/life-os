"use client";

import { ChevronDown, ChevronUp, Plus, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge, Button, cn, InlineField, Input, Panel, SectionHeading, Segment, Select, Textarea } from "@/components/ui";
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
    version: 2,
    name: "Next paycheck plan",
    summary: "Make a clear plan for what gets paid first when money comes in.",
    effectiveDate: "2026-03-24",
    currency: "USD",
    planningHorizonDays: 30,
    strategyMode: "cash_flow_first",
    goals: [
      {
        id: "goal-buffer",
        title: "Build first emergency buffer",
        category: "finances",
        status: "active",
        priority: "high",
        targetDate: "2026-04-15",
        targetAmount: 100,
        notes: "Protect the first $100 so small emergencies do not go back onto the card.",
      },
    ],
    cashFlowPlan: {
      defaultFlowOrder: ["minimum_required_payments", "weekly_essentials", "protected_buffer", "credit_card_extra"],
      weeklyEssentialsCap: 25,
      noNewCreditCardSpending: true,
      bufferTarget: 100,
    },
    expectedIncome: [
      { id: "income-paycheck", label: "Tutoring paycheck", amount: 390, timing: "in_2_weeks", certainty: "confirmed" },
    ],
    nextIncomePlans: [
      {
        id: "plan-paycheck",
        incomeId: "income-paycheck",
        label: "When the tutoring paycheck lands",
        amount: 390,
        allocations: [
          { id: "buffer-1", label: "Emergency buffer", amount: 50, type: "buffer", priority: 1 },
          { id: "utilities-1", label: "Utilities catch-up payment", amount: 170, type: "obligation_payment", priority: 2 },
          { id: "capital-one-1", label: "Capital One payment", amount: 170, type: "debt_payment", priority: 3 },
        ],
        recommendedStep: "Finish the first $100 buffer, then split the rest between utilities and Capital One.",
      },
    ],
    debtPlan: [
      {
        debtName: "Capital One Credit Card",
        mode: "minimum_plus",
        minimumPayment: 10,
        minimumSource: "existing",
        extraPaymentRule: { type: "follow_next_income_plan" },
        priority: "critical",
        notes: "Do not add new spending to this card.",
      },
    ],
    obligationPlan: [
      {
        obligationName: "Utilities",
        handling: "pay_over_time",
        priority: "critical",
        notes: "Reduce this overdue balance using the next-income flow.",
      },
      {
        obligationName: "Taxes",
        handling: "file_this_week",
        priority: "high",
      },
    ],
    guidance: {
      focusOrder: ["next_income_plan", "minimum_required_payments", "overdue_obligations", "critical_debt", "buffer", "admin_deadlines"],
      recommendedStepStyle: "next_planned_allocation",
      primaryUXMode: "next_payments_to_make",
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
const mobileViews = ["Focus", "Goals", "Strategy"] as const;

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
  const [mobileView, setMobileView] = useState<(typeof mobileViews)[number]>("Focus");
  const [showStrategyEditor, setShowStrategyEditor] = useState(false);
  const [showGoalComposer, setShowGoalComposer] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<"active" | "upcoming" | "completed", boolean>>({
    active: false,
    upcoming: true,
    completed: true,
  });

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
    setShowGoalComposer(false);
    setMobileView("Goals");
  }

  function handleStrategySave() {
    const result = saveStrategyToSetup(setup, strategyInput);
    setStrategyErrors(result.errors);
    if (result.errors.length) return;
    save(result.setup);
    setShowStrategyEditor(false);
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

  function toggleGroup(group: "active" | "upcoming" | "completed") {
    setCollapsedGroups((current) => ({
      ...current,
      [group]: !current[group],
    }));
  }

  if (!hydrated) {
    return (
      <div className="space-y-6 pb-24 md:pb-6">
        <Panel>
          <SectionHeading eyebrow="Roadmap" title="Loading your plan" description="Getting your plan and goals ready." />
        </Panel>
      </div>
    );
  }

  const strategyImpactRows = [
    ...dashboard.availableSpend.strategyAllocations,
    ...dashboard.availableSpend.strategyDebtExtraPayments,
    ...dashboard.availableSpend.strategyObligationInstallments,
  ];

  return (
    <div className="mx-auto max-w-[1180px] space-y-4 pb-24 md:space-y-6 md:pb-6">
      <Panel>
        <SectionHeading
          eyebrow="Roadmap"
          title="When the next paycheck hits, what gets paid first?"
          description="Use this page to see what should get paid first and what to do next."
        />
        <div className="mt-4 hidden gap-3 md:grid md:grid-cols-4">
          <CompactRoadmapStat label="Active goals" value={dashboard.roadmap.summary.activeCount} detail="In progress" />
          <CompactRoadmapStat label="Overdue" value={dashboard.roadmap.summary.overdueCount} detail="Needs attention" />
          <CompactRoadmapStat label="Progress" value={`${dashboard.roadmap.summary.overallProgress}%`} detail="Across active goals" />
          <CompactRoadmapStat
            label="Next income plan"
            value={dashboard.roadmap.paycheckFlow.nextPlan ? "Ready" : "None"}
            detail={dashboard.roadmap.paycheckFlow.nextPlan?.incomeLabel ?? "Add a plan"}
          />
        </div>
      </Panel>

      <div className="sticky top-2 z-20">
        <div className="rounded-[22px] border border-line bg-[rgba(255,255,255,0.94)] p-2 shadow-soft backdrop-blur-xl">
          <Segment options={[...mobileViews]} value={mobileView} onChange={(value) => setMobileView(value as (typeof mobileViews)[number])} />
        </div>
      </div>

      <div className={cn("space-y-4 md:space-y-6", mobileView !== "Focus" && "hidden")}>
        <Panel className="md:hidden">
          <div className="grid grid-cols-2 gap-3">
            <CompactRoadmapStat label="Active" value={dashboard.roadmap.summary.activeCount} />
            <CompactRoadmapStat label="Overdue" value={dashboard.roadmap.summary.overdueCount} />
            <CompactRoadmapStat label="Progress" value={`${dashboard.roadmap.summary.overallProgress}%`} />
            <CompactRoadmapStat
              label="Next flow"
              value={dashboard.roadmap.paycheckFlow.nextPlan ? "Ready" : "None"}
              detail={dashboard.roadmap.paycheckFlow.nextPlan?.incomeLabel ?? "Paste a strategy"}
            />
          </div>
        </Panel>

        <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr] xl:gap-6">
          <div className="space-y-4 md:space-y-6">
            <Panel className="min-h-[420px]">
              <SectionHeading
                eyebrow="Focus"
                title={dashboard.roadmap.focus.nextStep?.title ?? "No roadmap focus yet"}
                description={dashboard.roadmap.focus.whyNow}
              />
              <div className="mt-5 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                <div className="rounded-[24px] border border-line bg-white/72 p-5">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-muted">Best next step</p>
                  <p className="mt-3 text-2xl font-semibold tracking-tight text-ink">
                    {dashboard.roadmap.focus.nextStep?.title ?? "Paste a strategy or add your first major goal."}
                  </p>
                  <p className="mt-3 text-sm leading-7 text-muted">
                    {dashboard.roadmap.focus.nextStep?.reason ??
                      "Roadmap looks at what is overdue, what is due soon, and your plan to choose what comes first."}
                  </p>
                  <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    <CompactRoadmapStat label="Active goals" value={dashboard.roadmap.summary.activeCount} detail="Still moving" />
                    <CompactRoadmapStat label="Overdue" value={dashboard.roadmap.summary.overdueCount} detail="Needs attention" />
                    <CompactRoadmapStat label="Progress" value={`${dashboard.roadmap.summary.overallProgress}%`} detail="Across active goals" />
                  </div>
                </div>

                <div className="rounded-[24px] bg-accent-soft p-5">
                  {dashboard.roadmap.paycheckFlow.nextPlan ? (
                    <>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.22em] text-accent">Next income flow</p>
                          <p className="mt-2 text-lg font-semibold tracking-tight text-ink">{dashboard.roadmap.paycheckFlow.nextPlan.label}</p>
                          <p className="mt-1 text-sm text-muted">
                            {dashboard.roadmap.paycheckFlow.nextPlan.incomeLabel} • {formatMoney(dashboard.roadmap.paycheckFlow.nextPlan.amount)}
                          </p>
                        </div>
                        <Badge className="border-transparent bg-white/70 text-accent">
                          {dashboard.roadmap.paycheckFlow.nextPlan.allocations.length} moves
                        </Badge>
                      </div>
                      <div className="mt-4 space-y-2">
                        {dashboard.roadmap.paycheckFlow.nextPlan.allocations.slice(0, 4).map((allocation) => (
                          <div key={allocation.id} className="flex items-center justify-between gap-4 rounded-[16px] bg-white/72 px-3 py-2.5 text-sm">
                            <span>{allocation.label}</span>
                            <span className="font-semibold tabular-nums">{formatMoney(allocation.amount)}</span>
                          </div>
                        ))}
                      </div>
                      <p className="mt-4 text-sm leading-6 text-muted">{dashboard.roadmap.paycheckFlow.nextPlan.recommendedStep}</p>
                    </>
                  ) : (
                    <>
                      <p className="text-[10px] uppercase tracking-[0.22em] text-accent">Current strategy effect</p>
                      <div className="mt-4 space-y-2 text-sm text-ink">
                        {strategyImpactRows.length ? (
                          strategyImpactRows.slice(0, 4).map((item) => (
                            <div key={item.id} className="flex items-center justify-between gap-4 rounded-[16px] bg-white/72 px-3 py-2.5">
                              <span>{item.label}</span>
                              <span className="font-semibold tabular-nums">{formatMoney(item.amount)}</span>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted">Your plan is not affecting this time period yet.</p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </Panel>
          </div>

          <div className="space-y-4 md:space-y-6">
            <Panel className="min-h-[420px]">
              <SectionHeading
                eyebrow="Why this page exists"
                title="Keep the next money move obvious"
                description="Roadmap is for deciding what gets paid first and what step should happen next."
              />
              <div className="mt-5 grid gap-3">
                <div className="rounded-[22px] border border-line bg-white/72 p-4">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-muted">What matters first</p>
                  <p className="mt-2 text-base font-semibold tracking-tight text-ink">{dashboard.nextItem}</p>
                  <p className="mt-1 text-sm leading-6 text-muted">{dashboard.afterThat}</p>
                </div>
                <div className="rounded-[22px] border border-line bg-white/72 p-4">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-muted">Money pressure</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <CompactRoadmapStat label="Available now" value={formatMoney(dashboard.availableSpend.availableNow)} />
                    <CompactRoadmapStat label="Through next income" value={formatMoney(dashboard.availableSpend.availableThroughNextIncome)} />
                  </div>
                </div>
                <div className="rounded-[22px] border border-line bg-white/72 p-4">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-muted">Saved strategy</p>
                  <p className="mt-2 text-base font-semibold tracking-tight text-ink">{setup.strategyDocument?.name ?? "No saved strategy yet"}</p>
                  <p className="mt-1 text-sm leading-6 text-muted">
                    {setup.strategyDocument?.summary ?? "Add a strategy so this page can stay centered on payment order instead of general goals."}
                  </p>
                </div>
              </div>
            </Panel>
          </div>
        </div>
      </div>

      <div className={cn("space-y-4 md:space-y-6", mobileView !== "Goals" && "hidden")}>
        <Panel>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <SectionHeading
                eyebrow="Goals"
                title="The roadmap itself"
                description="Keep big goals here, but keep the page focused on the next step."
              />
              <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                <Button variant="ghost" className="flex-1 sm:flex-none" onClick={() => setShowFilters((value) => !value)}>
                  <SlidersHorizontal className="h-4 w-4" />
                  {showFilters ? "Hide filters" : "View options"}
                </Button>
                <Button variant="soft" className="flex-1 sm:flex-none" onClick={() => setShowGoalComposer((value) => !value)}>
                  <Plus className="h-4 w-4" />
                  {showGoalComposer ? "Hide goal form" : "Add goal"}
                </Button>
              </div>
            </div>

            {showFilters ? (
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
            ) : (
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge>{grouped.active.length} active</Badge>
                <Badge>{grouped.upcoming.length} upcoming</Badge>
                <Badge>{grouped.completed.length} completed</Badge>
                {overdueOnly ? <Badge className="border-transparent bg-accent-soft text-accent">Overdue only</Badge> : null}
                {activeOnly ? <Badge className="border-transparent bg-accent-soft text-accent">Active only</Badge> : null}
              </div>
            )}

            {showGoalComposer ? (
              <div className="mt-5 border-t border-line pt-5">
                <SectionHeading eyebrow="Add goal" title="Add a big goal" description="Use this for bigger goals, not tiny tasks." />
                <div className="mt-5 space-y-4">
                  <InlineField label="Title">
                    <Input value={goalForm.title} onChange={(event) => setGoalForm((current) => ({ ...current, title: event.target.value }))} placeholder="Erase the credit card backlog" />
                  </InlineField>
                  <InlineField label="Description">
                    <Textarea
                      rows={3}
                      value={goalForm.description}
                      onChange={(event) => setGoalForm((current) => ({ ...current, description: event.target.value }))}
                      placeholder="Why this matters and what it looks like when it is done."
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
                  <InlineField label="Timeframe label" description="Optional: use this if you have a rough time period instead of a set date.">
                    <Input value={goalForm.timeframeLabel} onChange={(event) => setGoalForm((current) => ({ ...current, timeframeLabel: event.target.value }))} placeholder="Spring semester" />
                  </InlineField>
                  <InlineField label="Substeps" description="Put one step on each line. The first unfinished step becomes the next move.">
                    <Textarea
                      rows={5}
                      value={goalForm.stepsText}
                      onChange={(event) => setGoalForm((current) => ({ ...current, stepsText: event.target.value }))}
                      placeholder={"Pay rent on time\nReserve 200 for tuition installment\nSend extra to Capital One"}
                    />
                  </InlineField>
                  <InlineField label="Notes">
                    <Textarea rows={3} value={goalForm.notes} onChange={(event) => setGoalForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Anything else that matters for this goal." />
                  </InlineField>
                  <Button className="w-full" onClick={saveManualGoal}>
                    Add goal
                  </Button>
                </div>
              </div>
            ) : null}
        </Panel>

          {(["active", "upcoming", "completed"] as const).map((group) => {
            const items = grouped[group];
            return (
              <Panel key={group}>
                <button
                  type="button"
                  onClick={() => toggleGroup(group)}
                  className="flex w-full items-center justify-between gap-3 text-left"
                >
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.24em] text-muted">
                      {group === "active" ? "Active goals" : group === "upcoming" ? "Upcoming goals" : "Completed goals"}
                    </p>
                    <h2 className="mt-1 text-base font-semibold tracking-tight text-ink">
                      {group === "active" ? "What is moving now" : group === "upcoming" ? "What comes next" : "What is already closed"}
                    </h2>
                    <p className="mt-1 text-sm text-muted">{items.length} items</p>
                  </div>
                  {collapsedGroups[group] ? <ChevronDown className="h-5 w-5 text-muted" /> : <ChevronUp className="h-5 w-5 text-muted" />}
                </button>

                {!collapsedGroups[group] ? (
                  <div className="mt-5 space-y-3">
                    {items.length ? (
                      items.map((item) => {
                        const expanded = expandedIds.includes(item.id);
                        return (
                          <div key={item.id} className="rounded-[18px] border border-line bg-white/72 p-3.5 md:rounded-[22px] md:p-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <Badge>{item.status}</Badge>
                                  <Badge className="hidden sm:inline-flex">{item.priority}</Badge>
                                  {item.strategyBacked ? <Badge className="border-transparent bg-accent-soft text-accent">Strategy</Badge> : null}
                                </div>
                                <h3 className="mt-3 text-base font-semibold tracking-tight text-ink md:text-lg">{item.title}</h3>
                                <p className="mt-1 text-sm leading-6 text-muted">{item.derivedNextStep ?? item.description ?? item.reason ?? "No details yet."}</p>
                                <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted">
                                  <span>{item.targetDate ? `Target ${formatDueLabel(item.targetDate)}` : item.timeframeLabel || "No target date"}</span>
                                  <span>{item.progressValue}% done</span>
                                  <span>{item.category}</span>
                                </div>
                              </div>
                              <Badge className="border-transparent bg-accent-soft text-accent">{item.progressValue}%</Badge>
                            </div>

                            <div className="mt-4 h-2 overflow-hidden rounded-full bg-black/6">
                              <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${item.progressValue}%` }} />
                            </div>

                            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
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
                                      No steps yet. The goal itself is the next move.
                                    </div>
                                  )}
                                  {item.notes ? <div className="rounded-[18px] bg-accent-soft p-4 text-sm leading-6 text-ink">{item.notes}</div> : null}
                                </div>
                                <div className="space-y-3">
                                  <InlineField label="Status">
                                    <Select value={item.status} onChange={(event) => handleItemFieldUpdate(item, { status: event.target.value as RoadmapStatus })}>
                                      {statusOptions.filter((option) => option !== "all").map((option) => (
                                        <option key={option} value={option}>
                                          {option}
                                        </option>
                                      ))}
                                    </Select>
                                  </InlineField>
                                  <InlineField label="Priority">
                                    <Select value={item.priority} onChange={(event) => handleItemFieldUpdate(item, { priority: event.target.value as RoadmapPriority })}>
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
                          : "No roadmap items yet. Add a big goal or paste a plan to get started."}
                      </div>
                    )}
                  </div>
                ) : null}
              </Panel>
            );
          })}
      </div>

      <div className={cn("space-y-4 md:space-y-6", mobileView !== "Strategy" && "hidden")}>
        <Panel>
          <SectionHeading
            eyebrow="Strategy"
            title={setup.strategyDocument?.name ?? "Paste the current plan"}
            description={setup.strategyDocument?.summary ?? "Use JSON only. This plan changes guidance, not your saved balances or entries."}
            action={
              <Button variant="soft" onClick={() => setShowStrategyEditor((value) => !value)}>
                {showStrategyEditor ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                {showStrategyEditor ? "Hide editor" : "Edit JSON"}
              </Button>
            }
          />
          {showStrategyEditor ? (
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
                  Use JSON only. Include expected income and the order you want money to move in.
                </div>
              )}
              <Button className="w-full" onClick={handleStrategySave}>
                Save strategy
              </Button>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <CompactRoadmapStat label="Goals" value={setup.strategyDocument?.goals.length ?? 0} />
                <CompactRoadmapStat label="Income plans" value={setup.strategyDocument?.nextIncomePlans?.length ?? 0} />
                <CompactRoadmapStat
                  label="Primary mode"
                  value={setup.strategyDocument?.guidance.primaryUXMode === "next_payments_to_make" ? "Pay order" : "Goal order"}
                />
              </div>
              <div className="rounded-[18px] bg-accent-soft p-4">
                <p className="text-[10px] uppercase tracking-[0.2em] text-accent">What this controls</p>
                <p className="mt-2 text-sm leading-6 text-ink">
                  This is the plan that tells Roadmap what should happen first when money lands. It does not rewrite your ledger or balances.
                </p>
              </div>
              {!showStrategyEditor ? (
                <Button variant="secondary" className="w-full sm:w-auto" onClick={() => setShowStrategyEditor(true)}>
                  Paste or edit strategy JSON
                </Button>
              ) : null}
            </div>
          )}
        </Panel>
      </div>

      <div className="space-y-4 md:space-y-6">
        <Panel>
          <SectionHeading
            eyebrow="Context"
            title="More detail, lower on the page"
            description="These details support the plan, but they should not get in the way of the next move."
          />
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            <div className="rounded-[22px] border border-line bg-white/72 p-4">
              <p className="text-[10px] uppercase tracking-[0.22em] text-muted">Plan pressure</p>
              <div className="mt-3 space-y-2 text-sm text-ink">
                <div className="flex items-center justify-between gap-4">
                  <span>Bills before next income</span>
                  <span className="font-semibold tabular-nums">{formatMoney(dashboard.availableSpend.obligationsDueBeforeNextIncome)}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Debt minimums</span>
                  <span className="font-semibold tabular-nums">{formatMoney(dashboard.availableSpend.debtMinimumsDueBeforeNextIncome)}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Essentials left</span>
                  <span className="font-semibold tabular-nums">{formatMoney(dashboard.availableSpend.essentialSpendRemaining)}</span>
                </div>
              </div>
            </div>

            <div className="rounded-[22px] border border-line bg-white/72 p-4">
              <p className="text-[10px] uppercase tracking-[0.22em] text-muted">Strategy effect</p>
              <div className="mt-3 space-y-2 text-sm text-ink">
                {strategyImpactRows.length ? (
                  strategyImpactRows.slice(0, 5).map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-4">
                      <span>{item.label}</span>
                      <span className="font-semibold tabular-nums">{formatMoney(item.amount)}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted">No strategy adjustments are affecting this horizon yet.</p>
                )}
              </div>
            </div>

            <div className="rounded-[22px] border border-line bg-white/72 p-4">
              <p className="text-[10px] uppercase tracking-[0.22em] text-muted">Roadmap health</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <CompactRoadmapStat label="Completed" value={dashboard.roadmap.summary.completedCount} detail="Closed goals" />
                <CompactRoadmapStat label="Finance-linked" value={dashboard.roadmap.summary.debtOrObligationCount} detail="Debt or bill related" />
              </div>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function CompactRoadmapStat({ label, value, detail }: { label: string; value: string | number; detail?: string }) {
  return (
    <div className="rounded-[18px] border border-line bg-white/72 p-3.5">
      <p className="text-[10px] uppercase tracking-[0.2em] text-muted">{label}</p>
      <div className="mt-2 text-lg font-semibold tracking-tight text-ink">{value}</div>
      {detail ? <p className="mt-1 text-xs leading-5 text-muted">{detail}</p> : null}
    </div>
  );
}
