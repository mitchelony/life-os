import type {
  BackendRoadmapImportAllocation,
  BackendRoadmapImportGoal,
  BackendRoadmapImportIncomePlan,
  BackendRoadmapImportPayload,
  BackendRoadmapImportStep,
} from "@/lib/api";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readOptionalString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function readOptionalNullableString(value: unknown) {
  return value === null || typeof value === "string" ? value : undefined;
}

function readOptionalNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readOptionalBoolean(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

function parseStep(value: unknown, index: number): BackendRoadmapImportStep {
  if (!isRecord(value)) {
    throw new Error(`Goal step ${index + 1} must be an object.`);
  }
  const title = readOptionalString(value.title)?.trim();
  if (!title) {
    throw new Error(`Goal step ${index + 1} needs a title.`);
  }
  return {
    title,
    status: readOptionalString(value.status),
    due_on: readOptionalNullableString(value.due_on),
    sort_order: readOptionalNumber(value.sort_order),
    linked_type: readOptionalNullableString(value.linked_type),
    linked_id: readOptionalNullableString(value.linked_id),
    notes: readOptionalNullableString(value.notes),
  };
}

function parseGoal(value: unknown, index: number): BackendRoadmapImportGoal {
  if (!isRecord(value)) {
    throw new Error(`Goal ${index + 1} must be an object.`);
  }
  const title = readOptionalString(value.title)?.trim();
  if (!title) {
    throw new Error(`Goal ${index + 1} needs a title.`);
  }
  const rawSteps = value.steps;
  if (rawSteps !== undefined && !Array.isArray(rawSteps)) {
    throw new Error(`Goal ${index + 1} steps must be an array.`);
  }

  return {
    temp_id: readOptionalNullableString(value.temp_id),
    title,
    description: readOptionalString(value.description)?.trim(),
    status: readOptionalString(value.status),
    priority: readOptionalString(value.priority),
    target_date: readOptionalNullableString(value.target_date),
    linked_type: readOptionalNullableString(value.linked_type),
    linked_id: readOptionalNullableString(value.linked_id),
    metric_kind: readOptionalNullableString(value.metric_kind),
    metric_start_value: readOptionalNumber(value.metric_start_value),
    metric_current_value: readOptionalNumber(value.metric_current_value),
    metric_target_value: readOptionalNumber(value.metric_target_value),
    steps: (rawSteps ?? []).map((step, stepIndex) => parseStep(step, stepIndex)),
  };
}

function parseAllocation(value: unknown, index: number): BackendRoadmapImportAllocation {
  if (!isRecord(value)) {
    throw new Error(`Allocation ${index + 1} must be an object.`);
  }
  const label = readOptionalString(value.label)?.trim();
  if (!label) {
    throw new Error(`Allocation ${index + 1} needs a label.`);
  }
  const amount = readOptionalNumber(value.amount);
  if (amount === undefined) {
    throw new Error(`Allocation ${index + 1} needs a numeric amount.`);
  }
  return {
    label,
    allocation_type: readOptionalString(value.allocation_type) ?? "manual",
    amount,
    sort_order: readOptionalNumber(value.sort_order),
    linked_type: readOptionalNullableString(value.linked_type),
    linked_id: readOptionalNullableString(value.linked_id),
    notes: readOptionalNullableString(value.notes),
  };
}

function parseIncomePlan(value: unknown, index: number): BackendRoadmapImportIncomePlan {
  if (!isRecord(value)) {
    throw new Error(`Income plan ${index + 1} must be an object.`);
  }
  const label = readOptionalString(value.label)?.trim();
  if (!label) {
    throw new Error(`Income plan ${index + 1} needs a label.`);
  }
  const amount = readOptionalNumber(value.amount);
  if (amount === undefined) {
    throw new Error(`Income plan ${index + 1} needs a numeric amount.`);
  }
  const rawAllocations = value.allocations;
  if (rawAllocations !== undefined && !Array.isArray(rawAllocations)) {
    throw new Error(`Income plan ${index + 1} allocations must be an array.`);
  }

  return {
    temp_id: readOptionalNullableString(value.temp_id),
    label,
    amount,
    expected_on: readOptionalNullableString(value.expected_on),
    is_reliable: readOptionalBoolean(value.is_reliable),
    status: readOptionalString(value.status),
    notes: readOptionalNullableString(value.notes),
    allocations: (rawAllocations ?? []).map((allocation, allocationIndex) => parseAllocation(allocation, allocationIndex)),
  };
}

export function parseRoadmapImportPayload(input: string): BackendRoadmapImportPayload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch {
    throw new Error("Import JSON is not valid.");
  }

  if (!isRecord(parsed)) {
    throw new Error("Import JSON must be an object.");
  }

  const rawGoals = parsed.goals;
  const rawIncomePlans = parsed.income_plans;

  if (rawGoals !== undefined && !Array.isArray(rawGoals)) {
    throw new Error("goals must be an array.");
  }
  if (rawIncomePlans !== undefined && !Array.isArray(rawIncomePlans)) {
    throw new Error("income_plans must be an array.");
  }

  return {
    version: readOptionalNumber(parsed.version),
    reset_planning_first: readOptionalBoolean(parsed.reset_planning_first),
    goals: (rawGoals ?? []).map((goal, index) => parseGoal(goal, index)),
    income_plans: (rawIncomePlans ?? []).map((plan, index) => parseIncomePlan(plan, index)),
  };
}

export const roadmapImportAllowedValues = {
  goal_statuses: ["active", "planned", "blocked", "completed"],
  goal_priorities: ["low", "medium", "high", "critical"],
  step_statuses: ["todo", "in_progress", "blocked", "done"],
  income_plan_statuses: ["planned", "cancelled", "received"],
  allocation_types: ["obligation_payment", "debt_payment", "buffer", "essentials", "manual"],
  linked_types: ["debt", "obligation"],
} as const;

export const roadmapImportTemplate = `{
  "version": 1,
  "reset_planning_first": true,
  "goals": [
    {
      "temp_id": "goal_utilities",
      "title": "Get utilities current",
      "description": "Stop overdue utility pressure and get back to current payments.",
      "status": "active",
      "priority": "critical",
      "target_date": "2026-04-15",
      "linked_type": "obligation",
      "linked_id": "REAL_OBLIGATION_ID",
      "steps": [
        {
          "title": "Call utility company",
          "status": "todo",
          "due_on": "2026-03-27",
          "sort_order": 0,
          "linked_type": "obligation",
          "linked_id": "REAL_OBLIGATION_ID",
          "notes": "Ask for a payment arrangement."
        }
      ]
    }
  ],
  "income_plans": [
    {
      "temp_id": "plan_paycheck_1",
      "label": "Next paycheck",
      "amount": 900,
      "expected_on": "2026-03-29",
      "is_reliable": true,
      "status": "planned",
      "notes": "Required bills first, then debt pressure.",
      "allocations": [
        {
          "label": "Utilities catch-up",
          "allocation_type": "obligation_payment",
          "amount": 250,
          "sort_order": 0,
          "linked_type": "obligation",
          "linked_id": "REAL_OBLIGATION_ID"
        },
        {
          "label": "Capital One minimum",
          "allocation_type": "debt_payment",
          "amount": 75,
          "sort_order": 1,
          "linked_type": "debt",
          "linked_id": "REAL_DEBT_ID"
        }
      ]
    }
  ]
}`;
