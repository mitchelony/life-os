export type DecisionActionLike = {
  id: string;
  title: string;
  lane: string;
  status: string;
  source: string;
};

type AvailableSpendBreakdown = {
  liquid_cash: number;
  protected_buffer: number;
  active_reserves: number;
  overdue_obligations: number;
  obligations_due_within_horizon: number;
  debt_minimums_due_within_horizon: number;
  essentials_reserve_within_horizon: number;
  reliable_income_within_horizon: number;
  expected_income_within_horizon?: number;
  extra_allocations_within_horizon: number;
};

type LaneSummaryTone = "urgent" | "default" | "accent" | "muted" | "subtle";

export type ActionLaneSummary = {
  key: "do_now" | "this_week" | "when_income_lands" | "manual" | "inactive";
  label: string;
  count: number;
  tone: LaneSummaryTone;
};

export type ActionLaneSection<T extends DecisionActionLike = DecisionActionLike> = {
  key: "do_now" | "this_week" | "when_income_lands" | "manual" | "inactive";
  label: string;
  description: string;
  actions: T[];
};

export type AvailableSpendBreakdownRow = {
  key: keyof AvailableSpendBreakdown;
  label: string;
  amount: number;
  tone: "positive" | "negative";
};

export function isInactiveActionStatus(status: string) {
  return status === "done" || status === "skipped" || status === "blocked";
}

export function groupActionsByLane<T extends DecisionActionLike>(actions: T[]) {
  const active = actions.filter((item) => !isInactiveActionStatus(item.status));
  const inactive = actions.filter((item) => isInactiveActionStatus(item.status));
  return {
    doNow: active.filter((item) => item.lane === "do_now"),
    thisWeek: active.filter((item) => item.lane === "this_week"),
    whenIncomeLands: active.filter((item) => item.lane === "when_income_lands"),
    manual: active.filter((item) => item.lane === "manual"),
    inactive,
  };
}

export function getActionLaneSummary<T extends DecisionActionLike>(actions: T[]): ActionLaneSummary[] {
  const grouped = groupActionsByLane(actions);
  return [
    { key: "do_now", label: "Do now", count: grouped.doNow.length, tone: "urgent" },
    { key: "this_week", label: "This week", count: grouped.thisWeek.length, tone: "default" },
    { key: "when_income_lands", label: "When income lands", count: grouped.whenIncomeLands.length, tone: "accent" },
    { key: "manual", label: "Manual", count: grouped.manual.length, tone: "muted" },
    { key: "inactive", label: "Inactive", count: grouped.inactive.length, tone: "subtle" },
  ];
}

export function getVisibleActionLanes<T extends DecisionActionLike>(actions: T[]): ActionLaneSection<T>[] {
  const grouped = groupActionsByLane(actions);
  const sections: ActionLaneSection<T>[] = [
    {
      key: "do_now",
      label: "Do now",
      description: "The actions that should be resolved before anything else.",
      actions: grouped.doNow,
    },
    {
      key: "this_week",
      label: "This week",
      description: "Important, but not the first move.",
      actions: grouped.thisWeek,
    },
    {
      key: "when_income_lands",
      label: "When income lands",
      description: "The ordered moves waiting on the next reliable inflow.",
      actions: grouped.whenIncomeLands,
    },
    {
      key: "manual",
      label: "Manual",
      description: "The tasks you added yourself so they can live inside the same operating system.",
      actions: grouped.manual,
    },
    {
      key: "inactive",
      label: "Inactive",
      description: "Done, skipped, and blocked actions move here so they stop competing with live work.",
      actions: grouped.inactive,
    },
  ];

  return sections.filter((section) => section.actions.length > 0);
}

export function getAvailableSpendBreakdownRows(
  breakdown: AvailableSpendBreakdown,
): AvailableSpendBreakdownRow[] {
  const rows: AvailableSpendBreakdownRow[] = [
    { key: "liquid_cash", label: "Liquid cash", amount: breakdown.liquid_cash, tone: "positive" },
    {
      key: "reliable_income_within_horizon",
      label: "Income plans",
      amount: breakdown.reliable_income_within_horizon,
      tone: "positive",
    },
    {
      key: "expected_income_within_horizon",
      label: "Expected income",
      amount: breakdown.expected_income_within_horizon ?? 0,
      tone: "positive",
    },
    { key: "protected_buffer", label: "Protected buffer", amount: -breakdown.protected_buffer, tone: "negative" },
    { key: "active_reserves", label: "Active reserves", amount: -breakdown.active_reserves, tone: "negative" },
    { key: "overdue_obligations", label: "Overdue obligations", amount: -breakdown.overdue_obligations, tone: "negative" },
    {
      key: "obligations_due_within_horizon",
      label: "Due before next income",
      amount: -breakdown.obligations_due_within_horizon,
      tone: "negative",
    },
    {
      key: "debt_minimums_due_within_horizon",
      label: "Debt minimums",
      amount: -breakdown.debt_minimums_due_within_horizon,
      tone: "negative",
    },
    {
      key: "essentials_reserve_within_horizon",
      label: "Essentials target",
      amount: -breakdown.essentials_reserve_within_horizon,
      tone: "negative",
    },
    {
      key: "extra_allocations_within_horizon",
      label: "Planned allocations",
      amount: -breakdown.extra_allocations_within_horizon,
      tone: "negative",
    },
  ];

  return rows.filter((row) => row.amount !== 0);
}

export function describeTrend(direction: "forward" | "backward" | "steady") {
  if (direction === "forward") return "Moving forward";
  if (direction === "backward") return "Moving backward";
  return "Holding steady";
}
