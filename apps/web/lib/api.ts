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

function requestErrorMessage(path: string) {
  return `Request failed for ${path}`;
}

async function safeJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export function createApiClient(options: ApiClientOptions = {}) {
  const baseUrl = options.baseUrl ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
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

  return {
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
