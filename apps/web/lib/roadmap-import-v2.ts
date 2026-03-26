export type RoadmapImportV2Payload = {
  version: 2;
  reset_planning_first?: boolean;
  goals: Array<Record<string, unknown>>;
  income_plans: Array<Record<string, unknown>>;
  cash_reserves: Array<Record<string, unknown>>;
  expected_income_entries: Array<Record<string, unknown>>;
  obligations: Array<Record<string, unknown>>;
  debts: Array<Record<string, unknown>>;
  actions: Array<Record<string, unknown>>;
  allowed_values?: Record<string, unknown>;
};

function normalizeJsonInput(value: string) {
  return value
    .replace(/[\u201C\u201D]/g, "\"")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\u00A0/g, " ")
    .trim();
}

export function parseRoadmapImportV2(raw: string): RoadmapImportV2Payload {
  const normalized = normalizeJsonInput(raw);
  if (!normalized) {
    throw new Error("Paste a roadmap import payload first");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(normalized);
  } catch {
    throw new Error("Roadmap import is not valid JSON");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Roadmap import must be a JSON object");
  }

  const payload = parsed as Partial<RoadmapImportV2Payload>;
  if (payload.version !== 2) {
    throw new Error("Roadmap import must use version 2");
  }

  for (const key of ["goals", "income_plans", "cash_reserves", "expected_income_entries", "obligations", "debts", "actions"]) {
    if (!Array.isArray((payload as Record<string, unknown>)[key])) {
      throw new Error(`Roadmap import is missing \`${key}\``);
    }
  }

  return payload as RoadmapImportV2Payload;
}

export const roadmapImportV2Template = JSON.stringify(
  {
    version: 2,
    reset_planning_first: true,
    goals: [],
    income_plans: [],
    cash_reserves: [],
    expected_income_entries: [],
    obligations: [],
    debts: [],
    actions: [],
    allowed_values: {
      goal_categories: ["finances", "school", "career", "admin", "health", "personal"],
      goal_statuses: ["active", "planned", "blocked", "completed"],
      goal_priorities: ["low", "medium", "high", "critical"],
      step_statuses: ["todo", "in_progress", "blocked", "done"],
      linked_types: ["obligation", "debt", "income", "manual", "account"],
      income_plan_statuses: ["planned", "cancelled", "received"],
      income_allocation_types: ["obligation_payment", "debt_payment", "buffer", "essentials", "manual"],
      allocation_statuses: ["planned", "reserved", "paid", "skipped", "changed"],
      cash_reserve_purpose_types: ["taxes", "buffer", "debt", "utilities", "essentials", "custom"],
      income_statuses: ["expected", "received", "missed"],
      income_categories: ["paycheck", "side_gig", "refund", "family_support", "scholarship", "other"],
      obligation_frequencies: ["one_time", "weekly", "biweekly", "monthly", "yearly"],
      debt_statuses: ["active", "paused", "paid_off"],
      action_statuses: ["todo", "in_progress", "blocked", "done", "skipped"],
      action_lanes: ["do_now", "this_week", "when_income_lands", "manual"],
      action_sources: ["system", "manual", "goal"],
    },
  },
  null,
  2,
);
