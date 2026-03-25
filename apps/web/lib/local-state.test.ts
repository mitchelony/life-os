import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyQuickAddToSetup,
  buildDashboardFromSetup,
  createEmptyStoredLifeOsSetup,
  onboardingKey,
  parseStrategyDocument,
  saveStrategyToSetup,
  saveStoredLifeOsSetup,
  setupKey,
  type StoredLifeOsSetup,
} from "./local-state";
import type { QuickAddDraft } from "./types";

const baseSetup: StoredLifeOsSetup = {
  displayName: "Mitchel",
  protectedBuffer: "100",
  essentialTarget: "250",
  savingsFloor: "300",
  notes: "",
  accounts: [
    {
      id: "acct-1",
      name: "Wells Fargo Checking",
      institution: "Wells Fargo",
      type: "checking",
      balance: "1200",
    },
  ],
  obligations: [],
  debts: [],
  income: [],
  transactions: [],
  roadmapItems: [],
  strategyDocument: null,
};

type MockWindow = Window & {
  localStorage: Storage;
};

function createMockStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  } satisfies Storage;
}

const originalWindow = globalThis.window;

beforeEach(() => {
  const mockWindow = {
    localStorage: createMockStorage(),
    dispatchEvent: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  } as unknown as MockWindow;

  vi.stubGlobal("window", mockWindow);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  if (originalWindow) {
    vi.stubGlobal("window", originalWindow);
  }
});

const strategyJson = JSON.stringify(
  {
    version: 1,
    name: "Debt reset plan",
    summary: "Stabilize cash flow, keep rent current, and reduce high-interest debt first.",
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
        { id: "alloc-debt-extra", label: "Extra debt payment", type: "percent", value: 25, priority: 3 },
      ],
    },
    debtPlan: [
      {
        debtName: "Capital One Credit Card",
        mode: "minimum_plus",
        minimumSource: "existing",
        extraPaymentRule: { type: "fixed", value: 75 },
        priority: "critical",
        notes: "Pay minimum plus extra after buffer and essentials.",
      },
    ],
    obligationPlan: [
      {
        obligationName: "Tuition",
        handling: "pay_over_time",
        installment: { amount: 200, cadence: "monthly" },
        priority: "high",
        notes: "Split this across the month instead of treating it as one lump sum.",
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

const realWorldStrategyJson = JSON.stringify(
  {
    version: 1,
    name: "Financial reset plan",
    summary: "Protect a small emergency buffer, reduce the overdue utilities balance, and bring the Capital One card under control without adding new debt.",
    effectiveDate: "2026-03-24",
    currency: "USD",
    planningHorizonDays: 30,
    goals: [
      {
        id: "goal-buffer",
        title: "Build first emergency buffer",
        category: "finances",
        status: "active",
        priority: "high",
        targetDate: "2026-04-15",
        notes: "Protect the first $100 so small emergencies do not go back onto the credit card.",
      },
      {
        id: "goal-utilities-catchup",
        title: "Catch up on utilities balance",
        category: "finances",
        status: "active",
        priority: "critical",
        targetDate: "2026-04-30",
        notes: "Utilities are owed through the roommate.",
      },
      {
        id: "goal-credit-card-reset",
        title: "Bring Capital One under control",
        category: "finances",
        status: "active",
        priority: "critical",
        targetDate: "2026-04-30",
        notes: "Pay at least the minimum on time, then push extra cash here.",
      },
      {
        id: "goal-taxes",
        title: "File taxes this week",
        category: "admin",
        status: "active",
        priority: "high",
        targetDate: "2026-03-31",
        notes: "Complete tax filing this week.",
      },
    ],
    incomePlan: {
      allocations: [
        { id: "alloc-buffer", label: "Protected buffer", type: "fixed", value: 100, priority: 1 },
        { id: "alloc-utilities", label: "Utilities catch-up", type: "fixed", value: 270, priority: 2 },
        { id: "alloc-credit-card", label: "Capital One payoff push", type: "fixed", value: 350, priority: 3 },
      ],
      expectedIncome: [
        { id: "income-photoshoot", label: "Photoshoot payment", amount: 100, timing: "next_week", certainty: "confirmed" },
        { id: "income-tutoring-paycheck", label: "Tutoring paycheck", amount: 390, timing: "in_2_weeks", certainty: "confirmed" },
        { id: "income-final-tutoring-week", label: "Final tutoring pay", amount: 130, timing: "after_2026-04-09", certainty: "confirmed" },
        { id: "income-dad-help", label: "Possible help from dad", amount: 100, timing: "as_available", certainty: "conditional" },
      ],
    },
    debtPlan: [
      {
        debtName: "Capital One Credit Card",
        mode: "minimum_plus",
        minimumSource: "existing",
        extraPaymentRule: {
          type: "fixed_total_target",
          value: 350,
        },
        priority: "critical",
        notes: "Do not add new spending to this card.",
      },
    ],
    obligationPlan: [
      {
        obligationName: "Utilities",
        handling: "pay_over_time",
        installment: {
          amount: 270,
          cadence: "within_horizon",
        },
        priority: "critical",
        notes: "Reduce the overdue balance within this horizon.",
      },
      {
        obligationName: "Rent",
        handling: "externally_covered",
        priority: "low",
        notes: "Currently covered by dad.",
      },
      {
        obligationName: "Tuition",
        handling: "externally_covered",
        priority: "low",
        notes: "Currently covered by dad.",
      },
      {
        obligationName: "Taxes",
        handling: "file_this_week",
        priority: "high",
        notes: "File this week.",
      },
    ],
    spendingRules: {
      weeklyEssentialsCap: 25,
      noNewCreditCardSpending: true,
      notes: "Use $20 to $30 per week for food and essentials.",
    },
    guidance: {
      focusOrder: ["overdue", "critical_debt", "critical_obligation", "buffer", "admin_deadlines", "goal_progress"],
      recommendedStepStyle: "first_incomplete_step",
    },
  },
  null,
  2,
);

const cashFlowStrategyJson = JSON.stringify(
  {
    version: 2,
    name: "Next paycheck recovery plan",
    summary: "Use the next incoming money in a strict order: protect a small buffer, cover essentials, reduce utilities, and push down the Capital One balance without adding new debt.",
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
        notes: "Protect the first $100 so small emergencies do not go back onto the credit card.",
      },
      {
        id: "goal-utilities-catchup",
        title: "Catch up on utilities",
        category: "finances",
        status: "active",
        priority: "critical",
        targetDate: "2026-04-30",
        targetAmount: 442.7,
        notes: "Utilities are owed through the roommate. Reduce the overdue balance quickly.",
      },
      {
        id: "goal-credit-card-reset",
        title: "Bring Capital One under control",
        category: "finances",
        status: "active",
        priority: "critical",
        targetDate: "2026-04-30",
        targetAmount: 498.28,
        notes: "Pay the minimum first, then direct extra cash here after buffer and utilities allocations.",
      },
      {
        id: "goal-taxes",
        title: "File taxes this week",
        category: "admin",
        status: "active",
        priority: "high",
        targetDate: "2026-03-31",
        notes: "Finish filing this week so it does not become another loose end.",
      },
    ],
    cashFlowPlan: {
      defaultFlowOrder: [
        "minimum_required_payments",
        "weekly_essentials",
        "protected_buffer",
        "overdue_utilities",
        "credit_card_extra",
        "admin_deadlines",
      ],
      weeklyEssentialsCap: 25,
      noNewCreditCardSpending: true,
      bufferTarget: 100,
    },
    expectedIncome: [
      {
        id: "income-photoshoot",
        label: "Photoshoot payment",
        amount: 100,
        timing: "next_week",
        certainty: "confirmed",
      },
      {
        id: "income-tutoring-paycheck",
        label: "Tutoring paycheck",
        amount: 390,
        timing: "in_2_weeks",
        certainty: "confirmed",
      },
      {
        id: "income-final-tutoring-week",
        label: "Final tutoring pay",
        amount: 130,
        timing: "after_2026-04-09",
        certainty: "confirmed",
      },
      {
        id: "income-dad-help",
        label: "Possible help from dad",
        amount: 100,
        timing: "as_available",
        certainty: "conditional",
      },
    ],
    nextIncomePlans: [
      {
        id: "plan-photoshoot",
        incomeId: "income-photoshoot",
        label: "When photoshoot money lands",
        amount: 100,
        allocations: [
          {
            id: "plan-photoshoot-buffer",
            label: "Emergency buffer",
            amount: 50,
            type: "buffer",
            priority: 1,
          },
          {
            id: "plan-photoshoot-credit-card",
            label: "Capital One payment",
            amount: 100,
            type: "debt_payment",
            priority: 2,
          },
        ],
        recommendedStep: "Save $50 first, then send $100 to Capital One.",
      },
      {
        id: "plan-tutoring-paycheck",
        incomeId: "income-tutoring-paycheck",
        label: "When the $390 tutoring paycheck lands",
        amount: 390,
        allocations: [
          {
            id: "plan-paycheck-buffer",
            label: "Finish emergency buffer",
            amount: 50,
            type: "buffer",
            priority: 1,
          },
          {
            id: "plan-paycheck-utilities",
            label: "Utilities catch-up payment",
            amount: 170,
            type: "obligation_payment",
            priority: 2,
          },
          {
            id: "plan-paycheck-credit-card",
            label: "Capital One payment",
            amount: 170,
            type: "debt_payment",
            priority: 3,
          },
        ],
        recommendedStep: "Complete the $100 buffer, then split the rest evenly between utilities and Capital One.",
      },
      {
        id: "plan-final-tutoring",
        incomeId: "income-final-tutoring-week",
        label: "When the final tutoring pay lands",
        amount: 130,
        allocations: [
          {
            id: "plan-final-utilities",
            label: "Utilities catch-up payment",
            amount: 100,
            type: "obligation_payment",
            priority: 1,
          },
          {
            id: "plan-final-credit-card",
            label: "Capital One payment",
            amount: 30,
            type: "debt_payment",
            priority: 2,
          },
        ],
        recommendedStep: "Push most of this check to utilities, then send the rest to Capital One.",
      },
      {
        id: "plan-dad-help",
        incomeId: "income-dad-help",
        label: "If dad sends extra money",
        amount: 100,
        allocations: [
          {
            id: "plan-dad-credit-card",
            label: "Capital One payment",
            amount: 100,
            type: "debt_payment",
            priority: 1,
          },
        ],
        recommendedStep: "Use this only as a debt push unless a true emergency comes up first.",
      },
    ],
    debtPlan: [
      {
        debtName: "Capital One Credit Card",
        currentBalance: 498.28,
        mode: "minimum_plus",
        minimumPayment: 10,
        minimumSource: "existing",
        extraPaymentRule: {
          type: "follow_next_income_plan",
        },
        priority: "critical",
        notes: "Do not add new spending to this card.",
      },
    ],
    obligationPlan: [
      {
        obligationName: "Utilities",
        currentBalance: 442.7,
        handling: "pay_over_time",
        priority: "critical",
        notes: "Reduce this overdue balance using the next-income payment flow.",
      },
      {
        obligationName: "Taxes",
        handling: "file_this_week",
        priority: "high",
        notes: "Complete filing this week.",
      },
    ],
    guidance: {
      focusOrder: [
        "next_income_plan",
        "minimum_required_payments",
        "overdue_obligations",
        "critical_debt",
        "buffer",
        "admin_deadlines",
      ],
      recommendedStepStyle: "next_planned_allocation",
      primaryUXMode: "next_payments_to_make",
    },
  },
  null,
  2,
);

describe("applyQuickAddToSetup", () => {
  it("can add a one-time upcoming obligation from quick add", () => {
    const draft: QuickAddDraft = {
      kind: "expense",
      amount: "420",
      title: "Car repair",
      merchantOrSource: "Mechanic",
      category: "Transport",
      account: "Wells Fargo Checking",
      date: "2026-03-24",
      notes: "",
      recurrence: "one-time",
      saveAsObligation: true,
      obligationDueDate: "2026-03-28",
    };

    const next = applyQuickAddToSetup(baseSetup, draft);

    expect(next.transactions).toHaveLength(1);
    expect(next.obligations).toHaveLength(1);
    expect(next.obligations[0]).toMatchObject({
      name: "Car repair",
      amount: "420",
      dueDate: "2026-03-28",
      recurrence: "one-time",
      linkedAccount: "Wells Fargo Checking",
    });
  });

  it("adds a recurring expense as both an actual transaction and an obligation", () => {
    const draft: QuickAddDraft = {
      kind: "expense",
      amount: "950",
      title: "Rent",
      merchantOrSource: "Landlord",
      category: "Housing",
      account: "Wells Fargo Checking",
      date: "2026-03-31",
      notes: "",
      recurrence: "monthly",
    };

    const next = applyQuickAddToSetup(baseSetup, draft);

    expect(next.obligations).toHaveLength(1);
    expect(next.obligations[0]).toMatchObject({
      name: "Rent",
      amount: "950",
      dueDate: "2026-03-31",
      recurrence: "monthly",
    });
    expect(next.transactions).toHaveLength(1);
    expect(next.transactions[0]).toMatchObject({
      kind: "expense",
      amount: "950",
      account: "Wells Fargo Checking",
    });
  });

  it("adds recurring expected income as an income plan without changing account cash", () => {
    const draft: QuickAddDraft = {
      kind: "income",
      amount: "2480",
      title: "Payroll deposit",
      merchantOrSource: "Employer",
      category: "Income",
      account: "Wells Fargo Checking",
      date: "2026-03-27",
      notes: "",
      status: "expected",
      recurrence: "biweekly",
    };

    const next = applyQuickAddToSetup(baseSetup, draft);

    expect(next.income).toHaveLength(1);
    expect(next.income[0]).toMatchObject({
      source: "Employer",
      expectedAmount: "2480",
      dueDate: "2026-03-27",
      recurrence: "biweekly",
    });
    expect(next.transactions).toHaveLength(0);
  });

  it("adds received income as an actual transaction", () => {
    const draft: QuickAddDraft = {
      kind: "income",
      amount: "200",
      title: "Cash job",
      merchantOrSource: "Client",
      category: "Income",
      account: "Wells Fargo Checking",
      date: "2026-03-26",
      notes: "",
      status: "received",
      recurrence: "one-time",
    };

    const next = applyQuickAddToSetup(baseSetup, draft);

    expect(next.transactions).toHaveLength(1);
    expect(next.transactions[0]).toMatchObject({
      kind: "income",
      amount: "200",
      counterparty: "Client",
    });
  });
});

describe("buildDashboardFromSetup", () => {
  it("returns an empty dashboard snapshot when no setup exists", () => {
    const snapshot = buildDashboardFromSetup(null);

    expect(snapshot.availableSpend.availableNow).toBe(0);
    expect(snapshot.availableSpend.availableThroughNextIncome).toBe(0);
    expect(snapshot.accounts).toEqual([]);
    expect(snapshot.obligations).toEqual([]);
    expect(snapshot.debts).toEqual([]);
    expect(snapshot.topPriorities).toEqual([]);
    expect(snapshot.nextItem).toBe("Finish setup in Settings");
  });

  it("parses and saves a valid strategy document", () => {
    const parsed = parseStrategyDocument(strategyJson);
    expect(parsed.errors).toEqual([]);
    expect(parsed.document?.goals[0]?.id).toBe("goal-credit-card-reset");

    const saved = saveStrategyToSetup(baseSetup, strategyJson);
    expect(saved.errors).toEqual([]);
    expect(saved.setup.strategyDocument?.debtPlan[0]?.mode).toBe("minimum_plus");
  });

  it("accepts the richer reset-plan schema used by the roadmap strategy workspace", () => {
    const parsed = parseStrategyDocument(realWorldStrategyJson);
    expect(parsed.errors).toEqual([]);
    expect(parsed.document?.incomePlan?.expectedIncome).toHaveLength(4);
    expect(parsed.document?.debtPlan[0]?.extraPaymentRule?.type).toBe("fixed_total_target");
    expect(parsed.document?.obligationPlan[0]?.installment?.cadence).toBe("within_horizon");
    expect(parsed.document?.obligationPlan[1]?.handling).toBe("externally_covered");
    expect(parsed.document?.spendingRules?.weeklyEssentialsCap).toBe(25);
  });

  it("accepts the cash-flow-first strategy schema with next income plans", () => {
    const parsed = parseStrategyDocument(cashFlowStrategyJson);
    expect(parsed.errors).toEqual([]);
    expect(parsed.document?.version).toBe(2);
    expect(parsed.document?.strategyMode).toBe("cash_flow_first");
    expect(parsed.document?.cashFlowPlan?.defaultFlowOrder[0]).toBe("minimum_required_payments");
    expect(parsed.document?.expectedIncome).toHaveLength(4);
    expect(parsed.document?.nextIncomePlans?.[0]?.allocations[0]?.type).toBe("buffer");
    expect(parsed.document?.debtPlan[0]?.extraPaymentRule?.type).toBe("follow_next_income_plan");
    expect(parsed.document?.guidance.recommendedStepStyle).toBe("next_planned_allocation");
  });

  it("rejects invalid strategy json without overwriting the stored strategy", () => {
    const seeded = saveStrategyToSetup(baseSetup, strategyJson).setup;
    const invalid = saveStrategyToSetup(seeded, JSON.stringify({ version: 1, name: "Broken plan" }));

    expect(invalid.errors.some((error) => error.includes("goals"))).toBe(true);
    expect(invalid.setup.strategyDocument?.name).toBe("Debt reset plan");
  });

  it("preserves recurrence on obligations and income items", () => {
    const snapshot = buildDashboardFromSetup({
      ...baseSetup,
      obligations: [
        {
          id: "obl-1",
          name: "Rent",
          amount: "950",
          dueDate: "2026-03-31",
          recurrence: "monthly",
        },
      ],
      income: [
        {
          id: "inc-1",
          source: "Employer",
          expectedAmount: "2480",
          dueDate: "2026-03-27",
          recurrence: "biweekly",
        },
      ],
    });

    expect(snapshot.obligations[0]?.recurrence).toBe("monthly");
    expect(snapshot.upcomingIncome[0]?.recurrence).toBe("biweekly");
  });

  it("uses local transactions instead of sample activity and updates balances", () => {
    const snapshot = buildDashboardFromSetup({
      ...baseSetup,
      debts: [
        {
          id: "debt-1",
          name: "Capital One Credit Card",
          balance: "498.28",
          minimum: "10",
          dueDate: "2026-03-26",
        },
      ],
      transactions: [
        {
          id: "tx-1",
          kind: "expense",
          title: "Groceries",
          amount: "50",
          date: "2026-03-24",
          account: "Wells Fargo Checking",
          counterparty: "Trader Joe's",
          category: "Food",
          notes: "",
        },
      ],
    });

    expect(snapshot.accounts[0]?.balance).toBe(1150);
    expect(snapshot.cashSummary.checking).toBe(1150);
    expect(snapshot.cashSummary.totalDebt).toBe(498.28);
    expect(snapshot.cashSummary.creditCard).toBe(0);
    expect(snapshot.recentTransactions).toHaveLength(1);
    expect(snapshot.recentTransactions[0]?.title).toBe("Groceries");
  });

  it("keeps available now conservative and adds expected income only to the next-income forecast", () => {
    const snapshot = buildDashboardFromSetup({
      ...baseSetup,
      protectedBuffer: "100",
      essentialTarget: "30",
      savingsFloor: "100",
      accounts: [
        {
          id: "acct-1",
          name: "Wells Fargo Checking",
          institution: "Wells Fargo",
          type: "checking",
          balance: "1.57",
        },
        {
          id: "acct-2",
          name: "Cash App Savings",
          institution: "Cash App",
          type: "savings",
          balance: "0.65",
        },
      ],
      debts: [
        {
          id: "debt-1",
          name: "Capital One Credit Card",
          balance: "498.28",
          minimum: "10",
          dueDate: "2099-03-26",
        },
      ],
      income: [
        {
          id: "inc-1",
          source: "Payroll deposit",
          expectedAmount: "1960",
          dueDate: "2099-03-27",
          recurrence: "biweekly",
          linkedAccount: "Wells Fargo Checking",
        },
      ],
    });

    expect(snapshot.availableSpend.liquidCash).toBe(2.22);
    expect(snapshot.availableSpend.reliableIncomeBeforeNextIncome).toBe(1960);
    expect(snapshot.availableSpend.availableNow).toBe(-237.78);
    expect(snapshot.availableSpend.availableThroughNextIncome).toBe(1722.22);
  });

  it("includes recurring bills due before the next income horizon", () => {
    const snapshot = buildDashboardFromSetup({
      ...baseSetup,
      protectedBuffer: "0",
      essentialTarget: "0",
      savingsFloor: "0",
      obligations: [
        {
          id: "obl-1",
          name: "Rent",
          amount: "600",
          dueDate: "2099-03-26",
          recurrence: "monthly",
        },
        {
          id: "obl-2",
          name: "Tuition",
          amount: "650",
          dueDate: "2099-03-27",
          recurrence: "monthly",
        },
        {
          id: "obl-3",
          name: "Internet",
          amount: "70",
          dueDate: "2099-04-10",
          recurrence: "monthly",
        },
      ],
      income: [
        {
          id: "inc-1",
          source: "Payroll deposit",
          expectedAmount: "1000",
          dueDate: "2099-03-27",
          recurrence: "biweekly",
        },
      ],
    });

    expect(snapshot.availableSpend.obligationsDueBeforeNextIncome).toBe(1250);
    expect(snapshot.availableSpend.availableNow).toBe(-50);
    expect(snapshot.availableSpend.availableThroughNextIncome).toBe(950);
  });

  it("uses the nearest required payment as the horizon when no income is planned", () => {
    const snapshot = buildDashboardFromSetup({
      ...baseSetup,
      protectedBuffer: "0",
      essentialTarget: "0",
      savingsFloor: "0",
      income: [],
      obligations: [
        {
          id: "obl-1",
          name: "Rent",
          amount: "600",
          dueDate: "2099-03-26",
          recurrence: "monthly",
        },
      ],
    });

    expect(snapshot.availableSpend.obligationsDueBeforeNextIncome).toBe(600);
    expect(snapshot.availableSpend.availableNow).toBe(600);
    expect(snapshot.availableSpend.availableThroughNextIncome).toBe(600);
  });

  it("adds strategy advisory rows and guidance without mutating the actual obligation amount", () => {
    const setup = saveStrategyToSetup(
      {
        ...baseSetup,
        protectedBuffer: "100",
        essentialTarget: "30",
        savingsFloor: "100",
        obligations: [
          {
            id: "obl-1",
            name: "Rent",
            amount: "600",
            dueDate: "2099-03-26",
            recurrence: "monthly",
          },
          {
            id: "obl-2",
            name: "Tuition",
            amount: "650",
            dueDate: "2099-03-27",
            recurrence: "monthly",
          },
        ],
        debts: [
          {
            id: "debt-1",
            name: "Capital One Credit Card",
            balance: "498.28",
            minimum: "10",
            dueDate: "2099-03-26",
          },
        ],
        income: [
          {
            id: "inc-1",
            source: "Payroll deposit",
            expectedAmount: "1000",
            dueDate: "2099-03-27",
            recurrence: "biweekly",
          },
        ],
      },
      strategyJson,
    ).setup;

    const snapshot = buildDashboardFromSetup(setup);
    const tuition = snapshot.obligations.find((item) => item.name === "Tuition");
    const debt = snapshot.debts.find((item) => item.name === "Capital One Credit Card");

    expect(snapshot.availableSpend.strategyAllocations[0]?.label).toBe("Protected buffer");
    expect(snapshot.availableSpend.strategyDebtExtraPayments[0]?.amount).toBe(75);
    expect(snapshot.availableSpend.strategyObligationInstallments[0]).toMatchObject({
      label: "Tuition installment reserve",
      amount: 200,
    });
    expect(tuition?.amount).toBe(650);
    expect(tuition?.strategy?.handling).toBe("pay_over_time");
    expect(tuition?.strategy?.installmentAmount).toBe(200);
    expect(debt?.strategy?.mode).toBe("minimum_plus");
    expect(debt?.strategy?.recommendedExtraPayment).toBe(75);
  });

  it("surfaces linked strategy goals and strategy-first urgency on the roadmap", () => {
    const setup = saveStrategyToSetup(
      {
        ...baseSetup,
        obligations: [
          {
            id: "obl-1",
            name: "Rent",
            amount: "600",
            dueDate: "2026-03-22",
            recurrence: "monthly",
          },
        ],
        debts: [
          {
            id: "debt-1",
            name: "Capital One Credit Card",
            balance: "498.28",
            minimum: "10",
            dueDate: "2026-03-24",
          },
        ],
        roadmapItems: [
          {
            id: "manual-goal-1",
            title: "Finish FAFSA review",
            description: "Submit the remaining aid paperwork.",
            category: "school",
            status: "active",
            priority: "high",
            targetDate: "2026-04-10",
            timeframeLabel: "",
            progressMode: "steps",
            progressValue: 0,
            steps: [
              { id: "step-1", title: "Upload documents", completed: false },
            ],
            notes: "",
            dependencyIds: [],
          },
        ],
      },
      strategyJson,
    ).setup;

    const snapshot = buildDashboardFromSetup(setup);

    expect(snapshot.roadmap.items.some((item) => item.linkedStrategyGoalId === "goal-credit-card-reset")).toBe(true);
    expect(snapshot.roadmap.summary.mostUrgentItem?.title).toBe("Bring Capital One under control");
    expect(snapshot.roadmap.focus.nextStep?.title).toContain("Capital One");
    expect(snapshot.topPriorities[0]?.title).toContain("Capital One");
  });

  it("uses confirmed strategy expected income as an advisory fallback horizon", () => {
    const setup = saveStrategyToSetup(
      {
        ...baseSetup,
        income: [],
        obligations: [
          {
            id: "obl-1",
            name: "Utilities",
            amount: "442.70",
            dueDate: "2026-04-10",
            recurrence: "one-time",
          },
        ],
        debts: [
          {
            id: "debt-1",
            name: "Capital One Credit Card",
            balance: "498.28",
            minimum: "10",
            dueDate: "2026-04-08",
          },
        ],
      },
      realWorldStrategyJson,
    ).setup;

    const snapshot = buildDashboardFromSetup(setup);

    expect(snapshot.availableSpend.strategyAllocations.some((item) => item.label === "Protected buffer")).toBe(true);
    expect(snapshot.debts[0]?.strategy?.recommendedExtraPayment).toBe(340);
  });

  it("surfaces next-income flow as the primary guidance when the strategy is cash-flow-first", () => {
    const setup = saveStrategyToSetup(
      {
        ...baseSetup,
        income: [],
        obligations: [
          {
            id: "obl-1",
            name: "Utilities",
            amount: "442.70",
            dueDate: "2026-04-10",
            recurrence: "one-time",
          },
        ],
        debts: [
          {
            id: "debt-1",
            name: "Capital One Credit Card",
            balance: "498.28",
            minimum: "10",
            dueDate: "2026-04-08",
          },
        ],
      },
      cashFlowStrategyJson,
    ).setup;

    const snapshot = buildDashboardFromSetup(setup);

    expect(snapshot.nextItem).toContain("Emergency buffer");
    expect(snapshot.roadmap.focus.nextStep?.title).toContain("Emergency buffer");
    expect(snapshot.topPriorities[0]?.linkedTo).toBe("Debt");
    expect(snapshot.availableSpend.strategyAllocations.map((item) => item.label)).toContain("Emergency buffer");
    expect(snapshot.availableSpend.strategyDebtExtraPayments.map((item) => item.label)).toContain("Capital One payment");
    expect(snapshot.debts[0]?.strategy?.recommendedExtraPayment).toBe(100);
    expect(snapshot.roadmap.items.some((item) => item.title.includes("photoshoot money"))).toBe(true);
  });

  it("does not repeat roadmap or paycheck-flow items in top actions", () => {
    const setup = saveStrategyToSetup(
      {
        ...baseSetup,
        income: [],
        obligations: [
          {
            id: "obl-1",
            name: "Utilities",
            amount: "442.70",
            dueDate: "2026-04-10",
            recurrence: "one-time",
          },
        ],
        debts: [
          {
            id: "debt-1",
            name: "Capital One Credit Card",
            balance: "498.28",
            minimum: "10",
            dueDate: "2026-04-08",
          },
        ],
      },
      cashFlowStrategyJson,
    ).setup;

    const snapshot = buildDashboardFromSetup(setup);

    expect(snapshot.roadmap.focus.nextStep?.title).toContain("Emergency buffer");
    expect(snapshot.topPriorities.some((task) => task.linkedTo === "Roadmap")).toBe(false);
    expect(snapshot.topPriorities.some((task) => task.linkedTo === "Paycheck flow")).toBe(false);
    expect(snapshot.topPriorities.some((task) => task.linkedTo === "Debt")).toBe(true);
    expect(snapshot.topPriorities.some((task) => task.linkedTo === "Obligation")).toBe(true);
  });
});

describe("saveStoredLifeOsSetup", () => {
  it("persists setup without marking onboarding complete", () => {
    saveStoredLifeOsSetup(createEmptyStoredLifeOsSetup());

    expect(window.localStorage.getItem(setupKey)).not.toBeNull();
    expect(window.localStorage.getItem(onboardingKey)).toBeNull();
  });
});
