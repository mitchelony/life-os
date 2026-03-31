import type { StoredLifeOsSetup } from "@/lib/local-state";
import type { StrategyDocument } from "@/lib/types";

export type OnboardingPresetId = "blank" | "student-demo";

export type OnboardingPresetOption = {
  id: OnboardingPresetId;
  label: string;
  description: string;
  bullets: string[];
  recommended?: boolean;
};

export const onboardingPresetOptions: OnboardingPresetOption[] = [
  {
    id: "blank",
    label: "Start blank",
    description: "Fill in your own numbers from scratch.",
    bullets: ["No sample balances", "No starter bills", "Best for your real setup"],
  },
  {
    id: "student-demo",
    label: "Use sample student data",
    description: "Load a realistic student money setup with campus pay, family help, aid-refund timing, and a ready-to-demo plan.",
    bullets: ["Campus shifts and side money", "Family support and aid refund timing", "Roadmap + income plan already mapped"],
    recommended: true,
  },
];

function emptySetup(): StoredLifeOsSetup {
  return {
    displayName: "",
    protectedBuffer: "0",
    essentialTarget: "0",
    savingsFloor: "0",
    notes: "",
    accounts: [],
    obligations: [],
    debts: [],
    income: [],
    transactions: [],
    manualTasks: [],
    taskOverrides: [],
    roadmapItems: [],
    strategyDocument: null,
  };
}

function addDays(referenceDate: Date, days: number) {
  const next = new Date(referenceDate);
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
}

function buildStudentStrategy(referenceDate: Date): StrategyDocument {
  return {
    version: 2,
    name: "Student cash flow game plan",
    summary: "Cover essentials first, protect a buffer for uneven weeks, and stay ahead of the small bills that can throw off the month.",
    effectiveDate: addDays(referenceDate, 0),
    currency: "USD",
    planningHorizonDays: 21,
    strategyMode: "cash_flow_first",
    goals: [
      {
        id: "goal-april-cashflow",
        title: "Stay ahead of April bills",
        category: "finances",
        status: "active",
        priority: "critical",
        targetDate: addDays(referenceDate, 21),
        notes: "Keep rent share, phone, and groceries covered even when money lands on different days.",
      },
      {
        id: "goal-summer-buffer",
        title: "Build a $300 finals-to-summer buffer",
        category: "finances",
        status: "planned",
        priority: "high",
        targetDate: addDays(referenceDate, 45),
        targetAmount: 300,
        notes: "Set aside a cushion before campus hours slow down after finals.",
      },
    ],
    expectedIncome: [
      {
        id: "income-campus-shift",
        label: "Campus rec center shift",
        amount: 145,
        timing: "next_week",
        certainty: "confirmed",
      },
      {
        id: "income-parent-transfer",
        label: "Mom transfer",
        amount: 175,
        timing: "in_2_weeks",
        certainty: "confirmed",
      },
      {
        id: "income-refund-check",
        label: "Aid refund",
        amount: 420,
        timing: "after_mid_april",
        certainty: "conditional",
      },
    ],
    nextIncomePlans: [
      {
        id: "plan-friday-income",
        incomeId: "income-campus-shift",
        label: "Friday deposit plan",
        amount: 145,
        allocations: [
          {
            id: "alloc-groceries",
            label: "Groceries + laundry reload",
            amount: 55,
            type: "obligation_payment",
            priority: 1,
          },
          {
            id: "alloc-phone",
            label: "Mint Mobile",
            amount: 35,
            type: "obligation_payment",
            priority: 2,
          },
          {
            id: "alloc-card-min",
            label: "Student card minimum",
            amount: 25,
            type: "debt_payment",
            priority: 3,
          },
          {
            id: "alloc-buffer",
            label: "Cash cushion",
            amount: 30,
            type: "buffer",
            priority: 4,
          },
        ],
        recommendedStep: "Handle groceries, your phone bill, and the card minimum before any social spending.",
      },
    ],
    cashFlowPlan: {
      defaultFlowOrder: ["minimum_required_payments", "weekly_essentials", "protected_buffer", "overdue_utilities"],
      weeklyEssentialsCap: 110,
      noNewCreditCardSpending: true,
      bufferTarget: 150,
    },
    debtPlan: [
      {
        debtName: "Discover Student Card",
        mode: "minimum_plus",
        minimumSource: "manual",
        minimumPayment: 25,
        extraPaymentRule: {
          type: "follow_next_income_plan",
        },
        priority: "high",
        notes: "Keep it current so one uneven week does not spill into the next.",
      },
    ],
    obligationPlan: [
      {
        obligationName: "Phone bill",
        handling: "pay_once",
        priority: "critical",
        notes: "Pay this from the next confirmed shift deposit.",
      },
      {
        obligationName: "Rent share",
        handling: "pay_over_time",
        installment: {
          amount: 150,
          cadence: "within_horizon",
        },
        priority: "critical",
        notes: "Split this across the next two income moments instead of letting it hit all at once.",
      },
    ],
    spendingRules: {
      weeklyEssentialsCap: 110,
      notes: "Keep takeout and rideshare low until the aid refund clears.",
    },
    guidance: {
      focusOrder: ["next_income_plan", "critical_obligation", "critical_debt", "buffer", "goal_progress"],
      recommendedStepStyle: "next_planned_allocation",
      primaryUXMode: "next_payments_to_make",
    },
  };
}

function buildStudentDemoSetup(referenceDate: Date): StoredLifeOsSetup {
  const strategyDocument = buildStudentStrategy(referenceDate);

  return {
    displayName: "Nia Brooks",
    protectedBuffer: "150",
    essentialTarget: "110",
    savingsFloor: "300",
    notes: "Income moves around week to week, so keep the plan centered on essentials, upcoming bills, and the next confirmed money in.",
    accounts: [
      {
        id: "acct-chase-checking",
        name: "Chase Student Checking",
        institution: "Chase",
        type: "checking",
        balance: "286.14",
      },
      {
        id: "acct-cash-savings",
        name: "Emergency savings",
        institution: "Cash App",
        type: "savings",
        balance: "300.00",
      },
      {
        id: "acct-discover-student",
        name: "Discover it Student Card",
        institution: "Discover",
        type: "credit_card",
        balance: "-182.40",
      },
    ],
    obligations: [
      {
        id: "obl-rent-share",
        name: "Off-campus rent split",
        amount: "300",
        dueDate: addDays(referenceDate, 5),
        recurrence: "monthly",
        linkedAccount: "Chase Student Checking",
      },
      {
        id: "obl-phone",
        name: "Mint Mobile",
        amount: "35",
        dueDate: addDays(referenceDate, 3),
        recurrence: "monthly",
        linkedAccount: "Chase Student Checking",
      },
      {
        id: "obl-laundry",
        name: "Laundry card + grocery run",
        amount: "55",
        dueDate: addDays(referenceDate, 2),
        recurrence: "weekly",
        linkedAccount: "Chase Student Checking",
      },
    ],
    debts: [
      {
        id: "debt-discover-student",
        name: "Discover it Student Card",
        balance: "182.40",
        minimum: "25",
        dueDate: addDays(referenceDate, 6),
      },
    ],
    income: [
      {
        id: "income-campus-shift",
        source: "Campus rec center shift",
        expectedAmount: "145",
        dueDate: addDays(referenceDate, 4),
        recurrence: "weekly",
        linkedAccount: "Chase Student Checking",
      },
      {
        id: "income-parent-transfer",
        source: "Mom transfer",
        expectedAmount: "175",
        dueDate: addDays(referenceDate, 11),
        recurrence: "monthly",
        linkedAccount: "Chase Student Checking",
      },
      {
        id: "income-refund-check",
        source: "Aid refund",
        expectedAmount: "420",
        dueDate: addDays(referenceDate, 15),
        recurrence: "one-time",
        linkedAccount: "Chase Student Checking",
      },
    ],
    transactions: [
      {
        id: "tx-campus-lunch",
        kind: "expense",
        title: "Late-night food run",
        amount: "12.45",
        date: addDays(referenceDate, -1),
        account: "Chase Student Checking",
        counterparty: "Student Union",
        category: "Food",
      },
      {
        id: "tx-campus-pay",
        kind: "income",
        title: "Campus payroll deposit",
        amount: "138.00",
        date: addDays(referenceDate, -5),
        account: "Chase Student Checking",
        counterparty: "Campus Payroll",
        category: "Income",
      },
      {
        id: "tx-books",
        kind: "expense",
        title: "Organic chem lab goggles",
        amount: "28.75",
        date: addDays(referenceDate, -6),
        account: "Discover it Student Card",
        counterparty: "Campus Store",
        category: "School",
      },
    ],
    manualTasks: [
      {
        id: "task-bursar",
        title: "Check the bursar portal before the late fee posts",
        dueDate: addDays(referenceDate, 2),
        priority: "high",
        linkedTo: "School",
        completed: false,
        source: "manual",
        notes: "Make sure the aid refund timeline still holds.",
      },
    ],
    taskOverrides: [],
    roadmapItems: [
      {
        id: "roadmap-april-cashflow",
        title: "Stay ahead of April bills",
        description: "Use each incoming dollar in order so rent share, phone, and groceries are covered before anything optional.",
        category: "finances",
        status: "active",
        priority: "critical",
        targetDate: addDays(referenceDate, 14),
        timeframeLabel: "Next 2 weeks",
        progressMode: "steps",
        progressValue: 1,
        steps: [
          {
            id: "step-cover-groceries",
            title: "Use Friday's shift money for groceries and laundry",
            completed: true,
            dueDate: addDays(referenceDate, 2),
          },
          {
            id: "step-cover-phone",
            title: "Pay Mint Mobile from the next shift payout",
            completed: false,
            dueDate: addDays(referenceDate, 3),
          },
          {
            id: "step-cover-rent-share",
            title: "Split the rent share between the next shift and Mom transfer",
            completed: false,
            dueDate: addDays(referenceDate, 5),
          },
        ],
        notes: "This should stay ahead of social spending until the aid refund lands.",
        dependencyIds: [],
        linkedStrategyGoalId: "goal-april-cashflow",
        strategyBacked: true,
        derivedNextStep: "Pay Mint Mobile from the next shift payout.",
        urgencyScore: 98,
        reason: "Bills are due before the aid refund clears.",
      },
      {
        id: "roadmap-summer-buffer",
        title: "Build a $300 finals-to-summer buffer",
        description: "Keep a cushion before campus hours drop and summer costs shift.",
        category: "finances",
        status: "planned",
        priority: "high",
        targetDate: addDays(referenceDate, 45),
        timeframeLabel: "Before finals end",
        progressMode: "percent",
        progressValue: 32,
        steps: [],
        notes: "Move part of the refund check here if it clears on time.",
        dependencyIds: ["roadmap-april-cashflow"],
        linkedStrategyGoalId: "goal-summer-buffer",
        strategyBacked: true,
      },
    ],
    strategyDocument,
  };
}

export function createOnboardingSetupPreset(id: OnboardingPresetId, referenceDate = new Date()): StoredLifeOsSetup {
  if (id === "student-demo") {
    return buildStudentDemoSetup(referenceDate);
  }

  return emptySetup();
}
