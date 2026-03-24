import { computeAvailableSpend, getTotalCash, money } from "@/lib/finance";
import type { DashboardSnapshot } from "@/lib/types";

const today = new Date("2026-03-23T08:00:00-05:00");
const nextIncomeDate = new Date("2026-03-27T09:00:00-05:00");

export const sampleDashboard = (() => {
  const accounts = [
    {
      id: "acct-wf-checking",
      name: "Wells Fargo Checking",
      institution: "Wells Fargo",
      type: "checking" as const,
      balance: 1842.17,
      active: true,
      notes: "Primary daily spend account",
    },
    {
      id: "acct-cash-app",
      name: "Cash App Checking",
      institution: "Cash App",
      type: "checking" as const,
      balance: 612.44,
      active: true,
      notes: "Bills and transfers",
    },
    {
      id: "acct-cash-app-savings",
      name: "Cash App Savings",
      institution: "Cash App",
      type: "savings" as const,
      balance: 1480.12,
      active: true,
      notes: "Protected savings buffer",
    },
    {
      id: "acct-capital-one",
      name: "Capital One Credit Card",
      institution: "Capital One",
      type: "credit_card" as const,
      balance: -318.49,
      active: true,
      notes: "Current card balance",
    },
  ];

  const obligations = [
    {
      id: "obl-rent",
      name: "Rent",
      amount: 950,
      dueDate: "2026-03-26",
      status: "due_soon" as const,
      recurrence: "monthly" as const,
      linkedAccount: "Wells Fargo Checking",
    },
    {
      id: "obl-electric",
      name: "Electric bill",
      amount: 73.22,
      dueDate: "2026-03-29",
      status: "scheduled" as const,
      recurrence: "monthly" as const,
      linkedAccount: "Cash App Checking",
    },
    {
      id: "obl-internet",
      name: "Internet",
      amount: 68,
      dueDate: "2026-03-31",
      status: "scheduled" as const,
      recurrence: "monthly" as const,
      linkedAccount: "Wells Fargo Checking",
    },
  ];

  const debts = [
    {
      id: "debt-cap-one",
      name: "Capital One Credit Card",
      currentBalance: 318.49,
      minimumPayment: 52,
      dueDate: "2026-03-25",
      payoffProgress: 0.22,
      notes: "Minimum payment due before payday",
    },
  ];

  const topPriorities = [
    {
      id: "task-tax",
      title: "File tax documents",
      dueDate: "2026-03-24",
      priority: "urgent" as const,
      linkedTo: "Finance",
      completed: false,
    },
    {
      id: "task-call-landlord",
      title: "Confirm rent autopay date",
      dueDate: "2026-03-25",
      priority: "high" as const,
      linkedTo: "Rent",
      completed: false,
    },
    {
      id: "task-budget",
      title: "Review weekly essentials target",
      dueDate: "2026-03-27",
      priority: "high" as const,
      linkedTo: "Budget",
      completed: false,
    },
  ];

  const upcomingIncome = [
    {
      id: "inc-paycheck-1",
      source: "Payroll deposit",
      amount: 2480,
      dueDate: "2026-03-27",
      status: "expected" as const,
      linkedAccount: "Wells Fargo Checking",
      recurrence: "biweekly" as const,
    },
  ];

  const merchants = [
    { id: "m-walmart", name: "Walmart", usageCount: 7, category: "Essentials" },
    { id: "m-target", name: "Target", usageCount: 4, category: "Essentials" },
    { id: "m-shell", name: "Shell", usageCount: 3, category: "Transport" },
    { id: "m-doordash", name: "DoorDash", usageCount: 5, category: "Food" },
  ];

  const sources = [
    { id: "s-payroll", name: "Payroll deposit", usageCount: 9, category: "Income" },
    { id: "s-cash-app", name: "Cash App transfer", usageCount: 4, category: "Transfer" },
    { id: "s-freelance", name: "Freelance client", usageCount: 2, category: "Income" },
  ];

  const recentTransactions = [
    {
      id: "tx-groceries",
      kind: "expense" as const,
      title: "Groceries",
      amount: 64.38,
      date: "2026-03-22",
      account: "Wells Fargo Checking",
      counterparty: "Walmart",
      category: "Food",
    },
    {
      id: "tx-income",
      kind: "income" as const,
      title: "Payroll deposit",
      amount: 2468.12,
      date: "2026-03-20",
      account: "Wells Fargo Checking",
      counterparty: "Employer",
      category: "Income",
    },
    {
      id: "tx-gas",
      kind: "expense" as const,
      title: "Fuel",
      amount: 37.5,
      date: "2026-03-19",
      account: "Cash App Checking",
      counterparty: "Shell",
      category: "Transport",
    },
  ];

  const availableSpend = computeAvailableSpend({
    accounts,
    obligations,
    debts,
    upcomingIncome,
    protectedCashBuffer: 750,
    manualReserves: 180,
    essentialSpendRemaining: 310,
    nextIncomeDate: nextIncomeDate.toISOString(),
  });

  const snapshot: DashboardSnapshot = {
    generatedAt: today.toISOString(),
    today: today.toISOString(),
    nextItem: "Capital One minimum payment due tomorrow",
    afterThat: "Rent due in 3 days",
    availableSpend,
    cashSummary: {
      totalCash: getTotalCash(accounts),
      checking: money(accounts.filter((account) => account.type === "checking").reduce((sum, account) => sum + account.balance, 0)),
      savings: money(accounts.filter((account) => account.type === "savings").reduce((sum, account) => sum + account.balance, 0)),
      creditCard: money(accounts.filter((account) => account.type === "credit_card").reduce((sum, account) => sum + Math.abs(account.balance), 0)),
      totalDebt: money(debts.reduce((sum, debt) => sum + debt.currentBalance, 0)),
      overdueObligations: 0,
      upcomingIncome: money(upcomingIncome.reduce((sum, item) => sum + item.amount, 0)),
    },
    topPriorities,
    upcomingIncome,
    accounts,
    obligations,
    debts,
    merchants,
    sources,
    recentTransactions,
    roadmap: {
      items: [],
      summary: {
        activeCount: 0,
        overdueCount: 0,
        completedCount: 0,
        debtOrObligationCount: 0,
        overallProgress: 0,
        mostUrgentItem: null,
        recommendedNextStep: null,
      },
      focus: {
        item: null,
        nextStep: null,
        whyNow: "Add a strategy in Roadmap to surface the right next move.",
      },
      strategy: null,
    },
  };

  return snapshot;
})();

export const sampleCategories = [
  "Food",
  "Transport",
  "Health",
  "Housing",
  "Bills",
  "Savings",
  "Income",
  "Personal",
  "Work",
];
