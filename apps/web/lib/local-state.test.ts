import { describe, expect, it } from "vitest";
import {
  applyQuickAddToSetup,
  buildDashboardFromSetup,
  parseStrategyDocument,
  saveStrategyToSetup,
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
  it("parses and saves a valid strategy document", () => {
    const parsed = parseStrategyDocument(strategyJson);
    expect(parsed.errors).toEqual([]);
    expect(parsed.document?.goals[0]?.id).toBe("goal-credit-card-reset");

    const saved = saveStrategyToSetup(baseSetup, strategyJson);
    expect(saved.errors).toEqual([]);
    expect(saved.setup.strategyDocument?.debtPlan[0]?.mode).toBe("minimum_plus");
  });

  it("rejects invalid strategy json without overwriting the stored strategy", () => {
    const seeded = saveStrategyToSetup(baseSetup, strategyJson).setup;
    const invalid = saveStrategyToSetup(seeded, JSON.stringify({ version: 1, name: "Broken plan" }));

    expect(invalid.errors[0]).toContain("goals");
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
});
