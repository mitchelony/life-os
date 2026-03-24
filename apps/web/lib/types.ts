export type AccountType = "checking" | "savings" | "credit_card" | "cash" | "debt";
export type TransactionKind = "expense" | "income" | "transfer";
export type IncomeStatus = "expected" | "received";
export type ObligationStatus = "overdue" | "due_soon" | "scheduled" | "paid";
export type TaskPriority = "urgent" | "high" | "normal";
export type RecurrenceFrequency = "one-time" | "weekly" | "biweekly" | "monthly";
export type RoadmapCategory = "finances" | "school" | "career" | "admin" | "health" | "personal";
export type RoadmapStatus = "planned" | "active" | "blocked" | "completed" | "overdue";
export type RoadmapPriority = "low" | "medium" | "high" | "critical";
export type StrategyAllocationType = "fixed" | "percent";
export type DebtStrategyMode = "minimum_only" | "minimum_plus" | "target_payoff";
export type ObligationHandlingMode = "pay_once" | "pay_over_time";
export type StrategyFocusRule = "overdue" | "critical_debt" | "critical_obligation" | "buffer" | "goal_progress";

export type Account = {
  id: string;
  name: string;
  institution: string;
  type: AccountType;
  balance: number;
  active: boolean;
  notes?: string;
};

export type Merchant = {
  id: string;
  name: string;
  usageCount: number;
  category?: string;
};

export type IncomeSource = {
  id: string;
  name: string;
  usageCount: number;
  category?: string;
};

export type Obligation = {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  status: ObligationStatus;
  recurrence: RecurrenceFrequency;
  linkedAccount?: string;
  notes?: string;
  strategy?: {
    handling: ObligationHandlingMode;
    priority?: RoadmapPriority;
    installmentAmount?: number;
    installmentCadence?: string;
    notes?: string;
  };
};

export type Debt = {
  id: string;
  name: string;
  currentBalance: number;
  minimumPayment: number;
  dueDate: string;
  payoffProgress: number;
  notes?: string;
  strategy?: {
    mode: DebtStrategyMode;
    priority?: RoadmapPriority;
    recommendedExtraPayment?: number;
    notes?: string;
  };
};

export type Task = {
  id: string;
  title: string;
  dueDate: string;
  priority: TaskPriority;
  linkedTo?: string;
  completed: boolean;
};

export type IncomeItem = {
  id: string;
  source: string;
  amount: number;
  dueDate: string;
  status: IncomeStatus;
  linkedAccount: string;
  recurrence: RecurrenceFrequency;
};

export type Transaction = {
  id: string;
  kind: TransactionKind;
  title: string;
  amount: number;
  date: string;
  account: string;
  counterparty: string;
  category: string;
  notes?: string;
};

export type RoadmapStep = {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: string;
  notes?: string;
};

export type RoadmapItem = {
  id: string;
  title: string;
  description: string;
  category: RoadmapCategory;
  status: RoadmapStatus;
  priority: RoadmapPriority;
  targetDate?: string;
  timeframeLabel?: string;
  progressMode: "steps" | "percent";
  progressValue: number;
  steps: RoadmapStep[];
  notes?: string;
  dependencyIds: string[];
  linkedStrategyGoalId?: string;
  strategyBacked?: boolean;
  derivedNextStep?: string;
  urgencyScore?: number;
  reason?: string;
};

export type StrategyGoal = {
  id: string;
  title: string;
  category: RoadmapCategory;
  status: Exclude<RoadmapStatus, "overdue">;
  priority: RoadmapPriority;
  targetDate?: string;
  notes?: string;
};

export type StrategyAllocationRule = {
  id: string;
  label: string;
  type: StrategyAllocationType;
  value: number;
  priority: number;
};

export type StrategyExtraPaymentRule = {
  type: StrategyAllocationType;
  value: number;
};

export type DebtActionRule = {
  debtName: string;
  mode: "minimum_only" | "minimum_plus" | "target_payoff";
  minimumSource: "existing" | "manual";
  extraPaymentRule?: StrategyExtraPaymentRule;
  priority?: RoadmapPriority;
  notes?: string;
};

export type ObligationActionRule = {
  obligationName: string;
  handling: ObligationHandlingMode;
  installment?: {
    amount: number;
    cadence: RecurrenceFrequency | "monthly";
  };
  priority?: RoadmapPriority;
  notes?: string;
};

export type StrategyGuidanceRule = {
  focusOrder: StrategyFocusRule[];
  recommendedStepStyle: "first_incomplete_step";
};

export type StrategyDocument = {
  version: 1;
  name: string;
  summary: string;
  effectiveDate: string;
  currency: string;
  planningHorizonDays: number;
  goals: StrategyGoal[];
  incomePlan: {
    allocations: StrategyAllocationRule[];
  };
  debtPlan: DebtActionRule[];
  obligationPlan: ObligationActionRule[];
  guidance: StrategyGuidanceRule;
};

export type AdvisoryAllocation = {
  id: string;
  label: string;
  amount: number;
  type: "income_allocation" | "debt_extra_payment" | "obligation_installment";
  priority?: number;
};

export type RoadmapFocus = {
  item: RoadmapItem | null;
  nextStep: {
    itemId: string;
    title: string;
    reason: string;
  } | null;
  whyNow: string;
};

export type RoadmapSummary = {
  activeCount: number;
  overdueCount: number;
  completedCount: number;
  debtOrObligationCount: number;
  overallProgress: number;
  mostUrgentItem: RoadmapItem | null;
  recommendedNextStep: RoadmapFocus["nextStep"];
};

export type AvailableSpendBreakdown = {
  liquidCash: number;
  reliableIncomeBeforeNextIncome: number;
  protectedCashBuffer: number;
  manualReserves: number;
  obligationsDueBeforeNextIncome: number;
  debtMinimumsDueBeforeNextIncome: number;
  essentialSpendRemaining: number;
  strategyAllocations: AdvisoryAllocation[];
  strategyDebtExtraPayments: AdvisoryAllocation[];
  strategyObligationInstallments: AdvisoryAllocation[];
  availableNow: number;
  availableThroughNextIncome: number;
};

export type DashboardSnapshot = {
  generatedAt: string;
  today: string;
  nextItem: string;
  afterThat: string;
  availableSpend: AvailableSpendBreakdown;
  cashSummary: {
    totalCash: number;
    checking: number;
    savings: number;
    creditCard: number;
    totalDebt: number;
    overdueObligations: number;
    upcomingIncome: number;
  };
  topPriorities: Task[];
  upcomingIncome: IncomeItem[];
  accounts: Account[];
  obligations: Obligation[];
  debts: Debt[];
  merchants: Merchant[];
  sources: IncomeSource[];
  recentTransactions: Transaction[];
  roadmap: {
    items: RoadmapItem[];
    summary: RoadmapSummary;
    focus: RoadmapFocus;
    strategy: StrategyDocument | null;
  };
};

export type QuickAddDraft = {
  kind: TransactionKind;
  amount: string;
  title: string;
  merchantOrSource: string;
  category: string;
  account: string;
  date: string;
  notes: string;
  status?: IncomeStatus;
  recurrence?: RecurrenceFrequency;
  saveAsObligation?: boolean;
  obligationDueDate?: string;
};
