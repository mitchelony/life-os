import { sampleCategories, sampleDashboard } from "@/lib/sample-data";
import type { DashboardSnapshot, QuickAddDraft } from "@/lib/types";

type ApiClientOptions = {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
};

async function safeJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`);
  }
  return response.json() as Promise<T>;
}

type BackendDashboardItem = {
  label: string;
  detail: string;
  due_on?: string | null;
  amount?: number | null;
  kind: string;
};

type BackendDashboardResponse = {
  summary: {
    whats_next?: BackendDashboardItem | null;
    whats_after_that?: BackendDashboardItem | null;
    available_spend: {
      liquid_cash: number;
      reliable_income_before_next_income?: number;
      protected_cash_buffer: number;
      manual_reserves: number;
      obligations_due_before_next_income: number;
      minimum_debt_payments_due_before_next_income: number;
      essential_spend_target_remaining_until_next_income: number;
      available_now?: number;
      available_through_next_income?: number;
      available_spend?: number;
    };
    account_snapshot: {
      total_cash_available: number;
      checking_balance: number;
      savings_balance: number;
      credit_card_balance: number;
      total_debt?: number;
      overdue_obligations: number;
      upcoming_income: number;
    };
    top_priorities: BackendDashboardItem[];
  };
};

function toDashboardLabel(item?: BackendDashboardItem | null) {
  if (!item) return "";
  return item.detail ? `${item.label} · ${item.detail}` : item.label;
}

function normalizeDashboardResponse(payload: BackendDashboardResponse): DashboardSnapshot {
  return {
    ...sampleDashboard,
    nextItem: toDashboardLabel(payload.summary.whats_next) || sampleDashboard.nextItem,
    afterThat: toDashboardLabel(payload.summary.whats_after_that) || sampleDashboard.afterThat,
    availableSpend: {
      liquidCash: payload.summary.available_spend.liquid_cash,
      reliableIncomeBeforeNextIncome: payload.summary.available_spend.reliable_income_before_next_income ?? 0,
      protectedCashBuffer: payload.summary.available_spend.protected_cash_buffer,
      manualReserves: payload.summary.available_spend.manual_reserves,
      obligationsDueBeforeNextIncome: payload.summary.available_spend.obligations_due_before_next_income,
      debtMinimumsDueBeforeNextIncome: payload.summary.available_spend.minimum_debt_payments_due_before_next_income,
      essentialSpendRemaining: payload.summary.available_spend.essential_spend_target_remaining_until_next_income,
      availableNow: payload.summary.available_spend.available_now ?? payload.summary.available_spend.available_spend ?? 0,
      availableThroughNextIncome:
        payload.summary.available_spend.available_through_next_income ??
        payload.summary.available_spend.available_spend ??
        0,
    },
    cashSummary: {
      totalCash: payload.summary.account_snapshot.total_cash_available,
      checking: payload.summary.account_snapshot.checking_balance,
      savings: payload.summary.account_snapshot.savings_balance,
      creditCard: payload.summary.account_snapshot.credit_card_balance,
      totalDebt: payload.summary.account_snapshot.total_debt ?? payload.summary.account_snapshot.credit_card_balance,
      overdueObligations: payload.summary.account_snapshot.overdue_obligations,
      upcomingIncome: payload.summary.account_snapshot.upcoming_income,
    },
    topPriorities:
      payload.summary.top_priorities?.map((item, index) => ({
        id: `${item.kind}-${index}`,
        title: item.label,
        dueDate: item.due_on ?? sampleDashboard.topPriorities[index]?.dueDate ?? sampleDashboard.today,
        priority: index === 0 ? "urgent" : "high",
        linkedTo: item.detail,
        completed: false,
      })) ?? sampleDashboard.topPriorities,
  };
}

export function createApiClient(options: ApiClientOptions = {}) {
  const baseUrl = options.baseUrl ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
  const fetchImpl = options.fetchImpl ?? fetch;
  const ownerToken = process.env.NEXT_PUBLIC_OWNER_TOKEN ?? "";

  const get = async <T,>(path: string, fallback: T): Promise<T> => {
    if (!baseUrl) return fallback;
    try {
      const response = await fetchImpl(`${baseUrl}${path}`, {
        cache: "no-store",
        headers: ownerToken ? { "X-Owner-Token": ownerToken } : undefined,
      });
      return await safeJson<T>(response);
    } catch {
      return fallback;
    }
  };

  const post = async <T,>(path: string, body: unknown, fallback: T): Promise<T> => {
    if (!baseUrl) return fallback;
    try {
      const response = await fetchImpl(`${baseUrl}${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(ownerToken ? { "X-Owner-Token": ownerToken } : {}),
        },
        body: JSON.stringify(body),
      });
      return await safeJson<T>(response);
    } catch {
      return fallback;
    }
  };

  return {
    getDashboard: async () => {
      const payload = await get<BackendDashboardResponse | DashboardSnapshot>("/dashboard", sampleDashboard);
      if ("summary" in payload) {
        return normalizeDashboardResponse(payload);
      }
      return payload;
    },
    getCategories: async () => {
      const payload = await get<Array<string | { name: string }>>("/categories", sampleCategories);
      return payload.map((item) => (typeof item === "string" ? item : item.name));
    },
    searchMerchants: (query: string) => get<string[]>(`/suggestions/merchants?q=${encodeURIComponent(query)}`, sampleDashboard.merchants.map((merchant) => merchant.name)),
    searchSources: (query: string) => get<string[]>(`/suggestions/sources?q=${encodeURIComponent(query)}`, sampleDashboard.sources.map((source) => source.name)),
    submitQuickAdd: (draft: QuickAddDraft) =>
      post("/transactions", draft, {
        ok: true,
        draft,
      }),
  };
}

export const api = createApiClient();
