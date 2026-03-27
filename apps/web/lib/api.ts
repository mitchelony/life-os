import { sampleCategories } from "@/lib/sample-data";
import { getAccessToken } from "@/lib/auth";
import type { QuickAddDraft } from "@/lib/types";

type ApiClientOptions = {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
};

type RequestOptions = {
  required?: boolean;
};

export type BackendDashboardItem = {
  label: string;
  detail: string;
  due_on?: string | null;
  amount?: number | null;
  kind: string;
};

export type BackendDashboardTransaction = {
  id: string;
  kind: "expense" | "income" | "transfer";
  amount: number;
  occurred_on: string;
  account_name?: string | null;
  category_name?: string | null;
  counterparty_name?: string | null;
  title?: string | null;
  notes?: string | null;
};

export type BackendDashboardResponse = {
  summary: {
    whats_next?: BackendDashboardItem | null;
    whats_after_that?: BackendDashboardItem | null;
    available_spend: {
      liquid_cash: number;
      protected_cash_buffer: number;
      manual_reserves: number;
      obligations_due_before_next_income: number;
      minimum_debt_payments_due_before_next_income: number;
      essential_spend_target_remaining_until_next_income: number;
      available_spend: number;
    };
    account_snapshot: {
      total_cash_available: number;
      checking_balance: number;
      savings_balance: number;
      credit_card_balance: number;
      overdue_obligations: number;
      upcoming_income: number;
    };
    top_priorities: BackendDashboardItem[];
  };
  snapshot: {
    accounts: Array<{
      id: string;
      name: string;
      institution?: string | null;
      type: "checking" | "savings" | "credit_card" | "cash" | "debt";
      balance: number;
      is_active: boolean;
      notes?: string | null;
    }>;
    obligations: Array<{
      id: string;
      name: string;
      amount: number;
      due_on: string;
      frequency: "one_time" | "weekly" | "biweekly" | "monthly" | "yearly";
      is_paid: boolean;
      is_recurring: boolean;
      notes?: string | null;
    }>;
    debts: Array<{
      id: string;
      name: string;
      balance: number;
      minimum_payment: number;
      due_on?: string | null;
      status: "active" | "paused" | "paid_off";
      notes?: string | null;
    }>;
    income_entries: Array<{
      id: string;
      source_name: string;
      amount: number;
      status: "expected" | "received" | "missed";
      expected_on?: string | null;
      received_on?: string | null;
      account_id?: string | null;
      notes?: string | null;
    }>;
    transactions: BackendDashboardTransaction[];
    settings: Record<string, string>;
  };
};

export type BackendSetupPayload = {
  display_name: string;
  protected_buffer: string;
  essential_target: string;
  savings_floor: string;
  notes: string;
  accounts: Array<{
    name: string;
    institution: string;
    type: "checking" | "savings" | "credit_card" | "cash";
    balance: string;
  }>;
  obligations: Array<{
    name: string;
    amount: string;
    due_date: string;
    recurrence: "one-time" | "weekly" | "biweekly" | "monthly";
    linked_account?: string;
  }>;
  debts: Array<{
    name: string;
    balance: string;
    minimum: string;
    due_date: string;
  }>;
  income: Array<{
    source: string;
    expected_amount: string;
    due_date: string;
    recurrence: "one-time" | "weekly" | "biweekly" | "monthly";
    linked_account?: string;
  }>;
  roadmap_items: Array<{
    id: string;
    title: string;
    description: string;
    category: "finances" | "school" | "career" | "admin" | "health" | "personal";
    status: "planned" | "active" | "blocked" | "completed" | "overdue";
    priority: "low" | "medium" | "high" | "critical";
    target_date?: string | null;
    timeframe_label?: string | null;
    progress_mode: "steps" | "percent";
    progress_value: number;
    steps: Array<{
      id: string;
      title: string;
      completed: boolean;
      dueDate?: string;
      notes?: string;
    }>;
    notes?: string | null;
    dependency_ids: string[];
    linked_strategy_goal_id?: string | null;
    strategy_backed: boolean;
  }>;
  strategy_document?: Record<string, unknown> | null;
};

export type BackendOnboardingState = {
  id: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  is_complete: boolean;
  current_step: string;
  completed_at?: string | null;
};

export type BackendOnboardingStartResponse = {
  state: BackendOnboardingState;
  profile: {
    id: string;
    owner_id: string;
    created_at: string;
    updated_at: string;
    display_name?: string | null;
    email?: string | null;
    currency: string;
    is_active: boolean;
  };
};

export type BackendOnboardingCompleteResponse = {
  state: BackendOnboardingState;
};

export type BackendAppSetting = {
  id: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  key: string;
  value: string;
};

export type BackendTaskStatus = "todo" | "doing" | "done" | "blocked";

export type BackendTask = {
  id: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  title: string;
  status: BackendTaskStatus;
  due_on?: string | null;
  linked_type?: string | null;
  linked_id?: string | null;
  notes?: string | null;
};

export type BackendTaskCreatePayload = {
  title: string;
  status?: BackendTaskStatus;
  due_on?: string | null;
  linked_type?: string | null;
  linked_id?: string | null;
  notes?: string | null;
};

export type BackendTaskUpdatePayload = Partial<BackendTaskCreatePayload>;

export type BackendTransaction = {
  id: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  kind: "expense" | "income" | "transfer";
  amount: number;
  account_id?: string | null;
  category_id?: string | null;
  merchant_id?: string | null;
  income_source_id?: string | null;
  occurred_on: string;
  notes?: string | null;
  is_planned: boolean;
  is_cleared: boolean;
};

export type BackendDecisionAction = {
  id: string;
  title: string;
  detail?: string | null;
  status: string;
  lane: string;
  source: string;
  due_on?: string | null;
  linked_type?: string | null;
  linked_id?: string | null;
};

export type BackendFreeCashAmount = {
  amount: number;
  breakdown: {
    liquid_cash: number;
    protected_buffer: number;
    active_reserves: number;
    overdue_obligations: number;
    obligations_due_within_horizon: number;
    debt_minimums_due_within_horizon: number;
    essentials_reserve_within_horizon: number;
    reliable_income_within_horizon: number;
    extra_allocations_within_horizon: number;
  };
};

export type BackendDecisionSnapshot = {
  generated_at: string;
  focus: {
    primary_action?: BackendDecisionAction | null;
    secondary_action?: BackendDecisionAction | null;
    why_now: string;
  };
  ordered_action_queue: BackendDecisionAction[];
  roadmap_summary: {
    goals: Array<{
      id: string;
      title: string;
      description: string;
      status: string;
      priority: string;
      target_date?: string | null;
      progress: number;
      linked_type?: string | null;
      linked_id?: string | null;
      metric_kind?: string | null;
      metric_start_value?: number | null;
      metric_current_value?: number | null;
      metric_target_value?: number | null;
      steps: BackendDecisionAction[];
    }>;
    plans: Array<{
      id: string;
      label: string;
      amount: number;
      expected_on?: string | null;
      is_reliable: boolean;
      status: string;
      allocations: Array<{
        id: string;
        label: string;
        allocation_type: string;
        amount: number;
        linked_type?: string | null;
        linked_id?: string | null;
      }>;
    }>;
  };
  cashflow_glance: {
    trailing_30_inflow: number;
    trailing_30_outflow: number;
    trailing_30_net: number;
    next_14_planned_inflow: number;
    next_14_required_outflow: number;
    next_income_date?: string | null;
    next_pressure_point?: string | null;
  };
  recent_updates: Array<{
    id: string;
    event_type: string;
    title: string;
    detail?: string | null;
    amount?: number | null;
    occurred_at: string;
    linked_type?: string | null;
    linked_id?: string | null;
  }>;
  progress_summary: {
    free_now: number;
    free_after_planned_income: number;
    total_debt: number;
    overdue_count: number;
    completed_actions_7d: number;
    goal_completion_rate: number;
    seven_day: {
      direction: "forward" | "backward" | "steady";
      free_now_delta: number;
      free_after_planned_income_delta: number;
      total_debt_delta: number;
      overdue_delta: number;
      completed_actions_delta: number;
    };
    thirty_day: {
      direction: "forward" | "backward" | "steady";
      free_now_delta: number;
      free_after_planned_income_delta: number;
      total_debt_delta: number;
      overdue_delta: number;
      completed_actions_delta: number;
    };
  };
  free_now: BackendFreeCashAmount;
  free_after_planned_income: BackendFreeCashAmount;
};

export type BackendAction = {
  id: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  title: string;
  detail?: string | null;
  status: string;
  lane: string;
  source: string;
  due_on?: string | null;
  linked_type?: string | null;
  linked_id?: string | null;
};

export type BackendActionCreatePayload = {
  title: string;
  detail?: string | null;
  status?: string;
  lane?: string;
  source?: string;
  due_on?: string | null;
  linked_type?: string | null;
  linked_id?: string | null;
};

export type BackendActionUpdatePayload = Partial<BackendActionCreatePayload>;

export type BackendRoadmapGoal = {
  id: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  target_date?: string | null;
  linked_type?: string | null;
  linked_id?: string | null;
  metric_kind?: string | null;
  metric_start_value?: number | null;
  metric_current_value?: number | null;
  metric_target_value?: number | null;
};

export type BackendRoadmapGoalCreatePayload = Omit<BackendRoadmapGoal, "id" | "owner_id" | "created_at" | "updated_at">;
export type BackendRoadmapGoalUpdatePayload = Partial<BackendRoadmapGoalCreatePayload>;

export type BackendRoadmapStep = {
  id: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  goal_id: string;
  title: string;
  status: string;
  due_on?: string | null;
  sort_order: number;
  linked_type?: string | null;
  linked_id?: string | null;
  notes?: string | null;
};

export type BackendRoadmapStepCreatePayload = Omit<BackendRoadmapStep, "id" | "owner_id" | "created_at" | "updated_at">;
export type BackendRoadmapStepUpdatePayload = Partial<Omit<BackendRoadmapStepCreatePayload, "goal_id">>;

export type BackendIncomePlan = {
  id: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  label: string;
  amount: number;
  expected_on?: string | null;
  is_reliable: boolean;
  status: string;
  notes?: string | null;
};

export type BackendIncomePlanCreatePayload = Omit<BackendIncomePlan, "id" | "owner_id" | "created_at" | "updated_at">;
export type BackendIncomePlanUpdatePayload = Partial<BackendIncomePlanCreatePayload>;

export type BackendIncomePlanAllocation = {
  id: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  income_plan_id: string;
  label: string;
  allocation_type: string;
  amount: number;
  sort_order: number;
  linked_type?: string | null;
  linked_id?: string | null;
  notes?: string | null;
};

export type BackendIncomePlanAllocationCreatePayload = Omit<BackendIncomePlanAllocation, "id" | "owner_id" | "created_at" | "updated_at">;
export type BackendIncomePlanAllocationUpdatePayload = Partial<Omit<BackendIncomePlanAllocationCreatePayload, "income_plan_id">>;

export type BackendRoadmapImportStep = {
  title: string;
  status?: string;
  due_on?: string | null;
  sort_order?: number;
  linked_type?: string | null;
  linked_id?: string | null;
  notes?: string | null;
};

export type BackendRoadmapImportGoal = {
  temp_id?: string | null;
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  target_date?: string | null;
  linked_type?: string | null;
  linked_id?: string | null;
  metric_kind?: string | null;
  metric_start_value?: number | null;
  metric_current_value?: number | null;
  metric_target_value?: number | null;
  steps?: BackendRoadmapImportStep[];
};

export type BackendRoadmapImportAllocation = {
  label: string;
  allocation_type: string;
  amount: number;
  sort_order?: number;
  linked_type?: string | null;
  linked_id?: string | null;
  notes?: string | null;
};

export type BackendRoadmapImportIncomePlan = {
  temp_id?: string | null;
  label: string;
  amount: number;
  expected_on?: string | null;
  is_reliable?: boolean;
  status?: string;
  notes?: string | null;
  allocations?: BackendRoadmapImportAllocation[];
};

export type BackendRoadmapImportPayload = {
  version?: number;
  reset_planning_first?: boolean;
  goals?: BackendRoadmapImportGoal[];
  income_plans?: BackendRoadmapImportIncomePlan[];
};

export type BackendRoadmapImportResult = {
  goals_created: number;
  steps_created: number;
  income_plans_created: number;
  allocations_created: number;
  goal_ids: Record<string, string>;
  income_plan_ids: Record<string, string>;
};

export type BackendRoadmapImportV2Payload = {
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

export type BackendRoadmapImportV2Result = {
  goals_created: number;
  steps_created: number;
  income_plans_created: number;
  allocations_created: number;
  cash_reserves_created: number;
  expected_income_entries_created: number;
  obligations_created: number;
  debts_created: number;
  actions_created: number;
};

export type BackendQuickAddResponse = {
  ok: boolean;
  transaction_id?: string | null;
  obligation_id?: string | null;
  income_entry_id?: string | null;
};

export type BackendRoadmapCopilotPreviewGoal = {
  title: string;
  priority: string;
  step_count: number;
};

export type BackendRoadmapCopilotPreviewIncomePlan = {
  label: string;
  amount: number;
  allocation_count: number;
};

export type BackendRoadmapCopilotPreviewAction = {
  title: string;
  lane: string;
};

export type BackendRoadmapCopilotPreview = {
  goals: BackendRoadmapCopilotPreviewGoal[];
  income_plans: BackendRoadmapCopilotPreviewIncomePlan[];
  actions: BackendRoadmapCopilotPreviewAction[];
  preserved_income_entries: number;
};

export type BackendRoadmapCopilotDraftResponse = {
  draft_id: string;
  status: string;
  summary: string;
  rationale: string;
  warnings: string[];
  preview: BackendRoadmapCopilotPreview;
  payload: BackendRoadmapImportV2Payload;
  message: string;
  planner_source: string;
};

export type BackendRoadmapCopilotCurrentResponse = {
  draft: BackendRoadmapCopilotDraftResponse | null;
};

export type BackendRoadmapCopilotApproveResponse = {
  draft: BackendRoadmapCopilotDraftResponse;
  import_result: BackendRoadmapImportV2Result;
};

export type BackendRoadmapCopilotDenyResponse = {
  draft: BackendRoadmapCopilotDraftResponse | null;
};

export type BackendRoadmapCopilotEmergencyExpenseRequest = {
  message: string;
  amount: number;
  title: string;
  merchant_or_source: string;
  category: string;
  account: string;
  date: string;
  notes?: string;
};

export type BackendRoadmapCopilotEmergencyExpenseResponse = {
  quick_add: BackendQuickAddResponse;
  draft: BackendRoadmapCopilotDraftResponse;
};

export type BackendDebt = {
  id: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  name: string;
  balance: number;
  minimum_payment: number;
  due_on?: string | null;
  status: "active" | "paused" | "paid_off";
  notes?: string | null;
};

export type BackendObligation = {
  id: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  name: string;
  amount: number;
  due_on: string;
  frequency: "one_time" | "weekly" | "biweekly" | "monthly" | "yearly";
  is_paid: boolean;
  is_recurring: boolean;
  notes?: string | null;
};

export type BackendAccount = {
  id: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  name: string;
  institution?: string | null;
  type: "checking" | "savings" | "credit_card" | "cash" | "debt";
  balance: number;
  is_active: boolean;
  notes?: string | null;
  linked_record_count?: number;
  can_delete?: boolean;
};

export type BackendAccountCreatePayload = {
  name: string;
  type: BackendAccount["type"];
  institution?: string | null;
  balance?: number;
  is_active?: boolean;
  notes?: string | null;
};

export type BackendAccountUpdatePayload = Partial<BackendAccountCreatePayload>;

export type BackendIncomeEntry = {
  id: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  source_name: string;
  amount: number;
  status: "expected" | "received" | "missed";
  expected_on?: string | null;
  received_on?: string | null;
  account_id?: string | null;
  notes?: string | null;
};

export type BackendIncomeEntryCreatePayload = {
  source_name: string;
  amount: number;
  status?: "expected" | "received" | "missed";
  expected_on?: string | null;
  received_on?: string | null;
  account_id?: string | null;
  notes?: string | null;
};

export type BackendIncomeEntryUpdatePayload = Partial<BackendIncomeEntryCreatePayload>;

export type BackendIncomeEntryConfirmPayload = {
  received_on?: string | null;
  account_id?: string | null;
};

export type BackendIncomeEntryConfirmResponse = {
  income_entry: BackendIncomeEntry;
  transaction_id: string;
};

export type BackendPlanningContextExport = {
  version: number;
  exported_at: string;
  owner_id: string;
  settings: Record<string, string>;
  accounts: BackendAccount[];
  debts: BackendDebt[];
  obligations: BackendObligation[];
  expected_income_entries: BackendIncomeEntry[];
  expense_transactions: BackendTransaction[];
  actions: BackendAction[];
  roadmap_goals: BackendRoadmapGoal[];
  roadmap_steps: BackendRoadmapStep[];
  income_plans: BackendIncomePlan[];
  income_plan_allocations: BackendIncomePlanAllocation[];
  allowed_values: {
    account_types: string[];
    debt_statuses: string[];
    obligation_frequencies: string[];
    income_statuses: string[];
    action_statuses: string[];
    action_lanes: string[];
    action_sources: string[];
    roadmap_goal_statuses: string[];
    roadmap_goal_priorities: string[];
    roadmap_step_statuses: string[];
    income_plan_statuses: string[];
    income_allocation_types: string[];
  };
};

function requestErrorMessage(path: string) {
  return `Request failed for ${path}`;
}

function resolveBrowserAwareBaseUrl(baseUrl: string) {
  if (!baseUrl || typeof window === "undefined") return baseUrl;
  if (process.env.NODE_ENV === "production") return baseUrl;

  try {
    const parsed = new URL(baseUrl);
    const currentHost = window.location.hostname;
    const currentProtocol = window.location.protocol;
    const isLoopbackTarget =
      parsed.hostname === "localhost" ||
      parsed.hostname === "127.0.0.1" ||
      parsed.hostname === "0.0.0.0";
    const isLoopbackViewer =
      currentHost === "localhost" ||
      currentHost === "127.0.0.1" ||
      currentHost === "0.0.0.0";

    if (isLoopbackTarget && !isLoopbackViewer) {
      parsed.hostname = currentHost;
      parsed.protocol = currentProtocol;
      return parsed.toString().replace(/\/$/, "");
    }

    return parsed.toString().replace(/\/$/, "");
  } catch {
    return baseUrl;
  }
}

async function safeJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export function createApiClient(options: ApiClientOptions = {}) {
  const baseUrl = resolveBrowserAwareBaseUrl(options.baseUrl ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "");
  const fetchImpl = options.fetchImpl ?? fetch;

  const getHeaders = async (extraHeaders?: HeadersInit) => {
    const headers = new Headers(extraHeaders);
    const accessToken = await getAccessToken();
    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }
    return headers;
  };

  const get = async <T,>(path: string, fallback: T, options: RequestOptions = {}): Promise<T> => {
    if (!baseUrl) {
      if (options.required) {
        throw new Error(requestErrorMessage(path));
      }
      return fallback;
    }
    try {
      const response = await fetchImpl(`${baseUrl}${path}`, {
        cache: "no-store",
        headers: await getHeaders(),
      });
      return await safeJson<T>(response);
    } catch (error) {
      if (options.required) {
        throw error instanceof Error ? error : new Error(requestErrorMessage(path));
      }
      return fallback;
    }
  };

  const post = async <T,>(path: string, body: unknown, fallback: T, options: RequestOptions = {}): Promise<T> => {
    if (!baseUrl) {
      if (options.required) {
        throw new Error(requestErrorMessage(path));
      }
      return fallback;
    }
    try {
      const response = await fetchImpl(`${baseUrl}${path}`, {
        method: "POST",
        headers: await getHeaders({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify(body),
      });
      return await safeJson<T>(response);
    } catch (error) {
      if (options.required) {
        throw error instanceof Error ? error : new Error(requestErrorMessage(path));
      }
      return fallback;
    }
  };

  const put = async <T,>(path: string, body: unknown, fallback: T, options: RequestOptions = {}): Promise<T> => {
    if (!baseUrl) {
      if (options.required) {
        throw new Error(requestErrorMessage(path));
      }
      return fallback;
    }
    try {
      const response = await fetchImpl(`${baseUrl}${path}`, {
        method: "PUT",
        headers: await getHeaders({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify(body),
      });
      return await safeJson<T>(response);
    } catch (error) {
      if (options.required) {
        throw error instanceof Error ? error : new Error(requestErrorMessage(path));
      }
      return fallback;
    }
  };

  const patch = async <T,>(path: string, body: unknown, fallback: T, options: RequestOptions = {}): Promise<T> => {
    if (!baseUrl) {
      if (options.required) {
        throw new Error(requestErrorMessage(path));
      }
      return fallback;
    }
    try {
      const response = await fetchImpl(`${baseUrl}${path}`, {
        method: "PATCH",
        headers: await getHeaders({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify(body),
      });
      return await safeJson<T>(response);
    } catch (error) {
      if (options.required) {
        throw error instanceof Error ? error : new Error(requestErrorMessage(path));
      }
      return fallback;
    }
  };

  const del = async (path: string, options: RequestOptions = {}): Promise<void> => {
    if (!baseUrl) {
      if (options.required) {
        throw new Error(requestErrorMessage(path));
      }
      return;
    }
    try {
      const response = await fetchImpl(`${baseUrl}${path}`, {
        method: "DELETE",
        headers: await getHeaders(),
      });
      if (!response.ok) {
        throw new Error(`Request failed with ${response.status}`);
      }
    } catch (error) {
      if (options.required) {
        throw error instanceof Error ? error : new Error(requestErrorMessage(path));
      }
    }
  };

  return {
    getDecisionSnapshot: () => get<BackendDecisionSnapshot | null>("/dashboard", null, { required: true }),
    getDashboardData: () => get<BackendDashboardResponse | null>("/dashboard", null),
    getSetup: () =>
      get<BackendSetupPayload>("/settings/bootstrap", {
        display_name: "Life owner",
        protected_buffer: "0",
        essential_target: "0",
        savings_floor: "0",
        notes: "",
        accounts: [],
        obligations: [],
        debts: [],
        income: [],
        roadmap_items: [],
        strategy_document: null,
      }),
    saveSetup: (payload: BackendSetupPayload) => put("/settings/bootstrap", payload, payload, { required: true }),
    startOnboarding: () => post<BackendOnboardingStartResponse | null>("/onboarding/start", {}, null, { required: true }),
    completeOnboarding: () => post<BackendOnboardingCompleteResponse | null>("/onboarding/complete", {}, null, { required: true }),
    getCategories: async () => {
      const payload = await get<Array<string | { name: string }>>("/categories", sampleCategories);
      return payload.map((item) => (typeof item === "string" ? item : item.name));
    },
    searchMerchants: (query: string) => get<string[]>(`/suggestions/merchants?q=${encodeURIComponent(query)}`, []),
    searchSources: (query: string) => get<string[]>(`/suggestions/sources?q=${encodeURIComponent(query)}`, []),
    listTasks: () => get<BackendTask[]>("/tasks", [], { required: true }),
    listDebts: () => get<BackendDebt[]>("/debts", [], { required: true }),
    listObligations: () => get<BackendObligation[]>("/obligations", [], { required: true }),
    listAccounts: () => get<BackendAccount[]>("/accounts", [], { required: true }),
    createAccount: (payload: BackendAccountCreatePayload) =>
      post<BackendAccount>(
        "/accounts",
        payload,
        {
          id: "account-draft",
          owner_id: "",
          created_at: "",
          updated_at: "",
          name: payload.name,
          type: payload.type,
          institution: payload.institution ?? null,
          balance: payload.balance ?? 0,
          is_active: payload.is_active ?? true,
          notes: payload.notes ?? null,
          linked_record_count: 0,
          can_delete: true,
        },
        { required: true },
      ),
    updateAccount: (accountId: string, payload: BackendAccountUpdatePayload) =>
      patch<BackendAccount>(
        `/accounts/${accountId}`,
        payload,
        {
          id: accountId,
          owner_id: "",
          created_at: "",
          updated_at: "",
          name: payload.name ?? "",
          type: payload.type ?? "checking",
          institution: payload.institution ?? null,
          balance: payload.balance ?? 0,
          is_active: payload.is_active ?? true,
          notes: payload.notes ?? null,
          linked_record_count: 0,
          can_delete: true,
        },
        { required: true },
      ),
    deleteAccount: (accountId: string) => del(`/accounts/${accountId}`, { required: true }),
    listIncomeEntries: () => get<BackendIncomeEntry[]>("/income-entries", [], { required: true }),
    listSettings: () => get<BackendAppSetting[]>("/settings", [], { required: true }),
    upsertSetting: (key: string, value: string) =>
      put<BackendAppSetting>(
        `/settings/${encodeURIComponent(key)}`,
        { value },
        {
          id: "setting-draft",
          owner_id: "",
          created_at: "",
          updated_at: "",
          key,
          value,
        },
        { required: true },
      ),
    createTask: (payload: BackendTaskCreatePayload) =>
      post<BackendTask>("/tasks", payload, {
        id: "task-draft",
        owner_id: "",
        created_at: "",
        updated_at: "",
        title: payload.title,
        status: payload.status ?? "todo",
        due_on: payload.due_on ?? null,
        linked_type: payload.linked_type ?? null,
        linked_id: payload.linked_id ?? null,
        notes: payload.notes ?? null,
      }, { required: true }),
    updateTask: (taskId: string, payload: BackendTaskUpdatePayload) =>
      patch<BackendTask>(`/tasks/${taskId}`, payload, {
        id: taskId,
        owner_id: "",
        created_at: "",
        updated_at: "",
        title: payload.title ?? "",
        status: payload.status ?? "todo",
        due_on: payload.due_on ?? null,
        linked_type: payload.linked_type ?? null,
        linked_id: payload.linked_id ?? null,
        notes: payload.notes ?? null,
      }, { required: true }),
    deleteTask: (taskId: string) => del(`/tasks/${taskId}`, { required: true }),
    listActions: () => get<BackendAction[]>("/actions", [], { required: true }),
    createAction: (payload: BackendActionCreatePayload) =>
      post<BackendAction>("/actions", payload, {
        id: "action-draft",
        owner_id: "",
        created_at: "",
        updated_at: "",
        title: payload.title,
        detail: payload.detail ?? null,
        status: payload.status ?? "todo",
        lane: payload.lane ?? "manual",
        source: payload.source ?? "manual",
        due_on: payload.due_on ?? null,
        linked_type: payload.linked_type ?? null,
        linked_id: payload.linked_id ?? null,
      }, { required: true }),
    updateAction: (actionId: string, payload: BackendActionUpdatePayload) =>
      patch<BackendAction>(`/actions/${actionId}`, payload, {
        id: actionId,
        owner_id: "",
        created_at: "",
        updated_at: "",
        title: payload.title ?? "",
        detail: payload.detail ?? null,
        status: payload.status ?? "todo",
        lane: payload.lane ?? "manual",
        source: payload.source ?? "manual",
        due_on: payload.due_on ?? null,
        linked_type: payload.linked_type ?? null,
        linked_id: payload.linked_id ?? null,
      }, { required: true }),
    deleteAction: (actionId: string) => del(`/actions/${actionId}`, { required: true }),
    listRoadmapGoals: () => get<BackendRoadmapGoal[]>("/roadmap/goals", [], { required: true }),
    createRoadmapGoal: (payload: BackendRoadmapGoalCreatePayload) =>
      post<BackendRoadmapGoal>("/roadmap/goals", payload, {
        id: "goal-draft",
        owner_id: "",
        created_at: "",
        updated_at: "",
        ...payload,
      }, { required: true }),
    updateRoadmapGoal: (goalId: string, payload: BackendRoadmapGoalUpdatePayload) =>
      patch<BackendRoadmapGoal>(`/roadmap/goals/${goalId}`, payload, {
        id: goalId,
        owner_id: "",
        created_at: "",
        updated_at: "",
        title: payload.title ?? "",
        description: payload.description ?? "",
        status: payload.status ?? "active",
        priority: payload.priority ?? "medium",
        target_date: payload.target_date ?? null,
        linked_type: payload.linked_type ?? null,
        linked_id: payload.linked_id ?? null,
        metric_kind: payload.metric_kind ?? null,
        metric_start_value: payload.metric_start_value ?? null,
        metric_current_value: payload.metric_current_value ?? null,
        metric_target_value: payload.metric_target_value ?? null,
      }, { required: true }),
    createRoadmapStep: (payload: BackendRoadmapStepCreatePayload) =>
      post<BackendRoadmapStep>("/roadmap/steps", payload, {
        id: "step-draft",
        owner_id: "",
        created_at: "",
        updated_at: "",
        ...payload,
      }, { required: true }),
    updateRoadmapStep: (stepId: string, payload: BackendRoadmapStepUpdatePayload) =>
      patch<BackendRoadmapStep>(`/roadmap/steps/${stepId}`, payload, {
        id: stepId,
        owner_id: "",
        created_at: "",
        updated_at: "",
        goal_id: "",
        title: payload.title ?? "",
        status: payload.status ?? "todo",
        due_on: payload.due_on ?? null,
        sort_order: payload.sort_order ?? 0,
        linked_type: payload.linked_type ?? null,
        linked_id: payload.linked_id ?? null,
        notes: payload.notes ?? null,
      }, { required: true }),
    createIncomePlan: (payload: BackendIncomePlanCreatePayload) =>
      post<BackendIncomePlan>("/income-plans", payload, {
        id: "income-plan-draft",
        owner_id: "",
        created_at: "",
        updated_at: "",
        ...payload,
      }, { required: true }),
    updateIncomePlan: (planId: string, payload: BackendIncomePlanUpdatePayload) =>
      patch<BackendIncomePlan>(`/income-plans/${planId}`, payload, {
        id: planId,
        owner_id: "",
        created_at: "",
        updated_at: "",
        label: payload.label ?? "",
        amount: payload.amount ?? 0,
        expected_on: payload.expected_on ?? null,
        is_reliable: payload.is_reliable ?? true,
        status: payload.status ?? "planned",
        notes: payload.notes ?? null,
      }, { required: true }),
    createIncomePlanAllocation: (payload: BackendIncomePlanAllocationCreatePayload) =>
      post<BackendIncomePlanAllocation>("/income-plan-allocations", payload, {
        id: "income-plan-allocation-draft",
        owner_id: "",
        created_at: "",
        updated_at: "",
        ...payload,
      }, { required: true }),
    createIncomeEntry: (payload: BackendIncomeEntryCreatePayload) =>
      post<BackendIncomeEntry>("/income-entries", payload, {
        id: "income-entry-draft",
        owner_id: "",
        created_at: "",
        updated_at: "",
        source_name: payload.source_name,
        amount: payload.amount,
        status: payload.status ?? "expected",
        expected_on: payload.expected_on ?? null,
        received_on: payload.received_on ?? null,
        account_id: payload.account_id ?? null,
        notes: payload.notes ?? null,
      }, { required: true }),
    updateIncomeEntry: (entryId: string, payload: BackendIncomeEntryUpdatePayload) =>
      patch<BackendIncomeEntry>(`/income-entries/${entryId}`, payload, {
        id: entryId,
        owner_id: "",
        created_at: "",
        updated_at: "",
        source_name: payload.source_name ?? "",
        amount: payload.amount ?? 0,
        status: payload.status ?? "expected",
        expected_on: payload.expected_on ?? null,
        received_on: payload.received_on ?? null,
        account_id: payload.account_id ?? null,
        notes: payload.notes ?? null,
      }, { required: true }),
    deleteIncomeEntry: (entryId: string) => del(`/income-entries/${entryId}`, { required: true }),
    confirmIncomeEntry: (entryId: string, payload: BackendIncomeEntryConfirmPayload) =>
      post<BackendIncomeEntryConfirmResponse>(`/income-entries/${entryId}/confirm`, payload, {
        income_entry: {
          id: entryId,
          owner_id: "",
          created_at: "",
          updated_at: "",
          source_name: "",
          amount: 0,
          status: "received",
          expected_on: null,
          received_on: payload.received_on ?? null,
          account_id: payload.account_id ?? null,
          notes: null,
        },
        transaction_id: "",
      }, { required: true }),
    importRoadmap: (payload: BackendRoadmapImportPayload) =>
      post<BackendRoadmapImportResult>("/roadmap/import", payload, {
        goals_created: 0,
        steps_created: 0,
        income_plans_created: 0,
        allocations_created: 0,
        goal_ids: {},
        income_plan_ids: {},
      }, { required: true }),
    getPlanningContextExport: () => get<BackendPlanningContextExport | null>("/planning/context-export", null, { required: true }),
    importRoadmapV2: (payload: BackendRoadmapImportV2Payload) =>
      post<BackendRoadmapImportV2Result>(
        "/roadmap/import",
        payload,
        {
          goals_created: 0,
          steps_created: 0,
          income_plans_created: 0,
          allocations_created: 0,
          cash_reserves_created: 0,
          expected_income_entries_created: 0,
          obligations_created: 0,
          debts_created: 0,
          actions_created: 0,
        },
        { required: true },
      ),
    getRoadmapCopilotCurrent: () =>
      get<BackendRoadmapCopilotCurrentResponse>(
        "/roadmap/copilot/current",
        { draft: null },
        { required: true },
      ),
    createRoadmapCopilotDraft: (message: string) =>
      post<BackendRoadmapCopilotDraftResponse>(
        "/roadmap/copilot/draft",
        { message },
        {
          draft_id: "copilot-draft",
          status: "draft",
          summary: "",
          rationale: "",
          warnings: [],
          preview: {
            goals: [],
            income_plans: [],
            actions: [],
            preserved_income_entries: 0,
          },
          payload: {
            version: 2,
            reset_planning_first: true,
            goals: [],
            income_plans: [],
            cash_reserves: [],
            expected_income_entries: [],
            obligations: [],
            debts: [],
            actions: [],
          },
          message,
          planner_source: "copilot",
        },
        { required: true },
      ),
    reviseRoadmapCopilotDraft: (draftId: string, revisionNote: string) =>
      post<BackendRoadmapCopilotDraftResponse>(
        "/roadmap/copilot/revise",
        { draft_id: draftId, revision_note: revisionNote },
        {
          draft_id: draftId,
          status: "draft",
          summary: "",
          rationale: "",
          warnings: [],
          preview: {
            goals: [],
            income_plans: [],
            actions: [],
            preserved_income_entries: 0,
          },
          payload: {
            version: 2,
            reset_planning_first: true,
            goals: [],
            income_plans: [],
            cash_reserves: [],
            expected_income_entries: [],
            obligations: [],
            debts: [],
            actions: [],
          },
          message: revisionNote,
          planner_source: "copilot-revision",
        },
        { required: true },
      ),
    approveRoadmapCopilotDraft: (draftId: string) =>
      post<BackendRoadmapCopilotApproveResponse>(
        "/roadmap/copilot/approve",
        { draft_id: draftId },
        {
          draft: {
            draft_id: draftId,
            status: "approved",
            summary: "",
            rationale: "",
            warnings: [],
            preview: {
              goals: [],
              income_plans: [],
              actions: [],
              preserved_income_entries: 0,
            },
            payload: {
              version: 2,
              reset_planning_first: true,
              goals: [],
              income_plans: [],
              cash_reserves: [],
              expected_income_entries: [],
              obligations: [],
              debts: [],
              actions: [],
            },
            message: "",
            planner_source: "copilot",
          },
          import_result: {
            goals_created: 0,
            steps_created: 0,
            income_plans_created: 0,
            allocations_created: 0,
            cash_reserves_created: 0,
            expected_income_entries_created: 0,
            obligations_created: 0,
            debts_created: 0,
            actions_created: 0,
          },
        },
        { required: true },
      ),
    denyRoadmapCopilotDraft: (draftId: string) =>
      post<BackendRoadmapCopilotDenyResponse>(
        "/roadmap/copilot/deny",
        { draft_id: draftId },
        { draft: null },
        { required: true },
      ),
    submitRoadmapCopilotEmergencyExpense: (payload: BackendRoadmapCopilotEmergencyExpenseRequest) =>
      post<BackendRoadmapCopilotEmergencyExpenseResponse>(
        "/roadmap/copilot/emergency-expense",
        payload,
        {
          quick_add: {
            ok: true,
            transaction_id: null,
            obligation_id: null,
            income_entry_id: null,
          },
          draft: {
            draft_id: "copilot-emergency",
            status: "draft",
            summary: "",
            rationale: "",
            warnings: [],
            preview: {
              goals: [],
              income_plans: [],
              actions: [],
              preserved_income_entries: 0,
            },
            payload: {
              version: 2,
              reset_planning_first: true,
              goals: [],
              income_plans: [],
              cash_reserves: [],
              expected_income_entries: [],
              obligations: [],
              debts: [],
              actions: [],
            },
            message: payload.message,
            planner_source: "copilot-emergency",
          },
        },
        { required: true },
      ),
    relaunchPlanning: () => post<void>("/planning/relaunch", {}, undefined, { required: true }),
    submitQuickAdd: (draft: QuickAddDraft) =>
      post(
        "/quick-add",
        {
          kind: draft.kind,
          amount: Number(draft.amount || 0),
          title: draft.title,
          merchant_or_source: draft.merchantOrSource,
          category: draft.category,
          account: draft.account,
          date: draft.date,
          notes: draft.notes,
          status: draft.status ?? "received",
          recurrence: draft.recurrence ?? "one-time",
          save_as_obligation: draft.saveAsObligation ?? false,
          obligation_due_date: draft.obligationDueDate,
        },
        {
          ok: true,
          draft,
        },
        { required: true },
      ),
  };
}

export const api = createApiClient();
