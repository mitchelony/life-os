"use client";

import { useEffect, useMemo, useState } from "react";
import { computeAvailableSpend, getCreditCardBalance, getTotalCash, money } from "@/lib/finance";
import { sampleDashboard } from "@/lib/sample-data";
import type {
  Account,
  AdvisoryAllocation,
  DashboardSnapshot,
  Debt,
  IncomeItem,
  Merchant,
  Obligation,
  QuickAddDraft,
  RecurrenceFrequency,
  RoadmapCategory,
  RoadmapItem,
  RoadmapPriority,
  RoadmapStatus,
  RoadmapStep,
  StrategyDocument,
  Task,
  Transaction,
} from "@/lib/types";

export const onboardingKey = process.env.NEXT_PUBLIC_ONBOARDING_KEY ?? "life-os-onboarded";
export const setupKey = "life-os-setup";
const changedEvent = "lifeos:setup-changed";

export type StoredAccountDraft = {
  id: string;
  name: string;
  institution: string;
  type: "checking" | "savings" | "credit_card" | "cash";
  balance: string;
};

export type StoredObligationDraft = {
  id: string;
  name: string;
  amount: string;
  dueDate: string;
  recurrence: RecurrenceFrequency;
  linkedAccount?: string;
};

export type StoredDebtDraft = {
  id: string;
  name: string;
  balance: string;
  minimum: string;
  dueDate: string;
};

export type StoredIncomeDraft = {
  id: string;
  source: string;
  expectedAmount: string;
  dueDate: string;
  recurrence: RecurrenceFrequency;
  linkedAccount?: string;
};

export type StoredTransactionDraft = {
  id: string;
  kind: "expense" | "income" | "transfer";
  title: string;
  amount: string;
  date: string;
  account: string;
  counterparty: string;
  category: string;
  notes?: string;
};

export type StoredLifeOsSetup = {
  displayName: string;
  protectedBuffer: string;
  essentialTarget: string;
  savingsFloor: string;
  notes: string;
  accounts: StoredAccountDraft[];
  obligations: StoredObligationDraft[];
  debts: StoredDebtDraft[];
  income: StoredIncomeDraft[];
  transactions: StoredTransactionDraft[];
  roadmapItems: RoadmapItem[];
  strategyDocument: StrategyDocument | null;
};

type StrategySaveResult = {
  setup: StoredLifeOsSetup;
  errors: string[];
};

const roadmapCategories: RoadmapCategory[] = ["finances", "school", "career", "admin", "health", "personal"];
const roadmapStatuses: RoadmapStatus[] = ["planned", "active", "blocked", "completed", "overdue"];
const roadmapPriorities: RoadmapPriority[] = ["low", "medium", "high", "critical"];

function createDraftId() {
  return Math.random().toString(36).slice(2, 10);
}

export function createEmptyStoredLifeOsSetup(): StoredLifeOsSetup {
  return {
    displayName: "Life owner",
    protectedBuffer: "0",
    essentialTarget: "0",
    savingsFloor: "0",
    notes: "",
    accounts: [],
    obligations: [],
    debts: [],
    income: [],
    transactions: [],
    roadmapItems: [],
    strategyDocument: null,
  };
}

function normalizeRecurrence(value: string | undefined, fallback: RecurrenceFrequency): RecurrenceFrequency {
  if (value === "weekly" || value === "biweekly" || value === "monthly" || value === "one-time") return value;
  return fallback;
}

function parseAmount(value: string, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function startOfTodayDate() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function startOfTodayIso() {
  return startOfTodayDate().toISOString();
}

function dueStatus(dateValue: string) {
  const diffDays = Math.ceil((new Date(dateValue).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "overdue" as const;
  if (diffDays <= 3) return "due_soon" as const;
  return "scheduled" as const;
}

function normalizeRoadmapStep(step: Partial<RoadmapStep>, fallbackId?: string): RoadmapStep {
  return {
    id: step.id ?? fallbackId ?? createDraftId(),
    title: typeof step.title === "string" ? step.title : "",
    completed: Boolean(step.completed),
    dueDate: typeof step.dueDate === "string" ? step.dueDate : undefined,
    notes: typeof step.notes === "string" ? step.notes : undefined,
  };
}

function normalizeRoadmapItem(item: Partial<RoadmapItem>, index = 0): RoadmapItem {
  const category = roadmapCategories.includes(item.category as RoadmapCategory)
    ? (item.category as RoadmapCategory)
    : "personal";
  const status = roadmapStatuses.includes(item.status as RoadmapStatus) ? (item.status as RoadmapStatus) : "planned";
  const priority = roadmapPriorities.includes(item.priority as RoadmapPriority)
    ? (item.priority as RoadmapPriority)
    : "medium";
  return {
    id: item.id ?? `roadmap-${index}-${createDraftId()}`,
    title: typeof item.title === "string" ? item.title : "",
    description: typeof item.description === "string" ? item.description : "",
    category,
    status,
    priority,
    targetDate: typeof item.targetDate === "string" ? item.targetDate : undefined,
    timeframeLabel: typeof item.timeframeLabel === "string" ? item.timeframeLabel : "",
    progressMode: item.progressMode === "percent" ? "percent" : "steps",
    progressValue: typeof item.progressValue === "number" ? item.progressValue : 0,
    steps: Array.isArray(item.steps) ? item.steps.map((step, stepIndex) => normalizeRoadmapStep(step, `step-${stepIndex}`)) : [],
    notes: typeof item.notes === "string" ? item.notes : "",
    dependencyIds: Array.isArray(item.dependencyIds) ? item.dependencyIds.filter((id): id is string => typeof id === "string") : [],
    linkedStrategyGoalId: typeof item.linkedStrategyGoalId === "string" ? item.linkedStrategyGoalId : undefined,
    strategyBacked: Boolean(item.strategyBacked),
    derivedNextStep: typeof item.derivedNextStep === "string" ? item.derivedNextStep : undefined,
    urgencyScore: typeof item.urgencyScore === "number" ? item.urgencyScore : undefined,
    reason: typeof item.reason === "string" ? item.reason : undefined,
  };
}

function normalizeStoredLifeOsSetup(raw: Partial<StoredLifeOsSetup>): StoredLifeOsSetup {
  return {
    ...createEmptyStoredLifeOsSetup(),
    ...raw,
    obligations: (raw.obligations ?? []).map((item) => ({
      ...item,
      recurrence: normalizeRecurrence(item.recurrence, "monthly"),
    })),
    income: (raw.income ?? []).map((item) => ({
      ...item,
      recurrence: normalizeRecurrence(item.recurrence, "one-time"),
    })),
    accounts: raw.accounts ?? [],
    debts: raw.debts ?? [],
    transactions: raw.transactions ?? [],
    roadmapItems: (raw.roadmapItems ?? []).map((item, index) => normalizeRoadmapItem(item, index)),
    strategyDocument: raw.strategyDocument ?? null,
  };
}

function validateStrategyGoal(goal: Record<string, unknown>, index: number) {
  const errors: string[] = [];
  if (typeof goal.id !== "string" || !goal.id.trim()) errors.push(`goals[${index}].id is required`);
  if (typeof goal.title !== "string" || !goal.title.trim()) errors.push(`goals[${index}].title is required`);
  if (!roadmapCategories.includes(goal.category as RoadmapCategory)) errors.push(`goals[${index}].category is invalid`);
  if (!["planned", "active", "blocked", "completed"].includes(goal.status as string)) errors.push(`goals[${index}].status is invalid`);
  if (!roadmapPriorities.includes(goal.priority as RoadmapPriority)) errors.push(`goals[${index}].priority is invalid`);
  return errors;
}

function validateStrategyAllocation(rule: Record<string, unknown>, index: number) {
  const errors: string[] = [];
  if (typeof rule.id !== "string" || !rule.id.trim()) errors.push(`incomePlan.allocations[${index}].id is required`);
  if (typeof rule.label !== "string" || !rule.label.trim()) errors.push(`incomePlan.allocations[${index}].label is required`);
  if (!["fixed", "percent"].includes(rule.type as string)) errors.push(`incomePlan.allocations[${index}].type is invalid`);
  if (typeof rule.value !== "number") errors.push(`incomePlan.allocations[${index}].value must be a number`);
  if (typeof rule.priority !== "number") errors.push(`incomePlan.allocations[${index}].priority must be a number`);
  return errors;
}

function validateExpectedIncomeRule(rule: Record<string, unknown>, index: number) {
  const errors: string[] = [];
  if (typeof rule.id !== "string" || !rule.id.trim()) errors.push(`incomePlan.expectedIncome[${index}].id is required`);
  if (typeof rule.label !== "string" || !rule.label.trim()) errors.push(`incomePlan.expectedIncome[${index}].label is required`);
  if (typeof rule.amount !== "number") errors.push(`incomePlan.expectedIncome[${index}].amount must be a number`);
  if (typeof rule.timing !== "string" || !rule.timing.trim()) errors.push(`incomePlan.expectedIncome[${index}].timing is required`);
  if (!["confirmed", "conditional"].includes(rule.certainty as string)) errors.push(`incomePlan.expectedIncome[${index}].certainty is invalid`);
  return errors;
}

function validateDebtRule(rule: Record<string, unknown>, index: number) {
  const errors: string[] = [];
  if (typeof rule.debtName !== "string" || !rule.debtName.trim()) errors.push(`debtPlan[${index}].debtName is required`);
  if (!["minimum_only", "minimum_plus", "target_payoff"].includes(rule.mode as string)) errors.push(`debtPlan[${index}].mode is invalid`);
  if (!["existing", "manual"].includes(rule.minimumSource as string)) errors.push(`debtPlan[${index}].minimumSource is invalid`);
  if (rule.priority !== undefined && !roadmapPriorities.includes(rule.priority as RoadmapPriority)) {
    errors.push(`debtPlan[${index}].priority is invalid`);
  }
  if (rule.extraPaymentRule !== undefined) {
    const extra = rule.extraPaymentRule as Record<string, unknown>;
    if (!["fixed", "percent", "fixed_total_target"].includes(extra.type as string)) errors.push(`debtPlan[${index}].extraPaymentRule.type is invalid`);
    if (typeof extra.value !== "number") errors.push(`debtPlan[${index}].extraPaymentRule.value must be a number`);
  }
  return errors;
}

function validateObligationRule(rule: Record<string, unknown>, index: number) {
  const errors: string[] = [];
  if (typeof rule.obligationName !== "string" || !rule.obligationName.trim()) errors.push(`obligationPlan[${index}].obligationName is required`);
  if (!["pay_once", "pay_over_time", "externally_covered", "file_this_week"].includes(rule.handling as string)) errors.push(`obligationPlan[${index}].handling is invalid`);
  if (rule.priority !== undefined && !roadmapPriorities.includes(rule.priority as RoadmapPriority)) {
    errors.push(`obligationPlan[${index}].priority is invalid`);
  }
  if (rule.handling === "pay_over_time") {
    const installment = rule.installment as Record<string, unknown> | undefined;
    if (!installment || typeof installment !== "object") errors.push(`obligationPlan[${index}].installment is required`);
    else {
      if (typeof installment.amount !== "number") errors.push(`obligationPlan[${index}].installment.amount must be a number`);
      if (!["one-time", "weekly", "biweekly", "monthly", "within_horizon"].includes(installment.cadence as string)) {
        errors.push(`obligationPlan[${index}].installment.cadence is invalid`);
      }
    }
  }
  return errors;
}

function validateStrategyDocumentValue(value: unknown): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return ["Strategy document must be a JSON object"];
  const document = value as Record<string, unknown>;
  const errors: string[] = [];
  if (document.version !== 1) errors.push("version must be 1");
  if (typeof document.name !== "string" || !document.name.trim()) errors.push("name is required");
  if (typeof document.summary !== "string" || !document.summary.trim()) errors.push("summary is required");
  if (typeof document.effectiveDate !== "string" || !document.effectiveDate.trim()) errors.push("effectiveDate is required");
  if (typeof document.currency !== "string" || !document.currency.trim()) errors.push("currency is required");
  if (typeof document.planningHorizonDays !== "number") errors.push("planningHorizonDays must be a number");

  if (!Array.isArray(document.goals) || document.goals.length === 0) {
    errors.push("goals must be a non-empty array");
  } else {
    document.goals.forEach((goal, index) => {
      errors.push(...validateStrategyGoal(goal as Record<string, unknown>, index));
    });
  }

  if (!document.incomePlan || typeof document.incomePlan !== "object" || Array.isArray(document.incomePlan)) {
    errors.push("incomePlan is required");
  } else {
    const incomePlan = document.incomePlan as Record<string, unknown>;
    if (!Array.isArray(incomePlan.allocations)) {
      errors.push("incomePlan.allocations must be an array");
    } else {
      incomePlan.allocations.forEach((allocation, index) => {
        errors.push(...validateStrategyAllocation(allocation as Record<string, unknown>, index));
      });
    }
    if (incomePlan.expectedIncome !== undefined) {
      if (!Array.isArray(incomePlan.expectedIncome)) {
        errors.push("incomePlan.expectedIncome must be an array");
      } else {
        incomePlan.expectedIncome.forEach((incomeRule, index) => {
          errors.push(...validateExpectedIncomeRule(incomeRule as Record<string, unknown>, index));
        });
      }
    }
  }

  if (!Array.isArray(document.debtPlan)) {
    errors.push("debtPlan must be an array");
  } else {
    document.debtPlan.forEach((rule, index) => {
      errors.push(...validateDebtRule(rule as Record<string, unknown>, index));
    });
  }
  if (!Array.isArray(document.obligationPlan)) {
    errors.push("obligationPlan must be an array");
  } else {
    document.obligationPlan.forEach((rule, index) => {
      errors.push(...validateObligationRule(rule as Record<string, unknown>, index));
    });
  }
  if (!document.guidance || typeof document.guidance !== "object" || Array.isArray(document.guidance)) {
    errors.push("guidance is required");
  } else {
    const guidance = document.guidance as Record<string, unknown>;
    if (!Array.isArray(guidance.focusOrder)) errors.push("guidance.focusOrder must be an array");
    else {
      guidance.focusOrder.forEach((rule, index) => {
        if (!["overdue", "critical_debt", "critical_obligation", "buffer", "goal_progress", "admin_deadlines"].includes(rule as string)) {
          errors.push(`guidance.focusOrder[${index}] is invalid`);
        }
      });
    }
    if (guidance.recommendedStepStyle !== "first_incomplete_step") errors.push("guidance.recommendedStepStyle must be first_incomplete_step");
  }

  if (document.spendingRules !== undefined) {
    if (typeof document.spendingRules !== "object" || Array.isArray(document.spendingRules)) {
      errors.push("spendingRules must be an object");
    } else {
      const spendingRules = document.spendingRules as Record<string, unknown>;
      if (spendingRules.weeklyEssentialsCap !== undefined && typeof spendingRules.weeklyEssentialsCap !== "number") {
        errors.push("spendingRules.weeklyEssentialsCap must be a number");
      }
      if (spendingRules.noNewCreditCardSpending !== undefined && typeof spendingRules.noNewCreditCardSpending !== "boolean") {
        errors.push("spendingRules.noNewCreditCardSpending must be a boolean");
      }
      if (spendingRules.notes !== undefined && typeof spendingRules.notes !== "string") {
        errors.push("spendingRules.notes must be a string");
      }
    }
  }

  return errors;
}

export function parseStrategyDocument(raw: string) {
  try {
    const parsed = JSON.parse(raw) as StrategyDocument;
    const errors = validateStrategyDocumentValue(parsed);
    return {
      document: errors.length ? null : parsed,
      errors,
    };
  } catch (error) {
    return {
      document: null,
      errors: [error instanceof Error ? error.message : "Invalid JSON"],
    };
  }
}

export function saveStrategyToSetup(setup: StoredLifeOsSetup, raw: string): StrategySaveResult {
  const parsed = parseStrategyDocument(raw);
  if (!parsed.document) {
    return {
      setup,
      errors: parsed.errors,
    };
  }

  return {
    setup: {
      ...setup,
      strategyDocument: parsed.document,
    },
    errors: [],
  };
}

function mapAccounts(accounts: StoredAccountDraft[]): Account[] {
  return accounts
    .filter((account) => account.name.trim())
    .map((account) => {
      const balance = parseAmount(account.balance);
      return {
        id: account.id,
        name: account.name.trim(),
        institution: account.institution.trim() || "Manual account",
        type: account.type,
        balance: account.type === "credit_card" ? -Math.abs(balance) : balance,
        active: true,
        notes: account.type === "credit_card" ? "Tracked as amount owed." : "Added during setup.",
      };
    });
}

function mapTransactions(items: StoredTransactionDraft[]): Transaction[] {
  return items
    .filter((item) => item.title.trim())
    .map((item) => ({
      id: item.id,
      kind: item.kind,
      title: item.title.trim(),
      amount: parseAmount(item.amount),
      date: item.date,
      account: item.account,
      counterparty: item.counterparty.trim() || "Manual entry",
      category: item.category.trim() || "Uncategorized",
      notes: item.notes?.trim() || undefined,
    }))
    .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());
}

function applyTransactionsToAccounts(accounts: Account[], transactions: Transaction[]): Account[] {
  return accounts.map((account) => {
    const delta = transactions
      .filter((transaction) => transaction.account === account.name)
      .reduce((sum, transaction) => {
        if (transaction.kind === "income") return sum + transaction.amount;
        if (transaction.kind === "expense") return sum - transaction.amount;
        return sum;
      }, 0);

    return {
      ...account,
      balance: money(account.balance + delta),
    };
  });
}

function mapObligations(items: StoredObligationDraft[], accounts: Account[]): Obligation[] {
  const defaultAccount = accounts.find((item) => item.type === "checking")?.name;
  return items
    .filter((item) => item.name.trim())
    .map((item) => ({
      id: item.id,
      name: item.name.trim(),
      amount: parseAmount(item.amount),
      dueDate: item.dueDate,
      status: dueStatus(item.dueDate),
      recurrence: item.recurrence,
      linkedAccount: item.linkedAccount ?? defaultAccount,
    }));
}

function mapDebts(items: StoredDebtDraft[]): Debt[] {
  return items
    .filter((item) => item.name.trim())
    .map((item) => {
      const balance = parseAmount(item.balance);
      const minimum = parseAmount(item.minimum);
      const payoffProgress = balance <= 0 ? 1 : Math.max(0.05, Math.min(0.95, minimum / Math.max(balance, 1)));
      return {
        id: item.id,
        name: item.name.trim(),
        currentBalance: balance,
        minimumPayment: minimum,
        dueDate: item.dueDate,
        payoffProgress,
        notes: "Added during setup.",
      };
    });
}

function mapIncome(items: StoredIncomeDraft[], accounts: Account[]): IncomeItem[] {
  const defaultAccount = accounts.find((item) => item.type === "checking")?.name ?? "Primary checking";
  return items
    .filter((item) => item.source.trim())
    .map((item) => ({
      id: item.id,
      source: item.source.trim(),
      amount: parseAmount(item.expectedAmount),
      dueDate: item.dueDate,
      status: "expected" as const,
      linkedAccount: item.linkedAccount ?? defaultAccount,
      recurrence: item.recurrence,
    }));
}

function mergeMerchants(obligations: Obligation[]): Merchant[] {
  const seeded = new Map<string, Merchant>();
  obligations.forEach((item) => {
    if (!seeded.has(item.name)) {
      seeded.set(item.name, {
        id: `merchant-${item.id}`,
        name: item.name,
        usageCount: 1,
        category: "Bills",
      });
    }
  });
  return [...seeded.values()];
}

function mergeSources(income: IncomeItem[], transactions: Transaction[]) {
  const seeded = new Map<string, { id: string; name: string; usageCount: number; category: string }>();
  income.forEach((item) => {
    const existing = seeded.get(item.source);
    if (existing) {
      existing.usageCount += 1;
      return;
    }
    seeded.set(item.source, { id: `source-${item.id}`, name: item.source, usageCount: 1, category: "Income" });
  });
  transactions
    .filter((item) => item.kind === "income")
    .forEach((item) => {
      const existing = seeded.get(item.counterparty);
      if (existing) {
        existing.usageCount += 1;
        return;
      }
      seeded.set(item.counterparty, {
        id: `source-tx-${item.id}`,
        name: item.counterparty,
        usageCount: 1,
        category: item.category || "Income",
      });
    });
  return [...seeded.values()];
}

function mergeTransactionMerchants(obligations: Obligation[], transactions: Transaction[]): Merchant[] {
  const merchants = mergeMerchants(obligations);
  const byName = new Map(merchants.map((item) => [item.name, item]));
  transactions
    .filter((item) => item.kind === "expense")
    .forEach((item) => {
      const existing = byName.get(item.counterparty);
      if (existing) {
        existing.usageCount += 1;
        return;
      }
      byName.set(item.counterparty, {
        id: `merchant-tx-${item.id}`,
        name: item.counterparty,
        usageCount: 1,
        category: item.category,
      });
    });
  return [...byName.values()];
}

function computeTotalDebt(accounts: Account[], debts: Debt[]) {
  const debtNameSet = new Set(debts.map((item) => item.name.trim().toLowerCase()));
  const unmatchedCreditCards = accounts
    .filter((account) => account.type === "credit_card" && !debtNameSet.has(account.name.trim().toLowerCase()))
    .reduce((sum, account) => sum + Math.abs(account.balance), 0);

  return money(debts.reduce((sum, item) => sum + item.currentBalance, 0) + unmatchedCreditCards);
}

function getPlanningHorizon(upcomingIncome: IncomeItem[], obligations: Obligation[], debts: Debt[], strategy?: StrategyDocument | null) {
  const todayIso = startOfTodayIso();
  const futureIncomeDates = upcomingIncome
    .filter((item) => item.status === "expected")
    .map((item) => item.dueDate)
    .filter((item) => new Date(item).getTime() >= new Date(todayIso).getTime())
    .sort((left, right) => new Date(left).getTime() - new Date(right).getTime());

  if (futureIncomeDates[0]) return futureIncomeDates[0];

  const strategyIncomeDates = getStrategyExpectedIncomeDates(strategy)
    .filter((item) => new Date(item).getTime() >= new Date(todayIso).getTime());

  if (strategyIncomeDates[0]) return strategyIncomeDates[0];

  const futureRequirementDates = [...obligations.map((item) => item.dueDate), ...debts.map((item) => item.dueDate)]
    .filter((item) => new Date(item).getTime() >= new Date(todayIso).getTime())
    .sort((left, right) => new Date(left).getTime() - new Date(right).getTime());

  return futureRequirementDates[0] ?? todayIso;
}

function getFutureExpectedIncomeTotal(upcomingIncome: IncomeItem[]) {
  const todayIso = startOfTodayIso();
  return money(
    upcomingIncome
      .filter((item) => item.status === "expected")
      .filter((item) => new Date(item.dueDate).getTime() >= new Date(todayIso).getTime())
      .reduce((sum, item) => sum + item.amount, 0),
  );
}

function createTransactionFromQuickAdd(draft: QuickAddDraft): StoredTransactionDraft {
  return {
    id: createDraftId(),
    kind: draft.kind,
    title: draft.title.trim() || draft.merchantOrSource.trim() || "Manual entry",
    amount: draft.amount,
    date: draft.date,
    account: draft.account,
    counterparty: draft.merchantOrSource.trim() || draft.title.trim() || "Manual entry",
    category: draft.category,
    notes: draft.notes,
  };
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function namesLooselyMatch(left: string, right: string) {
  const a = normalizeText(left);
  const b = normalizeText(right);
  if (!a || !b) return false;
  if (a.includes(b) || b.includes(a)) return true;
  const leftTokens = new Set(a.split(" "));
  const overlap = b.split(" ").filter((token) => token && leftTokens.has(token));
  return (
    overlap.length >= 2 ||
    overlap.includes("capital") ||
    overlap.includes("rent") ||
    overlap.includes("tuition") ||
    overlap.includes("utilities") ||
    overlap.includes("taxes")
  );
}

function formatRuleAmount(rule: { type: "fixed" | "percent" | "fixed_total_target"; value: number }, incomeAmount: number, minimumAmount = 0) {
  if (rule.type === "fixed") return money(rule.value);
  if (rule.type === "fixed_total_target") return money(Math.max(rule.value - minimumAmount, 0));
  return money((incomeAmount * rule.value) / 100);
}

function resolveStrategyTimingToDate(timing: string, effectiveDate: string) {
  const base = new Date(effectiveDate);
  base.setHours(0, 0, 0, 0);
  if (timing === "next_week") {
    base.setDate(base.getDate() + 7);
    return base;
  }
  if (timing === "in_2_weeks") {
    base.setDate(base.getDate() + 14);
    return base;
  }
  if (timing === "as_available") {
    base.setDate(base.getDate() + 30);
    return base;
  }
  if (timing.startsWith("after_")) {
    const rawDate = timing.slice("after_".length);
    const parsed = new Date(rawDate);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return base;
}

function getStrategyExpectedIncomeTotal(strategy: StrategyDocument | null, horizonDate: string) {
  if (!strategy?.incomePlan.expectedIncome?.length) return 0;
  return money(
    strategy.incomePlan.expectedIncome
      .filter((item) => item.certainty === "confirmed")
      .filter((item) => resolveStrategyTimingToDate(item.timing, strategy.effectiveDate).getTime() <= new Date(horizonDate).getTime())
      .reduce((sum, item) => sum + item.amount, 0),
  );
}

function getStrategyExpectedIncomeDates(strategy: StrategyDocument | null) {
  if (!strategy?.incomePlan.expectedIncome?.length) return [];
  return strategy.incomePlan.expectedIncome
    .filter((item) => item.certainty === "confirmed")
    .map((item) => resolveStrategyTimingToDate(item.timing, strategy.effectiveDate).toISOString())
    .sort((left, right) => new Date(left).getTime() - new Date(right).getTime());
}

function priorityWeight(priority: RoadmapPriority) {
  return {
    low: 1,
    medium: 2,
    high: 3,
    critical: 4,
  }[priority];
}

function computeRoadmapProgress(item: RoadmapItem) {
  if (item.status === "completed") return 100;
  if (item.steps.length) {
    return Math.round((item.steps.filter((step) => step.completed).length / item.steps.length) * 100);
  }
  return Math.max(0, Math.min(100, Math.round(item.progressValue)));
}

function synthesizeStrategySteps(
  goal: StrategyDocument["goals"][number],
  debts: Debt[],
  obligations: Obligation[],
  strategy: StrategyDocument,
): RoadmapStep[] {
  const steps: RoadmapStep[] = [];
  strategy.incomePlan.allocations.forEach((allocation, index) => {
    if (allocation.label.toLowerCase().includes("buffer") && namesLooselyMatch(goal.title, "buffer")) {
      steps.push({
        id: `${goal.id}-allocation-step-${index}`,
        title: `Protect ${allocation.label.toLowerCase()} at $${allocation.value.toFixed(2)}`,
        completed: false,
      });
    }
    if (allocation.label.toLowerCase().includes("utilities") && namesLooselyMatch(goal.title, "utilities")) {
      steps.push({
        id: `${goal.id}-allocation-step-${index}`,
        title: `Set aside $${allocation.value.toFixed(2)} for utilities catch-up`,
        completed: false,
      });
    }
  });
  strategy.debtPlan.forEach((rule, index) => {
    if (!namesLooselyMatch(goal.title, rule.debtName) && strategy.goals.length > 1) return;
    if (rule.mode === "minimum_plus" && rule.extraPaymentRule) {
      const matchingDebt = debts.find((debt) => namesLooselyMatch(debt.name, rule.debtName));
      const amount = formatRuleAmount(rule.extraPaymentRule, 0, matchingDebt?.minimumPayment ?? 0);
      steps.push({
        id: `${goal.id}-debt-step-${index}`,
        title: `Send $${amount.toFixed(2)} extra to ${rule.debtName} after minimum`,
        completed: false,
      });
      return;
    }
    if (rule.mode === "target_payoff") {
      steps.push({
        id: `${goal.id}-debt-step-${index}`,
        title: `Push the next extra payment toward ${rule.debtName}`,
        completed: false,
      });
      return;
    }
    steps.push({
      id: `${goal.id}-debt-step-${index}`,
      title: `Cover the ${rule.debtName} minimum on time`,
      completed: false,
    });
  });

  strategy.obligationPlan.forEach((rule, index) => {
    if (!namesLooselyMatch(goal.title, rule.obligationName) && strategy.goals.length > 1) return;
    const matchingObligation = obligations.find((item) => namesLooselyMatch(item.name, rule.obligationName));
    if (rule.handling === "pay_over_time" && rule.installment) {
      steps.push({
        id: `${goal.id}-obligation-step-${index}`,
        title: `Reserve $${rule.installment.amount.toFixed(2)} for ${rule.obligationName} installment`,
        completed: false,
      });
      return;
    }
    if (rule.handling === "externally_covered") {
      steps.push({
        id: `${goal.id}-obligation-step-${index}`,
        title: `Track ${rule.obligationName} as externally covered and keep it visible`,
        completed: false,
      });
      return;
    }
    if (rule.handling === "file_this_week") {
      steps.push({
        id: `${goal.id}-obligation-step-${index}`,
        title: `File ${rule.obligationName.toLowerCase()} this week`,
        completed: false,
      });
      return;
    }
    steps.push({
      id: `${goal.id}-obligation-step-${index}`,
      title: `Hold ${rule.obligationName} to pay once${matchingObligation ? ` on ${matchingObligation.dueDate}` : ""}`,
      completed: false,
    });
  });

  if (!steps.length && goal.category === "finances") {
    const soonestDebt = debts.slice().sort((left, right) => new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime())[0];
    if (soonestDebt) {
      steps.push({
        id: `${goal.id}-debt-fallback`,
        title: `Review the next move for ${soonestDebt.name}`,
        completed: false,
      });
    }
  }

  return steps;
}

function buildStrategyRoadmapItems(strategy: StrategyDocument | null, debts: Debt[], obligations: Obligation[]): RoadmapItem[] {
  if (!strategy) return [];
  return strategy.goals.map((goal, index) => {
    const steps = synthesizeStrategySteps(goal, debts, obligations, strategy);
    return normalizeRoadmapItem(
      {
        id: `strategy-${goal.id}`,
        title: goal.title,
        description: goal.notes ?? strategy.summary,
        category: goal.category,
        status: goal.status,
        priority: goal.priority,
        targetDate: goal.targetDate,
        timeframeLabel: "",
        progressMode: steps.length ? "steps" : "percent",
        progressValue: 0,
        steps,
        notes: goal.notes,
        dependencyIds: [],
        linkedStrategyGoalId: goal.id,
        strategyBacked: true,
      },
      index,
    );
  });
}

function mergeRoadmapItems(manualItems: RoadmapItem[], strategyItems: RoadmapItem[]) {
  const strategyByGoalId = new Map(
    strategyItems.map((item) => [item.linkedStrategyGoalId ?? item.id, item]),
  );
  const mergedManual = manualItems.map((manualItem) => {
    if (!manualItem.linkedStrategyGoalId) return normalizeRoadmapItem(manualItem);
    const linked = strategyByGoalId.get(manualItem.linkedStrategyGoalId);
    if (!linked) return normalizeRoadmapItem(manualItem);
    return normalizeRoadmapItem({
      ...linked,
      ...manualItem,
      strategyBacked: true,
      linkedStrategyGoalId: manualItem.linkedStrategyGoalId,
      steps: manualItem.steps.length ? manualItem.steps : linked.steps,
      description: manualItem.description || linked.description,
      notes: manualItem.notes || linked.notes,
    });
  });

  const manualGoalIds = new Set(mergedManual.map((item) => item.linkedStrategyGoalId).filter(Boolean));
  const remainingStrategyItems = strategyItems.filter((item) => !manualGoalIds.has(item.linkedStrategyGoalId));
  return [...mergedManual, ...remainingStrategyItems];
}

function applyStrategyToDebts(debts: Debt[], strategy: StrategyDocument | null, reliableIncome: number) {
  if (!strategy) return debts;
  return debts.map((debt) => {
    const matchingRule = strategy.debtPlan.find((rule) => namesLooselyMatch(rule.debtName, debt.name));
    if (!matchingRule) return debt;
    return {
      ...debt,
      strategy: {
        mode: matchingRule.mode,
        priority: matchingRule.priority,
        recommendedExtraPayment: matchingRule.extraPaymentRule
          ? formatRuleAmount(matchingRule.extraPaymentRule, reliableIncome, debt.minimumPayment)
          : undefined,
        notes: matchingRule.notes,
      },
    };
  });
}

function applyStrategyToObligations(obligations: Obligation[], strategy: StrategyDocument | null) {
  if (!strategy) return obligations;
  return obligations.map((obligation) => {
    const matchingRule = strategy.obligationPlan.find((rule) => namesLooselyMatch(rule.obligationName, obligation.name));
    if (!matchingRule) return obligation;
    return {
      ...obligation,
      strategy: {
        handling: matchingRule.handling,
        priority: matchingRule.priority,
        installmentAmount: matchingRule.installment?.amount,
        installmentCadence: matchingRule.installment?.cadence,
        notes: matchingRule.notes,
      },
    };
  });
}

function buildStrategyAllocationRows(
  strategy: StrategyDocument | null,
  advisoryIncomeBeforeNextIncome: number,
): AdvisoryAllocation[] {
  if (!strategy || advisoryIncomeBeforeNextIncome <= 0) return [];
  return strategy.incomePlan.allocations
    .slice()
    .sort((left, right) => left.priority - right.priority)
    .map((allocation) => ({
      id: allocation.id,
      label: allocation.label,
      amount: formatRuleAmount(allocation, advisoryIncomeBeforeNextIncome),
      type: "income_allocation" as const,
      priority: allocation.priority,
    }));
}

function buildStrategyDebtExtraRows(
  strategy: StrategyDocument | null,
  debts: Debt[],
  nextIncomeDate: string,
  reliableIncomeBeforeNextIncome: number,
): AdvisoryAllocation[] {
  if (!strategy || reliableIncomeBeforeNextIncome <= 0) return [];
  return strategy.debtPlan
    .filter((rule) => rule.extraPaymentRule)
    .map((rule) => {
      const matchingDebt = debts.find((debt) => namesLooselyMatch(debt.name, rule.debtName));
      if (!matchingDebt) return null;
      if (new Date(matchingDebt.dueDate).getTime() > new Date(nextIncomeDate).getTime()) return null;
      return {
        id: `debt-extra-${matchingDebt.id}`,
        label: `${matchingDebt.name} extra payment`,
        amount: formatRuleAmount(rule.extraPaymentRule!, reliableIncomeBeforeNextIncome, matchingDebt.minimumPayment),
        type: "debt_extra_payment" as const,
      };
    })
    .filter((item): item is AdvisoryAllocation => item !== null);
}

function buildStrategyObligationInstallmentRows(
  strategy: StrategyDocument | null,
  obligations: Obligation[],
  nextIncomeDate: string,
): AdvisoryAllocation[] {
  if (!strategy) return [];
  return strategy.obligationPlan
    .map((rule) => {
      if (rule.handling !== "pay_over_time" || !rule.installment) return null;
      const matchingObligation = obligations.find((obligation) => namesLooselyMatch(obligation.name, rule.obligationName));
      if (!matchingObligation) return null;
      if (new Date(matchingObligation.dueDate).getTime() > new Date(nextIncomeDate).getTime()) return null;
      return {
        id: `obligation-installment-${matchingObligation.id}`,
        label: `${matchingObligation.name} installment reserve`,
        amount: money(rule.installment.amount),
        type: "obligation_installment" as const,
      };
    })
    .filter((item): item is AdvisoryAllocation => item !== null);
}

function computeUrgencyReason(item: RoadmapItem, obligations: Obligation[], debts: Debt[]) {
  const matchingDebt = debts.find((debt) => namesLooselyMatch(debt.name, item.title));
  const matchingObligation = obligations.find((obligation) => namesLooselyMatch(obligation.name, item.title));
  if (matchingObligation?.status === "overdue") return "It is linked to an overdue obligation.";
  if (matchingDebt && new Date(matchingDebt.dueDate).getTime() <= new Date(startOfTodayIso()).getTime() + 2 * 24 * 60 * 60 * 1000) {
    return "Its linked debt minimum is due very soon.";
  }
  if (item.status === "blocked") return "It is blocked, so the dependency needs attention first.";
  if (item.priority === "critical") return "It is marked critical in the current strategy.";
  if (computeRoadmapProgress(item) >= 75) return "It is close enough to completion to finish cleanly.";
  return "It is the strongest active roadmap item right now.";
}

function computeUrgencyScore(item: RoadmapItem, obligations: Obligation[], debts: Debt[]) {
  const progress = computeRoadmapProgress(item);
  const today = startOfTodayDate().getTime();
  const targetDate = item.targetDate ? new Date(item.targetDate).getTime() : null;
  let score = priorityWeight(item.priority) * 20;
  if (item.strategyBacked) score += 12;
  if (item.status === "blocked") score += 18;
  if (item.status === "completed") score -= 80;
  if (targetDate) {
    if (targetDate < today) score += 40;
    else {
      const days = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));
      if (days <= 3) score += 24;
      else if (days <= 7) score += 14;
    }
  }
  const matchingDebt = debts.find((debt) => namesLooselyMatch(debt.name, item.title));
  if (matchingDebt && new Date(matchingDebt.dueDate).getTime() <= today + 3 * 24 * 60 * 60 * 1000) score += 28;
  const matchingObligation = obligations.find((obligation) => namesLooselyMatch(obligation.name, item.title));
  if (matchingObligation?.status === "overdue") score += 30;
  score += Math.round((100 - progress) / 12);
  return score;
}

function deriveRoadmapItemState(item: RoadmapItem, itemsById: Map<string, RoadmapItem>, obligations: Obligation[], debts: Debt[]) {
  const progress = computeRoadmapProgress(item);
  const dependencyIncomplete = item.dependencyIds.some((dependencyId) => {
    const dependency = itemsById.get(dependencyId);
    return dependency ? computeRoadmapProgress(dependency) < 100 : false;
  });
  const targetDate = item.targetDate ? new Date(item.targetDate).getTime() : null;
  const overdue = targetDate !== null && targetDate < startOfTodayDate().getTime() && progress < 100;
  const firstIncompleteStep = item.steps.find((step) => !step.completed);
  let nextStepTitle = firstIncompleteStep?.title;
  if (!nextStepTitle && item.derivedNextStep) nextStepTitle = item.derivedNextStep;
  if (!nextStepTitle && item.steps.length === 0) nextStepTitle = item.title;
  if (dependencyIncomplete) {
    const dependency = item.dependencyIds
      .map((dependencyId) => itemsById.get(dependencyId))
      .find((candidate) => candidate && computeRoadmapProgress(candidate) < 100);
    nextStepTitle = dependency ? `Finish ${dependency.title} first` : nextStepTitle;
  }
  const status = progress >= 100 ? "completed" : dependencyIncomplete || item.status === "blocked" ? "blocked" : overdue ? "overdue" : item.status;
  const urgencyScore = computeUrgencyScore({ ...item, status }, obligations, debts);
  return normalizeRoadmapItem({
    ...item,
    status,
    progressValue: progress,
    derivedNextStep: nextStepTitle,
    urgencyScore,
    reason: computeUrgencyReason({ ...item, status }, obligations, debts),
  });
}

function buildRoadmapSummary(items: RoadmapItem[]) {
  const activeItems = items.filter((item) => item.status === "active" || item.status === "blocked" || item.status === "overdue");
  const overdueItems = items.filter((item) => item.status === "overdue");
  const completedItems = items.filter((item) => item.status === "completed");
  const mostUrgentItem = activeItems
    .slice()
    .sort((left, right) => (right.urgencyScore ?? 0) - (left.urgencyScore ?? 0))[0] ?? null;
  const recommendedNextStep = mostUrgentItem?.derivedNextStep
    ? {
        itemId: mostUrgentItem.id,
        title: mostUrgentItem.derivedNextStep,
        reason: mostUrgentItem.reason ?? "This is the strongest next move in the plan.",
      }
    : null;
  const debtOrObligationCount = activeItems.filter(
    (item) => item.category === "finances" || item.title.toLowerCase().includes("rent") || item.title.toLowerCase().includes("debt"),
  ).length;
  const overallProgress = activeItems.length
    ? Math.round(activeItems.reduce((sum, item) => sum + computeRoadmapProgress(item), 0) / activeItems.length)
    : completedItems.length
      ? 100
      : 0;

  return {
    activeCount: activeItems.length,
    overdueCount: overdueItems.length,
    completedCount: completedItems.length,
    debtOrObligationCount,
    overallProgress,
    mostUrgentItem,
    recommendedNextStep,
  };
}

function buildRoadmapFocus(items: RoadmapItem[], summary: ReturnType<typeof buildRoadmapSummary>) {
  return {
    item: summary.mostUrgentItem,
    nextStep: summary.recommendedNextStep,
    whyNow: summary.mostUrgentItem?.reason ?? "Add a goal or paste a strategy to start getting guided next steps.",
  };
}

function buildTopPriorities(obligations: Obligation[], debts: Debt[], income: IncomeItem[], roadmapItems: RoadmapItem[]): Task[] {
  const roadmapTasks = roadmapItems
    .filter((item) => item.status !== "completed")
    .slice()
    .sort((left, right) => (right.urgencyScore ?? 0) - (left.urgencyScore ?? 0))
    .slice(0, 2)
    .map((item) => ({
      id: `roadmap-${item.id}`,
      title: item.derivedNextStep ?? item.title,
      dueDate: item.targetDate ?? startOfTodayIso(),
      priority: item.priority === "critical" ? "urgent" as const : item.priority === "high" ? "high" as const : "normal" as const,
      linkedTo: "Roadmap",
      completed: false,
    }));

  const obligationTasks = obligations.map((item) => ({
    id: `obligation-${item.id}`,
    title: item.name,
    dueDate: item.dueDate,
    priority: item.status === "overdue" ? "urgent" as const : "high" as const,
    linkedTo: "Obligation",
    completed: false,
  }));
  const debtTasks = debts.map((item) => ({
    id: `debt-${item.id}`,
    title: `${item.name} minimum payment`,
    dueDate: item.dueDate,
    priority: item.strategy?.priority === "critical" ? "urgent" as const : "high" as const,
    linkedTo: "Debt",
    completed: false,
  }));
  const incomeTasks = income.map((item) => ({
    id: `income-${item.id}`,
    title: `Confirm ${item.source}`,
    dueDate: item.dueDate,
    priority: "normal" as const,
    linkedTo: "Income",
    completed: false,
  }));

  const seenTitles = new Set<string>();
  return [...roadmapTasks, ...obligationTasks, ...debtTasks, ...incomeTasks]
    .filter((task) => {
      const key = `${task.title}-${task.linkedTo}`;
      if (seenTitles.has(key)) return false;
      seenTitles.add(key);
      return true;
    })
    .sort((left, right) => {
      const priorityOrder = { urgent: 0, high: 1, normal: 2 };
      if (priorityOrder[left.priority] !== priorityOrder[right.priority]) {
        return priorityOrder[left.priority] - priorityOrder[right.priority];
      }
      const surfaceOrder = { Roadmap: 0, Debt: 1, Obligation: 2, Income: 3 };
      const leftSurface = surfaceOrder[(left.linkedTo ?? "Income") as keyof typeof surfaceOrder] ?? 4;
      const rightSurface = surfaceOrder[(right.linkedTo ?? "Income") as keyof typeof surfaceOrder] ?? 4;
      if (leftSurface !== rightSurface) {
        return leftSurface - rightSurface;
      }
      return new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime();
    })
    .slice(0, 4);
}

export function applyQuickAddToSetup(setup: StoredLifeOsSetup, draft: QuickAddDraft): StoredLifeOsSetup {
  const nextSetup = {
    ...setup,
    obligations: [...setup.obligations],
    income: [...setup.income],
    transactions: [...setup.transactions],
  };

  if (draft.kind === "expense") {
    nextSetup.transactions.push(createTransactionFromQuickAdd(draft));
    if (draft.saveAsObligation || (draft.recurrence && draft.recurrence !== "one-time")) {
      nextSetup.obligations.push({
        id: createDraftId(),
        name: draft.title.trim() || draft.merchantOrSource.trim() || "Upcoming expense",
        amount: draft.amount,
        dueDate: draft.obligationDueDate ?? draft.date,
        recurrence: draft.recurrence ?? "one-time",
        linkedAccount: draft.account,
      });
    }
    return nextSetup;
  }

  if (draft.kind === "income") {
    if (draft.status === "received") {
      nextSetup.transactions.push(createTransactionFromQuickAdd(draft));
    } else {
      nextSetup.income.push({
        id: createDraftId(),
        source: draft.merchantOrSource.trim() || draft.title.trim() || "Expected income",
        expectedAmount: draft.amount,
        dueDate: draft.date,
        recurrence: draft.recurrence ?? "one-time",
        linkedAccount: draft.account,
      });
    }

    if (draft.status === "received" && draft.recurrence && draft.recurrence !== "one-time") {
      nextSetup.income.push({
        id: createDraftId(),
        source: draft.merchantOrSource.trim() || draft.title.trim() || "Recurring income",
        expectedAmount: draft.amount,
        dueDate: draft.date,
        recurrence: draft.recurrence,
        linkedAccount: draft.account,
      });
    }
    return nextSetup;
  }

  return nextSetup;
}

export function readStoredLifeOsSetup(): StoredLifeOsSetup | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(setupKey);
  if (!raw) return null;

  try {
    return normalizeStoredLifeOsSetup(JSON.parse(raw) as StoredLifeOsSetup);
  } catch {
    return null;
  }
}

export function saveStoredLifeOsSetup(payload: StoredLifeOsSetup) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(setupKey, JSON.stringify(normalizeStoredLifeOsSetup(payload)));
  window.localStorage.setItem(onboardingKey, "true");
  window.dispatchEvent(new Event(changedEvent));
}

export function buildDashboardFromSetup(setup: StoredLifeOsSetup | null): DashboardSnapshot {
  if (!setup) return sampleDashboard;

  const normalizedSetup = normalizeStoredLifeOsSetup(setup);
  const openingAccounts = mapAccounts(normalizedSetup.accounts);
  const recentTransactions = mapTransactions(normalizedSetup.transactions);
  const accounts = applyTransactionsToAccounts(openingAccounts, recentTransactions);
  const upcomingIncome = mapIncome(normalizedSetup.income, accounts);
  const baseNextIncomeDate = getPlanningHorizon(upcomingIncome, [], [], normalizedSetup.strategyDocument);
  const recordedIncomeEstimate = money(
    upcomingIncome
      .filter((item) => item.status === "expected")
      .filter((item) => new Date(item.dueDate).getTime() <= new Date(baseNextIncomeDate).getTime())
      .reduce((sum, item) => sum + item.amount, 0),
  );
  const strategyExpectedIncomeEstimate = getStrategyExpectedIncomeTotal(normalizedSetup.strategyDocument, baseNextIncomeDate);
  const advisoryIncomeEstimate = recordedIncomeEstimate || strategyExpectedIncomeEstimate;
  const debts = applyStrategyToDebts(mapDebts(normalizedSetup.debts), normalizedSetup.strategyDocument, advisoryIncomeEstimate);
  const obligations = applyStrategyToObligations(mapObligations(normalizedSetup.obligations, accounts), normalizedSetup.strategyDocument);
  const nextIncomeDate = getPlanningHorizon(upcomingIncome, obligations, debts, normalizedSetup.strategyDocument);
  const baseAvailableSpend = computeAvailableSpend({
    accounts,
    obligations,
    debts,
    upcomingIncome,
    protectedCashBuffer: parseAmount(normalizedSetup.protectedBuffer),
    manualReserves: parseAmount(normalizedSetup.savingsFloor),
    essentialSpendRemaining: parseAmount(normalizedSetup.essentialTarget),
    nextIncomeDate,
  });
  const strategyIncomeBeforeNextIncome = baseAvailableSpend.reliableIncomeBeforeNextIncome || getStrategyExpectedIncomeTotal(normalizedSetup.strategyDocument, nextIncomeDate);
  const strategyAllocations = buildStrategyAllocationRows(normalizedSetup.strategyDocument, strategyIncomeBeforeNextIncome);
  const strategyDebtExtraPayments = buildStrategyDebtExtraRows(
    normalizedSetup.strategyDocument,
    debts,
    nextIncomeDate,
    strategyIncomeBeforeNextIncome,
  );
  const strategyObligationInstallments = buildStrategyObligationInstallmentRows(
    normalizedSetup.strategyDocument,
    obligations,
    nextIncomeDate,
  );
  const strategyPressure = money(
    [...strategyAllocations, ...strategyDebtExtraPayments, ...strategyObligationInstallments].reduce(
      (sum, item) => sum + item.amount,
      0,
    ),
  );
  const availableSpend = {
    ...baseAvailableSpend,
    strategyAllocations,
    strategyDebtExtraPayments,
    strategyObligationInstallments,
    availableThroughNextIncome: money(baseAvailableSpend.availableThroughNextIncome - strategyPressure),
  };

  const strategyRoadmapItems = buildStrategyRoadmapItems(normalizedSetup.strategyDocument, debts, obligations);
  const mergedRoadmapItems = mergeRoadmapItems(normalizedSetup.roadmapItems, strategyRoadmapItems);
  const roadmapItemsById = new Map(mergedRoadmapItems.map((item) => [item.id, item]));
  const roadmapItems = mergedRoadmapItems
    .map((item) => deriveRoadmapItemState(item, roadmapItemsById, obligations, debts))
    .sort((left, right) => (right.urgencyScore ?? 0) - (left.urgencyScore ?? 0));
  const roadmapSummary = buildRoadmapSummary(roadmapItems);
  const roadmapFocus = buildRoadmapFocus(roadmapItems, roadmapSummary);
  const topPriorities = buildTopPriorities(obligations, debts, upcomingIncome, roadmapItems);

  return {
    ...sampleDashboard,
    generatedAt: new Date().toISOString(),
    today: new Date().toISOString(),
    nextItem: roadmapFocus.nextStep?.title ?? topPriorities[0]?.title ?? "Finish setup in Settings",
    afterThat: topPriorities[1]?.title ?? "Add your next bill",
    availableSpend,
    cashSummary: {
      totalCash: getTotalCash(accounts),
      checking: money(accounts.filter((item) => item.type === "checking").reduce((sum, item) => sum + item.balance, 0)),
      savings: money(accounts.filter((item) => item.type === "savings").reduce((sum, item) => sum + item.balance, 0)),
      creditCard: getCreditCardBalance(accounts),
      totalDebt: computeTotalDebt(accounts, debts),
      overdueObligations: money(obligations.filter((item) => item.status === "overdue").reduce((sum, item) => sum + item.amount, 0)),
      upcomingIncome: getFutureExpectedIncomeTotal(upcomingIncome),
    },
    topPriorities,
    upcomingIncome,
    accounts,
    obligations,
    debts,
    merchants: mergeTransactionMerchants(obligations, recentTransactions),
    sources: mergeSources(upcomingIncome, recentTransactions),
    recentTransactions: recentTransactions.slice(0, 6),
    roadmap: {
      items: roadmapItems,
      summary: roadmapSummary,
      focus: roadmapFocus,
      strategy: normalizedSetup.strategyDocument,
    },
  };
}

export function useStoredLifeOsSetup() {
  const [setup, setSetup] = useState<StoredLifeOsSetup | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const sync = () => {
      setSetup(readStoredLifeOsSetup() ?? createEmptyStoredLifeOsSetup());
      setHydrated(true);
    };
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener(changedEvent, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(changedEvent, sync);
    };
  }, []);

  const save = (nextSetup: StoredLifeOsSetup) => {
    saveStoredLifeOsSetup(nextSetup);
    setSetup(nextSetup);
  };

  return {
    setup: hydrated ? setup ?? createEmptyStoredLifeOsSetup() : createEmptyStoredLifeOsSetup(),
    hydrated,
    save,
  };
}

export function useLifeOsDashboard() {
  const [setup, setSetup] = useState<StoredLifeOsSetup | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const sync = () => {
      setSetup(readStoredLifeOsSetup());
      setHydrated(true);
    };
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener(changedEvent, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(changedEvent, sync);
    };
  }, []);

  return useMemo(() => buildDashboardFromSetup(hydrated ? setup : null), [hydrated, setup]);
}
