from datetime import date, datetime
from typing import Any, Literal

from pydantic import BaseModel, Field

from app.models.enums import AccountType, DebtStatus, IncomeStatus, ObligationFrequency, ReserveKind, TaskStatus, TransactionKind
from app.schemas.common import ORMBase, TimestampedRead


class DevLoginRequest(BaseModel):
    passcode: str | None = None


class DevLoginResponse(BaseModel):
    owner_id: str
    owner_token: str
    mode: str = "dev-token"


class ProfileRead(TimestampedRead):
    display_name: str | None = None
    email: str | None = None
    currency: str
    is_active: bool


class OnboardingStateRead(TimestampedRead):
    is_complete: bool
    current_step: str
    completed_at: date | None = None


class AppSettingRead(TimestampedRead):
    key: str
    value: str


class SettingsBootstrapAccount(BaseModel):
    name: str
    institution: str = ""
    type: AccountType
    balance: str = "0"


class SettingsBootstrapObligation(BaseModel):
    name: str
    amount: str = "0"
    due_date: str
    recurrence: Literal["one-time", "weekly", "biweekly", "monthly"] = "one-time"
    linked_account: str | None = None


class SettingsBootstrapDebt(BaseModel):
    name: str
    balance: str = "0"
    minimum: str = "0"
    due_date: str


class SettingsBootstrapIncome(BaseModel):
    source: str
    expected_amount: str = "0"
    due_date: str
    recurrence: Literal["one-time", "weekly", "biweekly", "monthly"] = "one-time"
    linked_account: str | None = None


class SettingsBootstrapRoadmapStep(BaseModel):
    id: str
    title: str
    completed: bool = False
    due_date: str | None = None
    notes: str | None = None


class SettingsBootstrapRoadmapItem(BaseModel):
    id: str
    title: str
    description: str = ""
    category: Literal["finances", "school", "career", "admin", "health", "personal"] = "finances"
    status: Literal["planned", "active", "blocked", "completed", "overdue"] = "planned"
    priority: Literal["low", "medium", "high", "critical"] = "medium"
    target_date: str | None = None
    timeframe_label: str | None = None
    progress_mode: Literal["steps", "percent"] = "steps"
    progress_value: float = 0
    steps: list[SettingsBootstrapRoadmapStep] = Field(default_factory=list)
    notes: str | None = None
    dependency_ids: list[str] = Field(default_factory=list)
    linked_strategy_goal_id: str | None = None
    strategy_backed: bool = False


class SettingsBootstrapPayload(BaseModel):
    display_name: str = "Life owner"
    protected_buffer: str = "0"
    essential_target: str = "0"
    savings_floor: str = "0"
    notes: str = ""
    accounts: list[SettingsBootstrapAccount] = Field(default_factory=list)
    obligations: list[SettingsBootstrapObligation] = Field(default_factory=list)
    debts: list[SettingsBootstrapDebt] = Field(default_factory=list)
    income: list[SettingsBootstrapIncome] = Field(default_factory=list)
    roadmap_items: list[SettingsBootstrapRoadmapItem] = Field(default_factory=list)
    strategy_document: dict[str, Any] | None = None


class QuickAddRequest(BaseModel):
    kind: Literal["expense", "income"]
    amount: float
    title: str = ""
    merchant_or_source: str = ""
    category: str = ""
    account: str = ""
    date: date
    notes: str = ""
    status: Literal["expected", "received"] = "received"
    recurrence: Literal["one-time", "weekly", "biweekly", "monthly"] = "one-time"
    save_as_obligation: bool = False
    obligation_due_date: date | None = None


class QuickAddResponse(BaseModel):
    ok: bool = True
    transaction_id: str | None = None
    obligation_id: str | None = None
    income_entry_id: str | None = None


class AccountBase(BaseModel):
    name: str
    type: AccountType
    institution: str | None = None
    balance: float = 0
    is_active: bool = True
    notes: str | None = None


class AccountCreate(AccountBase):
    pass


class AccountUpdate(BaseModel):
    name: str | None = None
    type: AccountType | None = None
    institution: str | None = None
    balance: float | None = None
    is_active: bool | None = None
    notes: str | None = None


class AccountRead(TimestampedRead, AccountBase):
    pass


class CategoryBase(BaseModel):
    name: str
    group: str = "general"
    is_active: bool = True


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: str | None = None
    group: str | None = None
    is_active: bool | None = None


class CategoryRead(TimestampedRead, CategoryBase):
    pass


class MerchantBase(BaseModel):
    name: str
    kind: str = "merchant"
    is_active: bool = True


class MerchantCreate(MerchantBase):
    pass


class MerchantUpdate(BaseModel):
    name: str | None = None
    kind: str | None = None
    is_active: bool | None = None


class MerchantRead(TimestampedRead, MerchantBase):
    pass


class IncomeSourceBase(BaseModel):
    name: str
    kind: str = "income"
    is_active: bool = True


class IncomeSourceCreate(IncomeSourceBase):
    pass


class IncomeSourceUpdate(BaseModel):
    name: str | None = None
    kind: str | None = None
    is_active: bool | None = None


class IncomeSourceRead(TimestampedRead, IncomeSourceBase):
    pass


class TransactionBase(BaseModel):
    kind: TransactionKind
    amount: float
    account_id: str | None = None
    category_id: str | None = None
    merchant_id: str | None = None
    income_source_id: str | None = None
    occurred_on: date
    notes: str | None = None
    is_planned: bool = False
    is_cleared: bool = True


class TransactionCreate(TransactionBase):
    pass


class TransactionUpdate(BaseModel):
    kind: TransactionKind | None = None
    amount: float | None = None
    account_id: str | None = None
    category_id: str | None = None
    merchant_id: str | None = None
    income_source_id: str | None = None
    occurred_on: date | None = None
    notes: str | None = None
    is_planned: bool | None = None
    is_cleared: bool | None = None


class TransactionRead(TimestampedRead, TransactionBase):
    pass


class IncomeEntryBase(BaseModel):
    source_name: str
    amount: float
    status: IncomeStatus = IncomeStatus.expected
    expected_on: date | None = None
    received_on: date | None = None
    account_id: str | None = None
    is_reliable: bool = True
    category: str | None = None
    linked_obligation_id: str | None = None
    linked_debt_id: str | None = None
    is_partial: bool = False
    parent_income_entry_id: str | None = None
    notes: str | None = None


class IncomeEntryCreate(IncomeEntryBase):
    pass


class IncomeEntryUpdate(BaseModel):
    source_name: str | None = None
    amount: float | None = None
    status: IncomeStatus | None = None
    expected_on: date | None = None
    received_on: date | None = None
    account_id: str | None = None
    notes: str | None = None


class IncomeEntryRead(TimestampedRead, IncomeEntryBase):
    pass


class IncomeEntryConfirmRequest(BaseModel):
    received_on: date | None = None
    account_id: str | None = None


class IncomeEntryConfirmResponse(BaseModel):
    income_entry: IncomeEntryRead
    transaction_id: str


class ObligationBase(BaseModel):
    name: str
    amount: float
    due_on: date
    frequency: ObligationFrequency = ObligationFrequency.one_time
    is_paid: bool = False
    is_recurring: bool = False
    is_externally_covered: bool = False
    coverage_source_label: str | None = None
    minimum_due: float | None = None
    past_due_amount: float = 0
    target_payoff_date: date | None = None
    notes: str | None = None


class ObligationCreate(ObligationBase):
    pass


class ObligationUpdate(BaseModel):
    name: str | None = None
    amount: float | None = None
    due_on: date | None = None
    frequency: ObligationFrequency | None = None
    is_paid: bool | None = None
    is_recurring: bool | None = None
    notes: str | None = None


class ObligationRead(TimestampedRead, ObligationBase):
    pass


class DebtBase(BaseModel):
    name: str
    balance: float
    minimum_payment: float = 0
    due_on: date | None = None
    status: DebtStatus = DebtStatus.active
    apr: float | None = None
    statement_balance: float | None = None
    minimum_met: bool = False
    minimum_met_on: date | None = None
    available_credit: float | None = None
    no_new_spend_mode: bool = False
    notes: str | None = None


class DebtCreate(DebtBase):
    pass


class DebtUpdate(BaseModel):
    name: str | None = None
    balance: float | None = None
    minimum_payment: float | None = None
    due_on: date | None = None
    status: DebtStatus | None = None
    notes: str | None = None


class DebtRead(TimestampedRead, DebtBase):
    pass


class TaskBase(BaseModel):
    title: str
    status: TaskStatus = TaskStatus.todo
    due_on: date | None = None
    linked_type: str | None = None
    linked_id: str | None = None
    notes: str | None = None


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    title: str | None = None
    status: TaskStatus | None = None
    due_on: date | None = None
    linked_type: str | None = None
    linked_id: str | None = None
    notes: str | None = None


class TaskRead(TimestampedRead, TaskBase):
    pass


class ReserveBase(BaseModel):
    name: str
    amount: float
    kind: ReserveKind = ReserveKind.manual
    is_active: bool = True
    purpose_type: str | None = None
    linked_type: str | None = None
    linked_id: str | None = None
    account_id: str | None = None
    created_on: date | None = None
    notes: str | None = None


class ReserveCreate(ReserveBase):
    pass


class ReserveUpdate(BaseModel):
    name: str | None = None
    amount: float | None = None
    kind: ReserveKind | None = None
    is_active: bool | None = None
    notes: str | None = None


class ReserveRead(TimestampedRead, ReserveBase):
    pass


class AvailableSpendBreakdown(BaseModel):
    liquid_cash: float
    protected_cash_buffer: float
    manual_reserves: float
    obligations_due_before_next_income: float
    minimum_debt_payments_due_before_next_income: float
    essential_spend_target_remaining_until_next_income: float
    available_spend: float


class AvailableSpendExplainResponse(BaseModel):
    breakdown: AvailableSpendBreakdown
    notes: list[str] = Field(default_factory=list)


class AccountSnapshot(BaseModel):
    total_cash_available: float
    checking_balance: float
    savings_balance: float
    credit_card_balance: float
    overdue_obligations: float
    upcoming_income: float


class DashboardItem(BaseModel):
    label: str
    detail: str
    due_on: date | None = None
    amount: float | None = None
    kind: str


class DashboardSnapshot(BaseModel):
    accounts: list[AccountRead] = Field(default_factory=list)
    obligations: list[ObligationRead] = Field(default_factory=list)
    debts: list[DebtRead] = Field(default_factory=list)
    tasks: list[TaskRead] = Field(default_factory=list)
    income_entries: list[IncomeEntryRead] = Field(default_factory=list)
    transactions: list[TransactionRead] = Field(default_factory=list)
    categories: list[CategoryRead] = Field(default_factory=list)
    merchants: list[MerchantRead] = Field(default_factory=list)
    income_sources: list[IncomeSourceRead] = Field(default_factory=list)
    reserves: list[ReserveRead] = Field(default_factory=list)
    settings: dict[str, str] = Field(default_factory=dict)
    protected_cash_buffer: float = 0
    essential_spend_target: float = 0


class DashboardTransactionRead(BaseModel):
    id: str
    kind: TransactionKind
    amount: float
    occurred_on: date
    account_name: str | None = None
    category_name: str | None = None
    counterparty_name: str | None = None
    title: str | None = None
    notes: str | None = None


class DashboardDataSnapshot(BaseModel):
    accounts: list[AccountRead] = Field(default_factory=list)
    obligations: list[ObligationRead] = Field(default_factory=list)
    debts: list[DebtRead] = Field(default_factory=list)
    income_entries: list[IncomeEntryRead] = Field(default_factory=list)
    transactions: list[DashboardTransactionRead] = Field(default_factory=list)
    settings: dict[str, str] = Field(default_factory=dict)


class DashboardSummary(BaseModel):
    whats_next: DashboardItem | None = None
    whats_after_that: DashboardItem | None = None
    available_spend: AvailableSpendBreakdown
    account_snapshot: AccountSnapshot
    top_priorities: list[DashboardItem] = Field(default_factory=list)


class DashboardResponse(BaseModel):
    summary: DashboardSummary
    snapshot: DashboardDataSnapshot


class FreeCashBreakdown(BaseModel):
    liquid_cash: float
    protected_buffer: float
    active_reserves: float
    overdue_obligations: float
    obligations_due_within_horizon: float
    debt_minimums_due_within_horizon: float
    essentials_reserve_within_horizon: float
    reliable_income_within_horizon: float
    extra_allocations_within_horizon: float


class FreeCashAmount(BaseModel):
    amount: float
    breakdown: FreeCashBreakdown


class DecisionActionBase(BaseModel):
    title: str
    detail: str | None = None
    status: str = "todo"
    lane: str = "this_week"
    source: str = "manual"
    due_on: date | None = None
    linked_type: str | None = None
    linked_id: str | None = None


class DecisionActionCreate(DecisionActionBase):
    pass


class DecisionActionUpdate(BaseModel):
    title: str | None = None
    detail: str | None = None
    status: str | None = None
    lane: str | None = None
    source: str | None = None
    due_on: date | None = None
    linked_type: str | None = None
    linked_id: str | None = None


class ActionItemRead(TimestampedRead, DecisionActionBase):
    pass


class DecisionActionRead(DecisionActionBase):
    id: str
    pass


class RoadmapGoalBase(BaseModel):
    title: str
    description: str = ""
    category: str = "finances"
    status: str = "active"
    priority: str = "medium"
    target_date: date | None = None
    target_amount: float | None = None
    current_amount: float | None = None
    blocked_reason: str | None = None
    recommended_next_step: str | None = None
    sort_order: int = 0
    depends_on_goal_ids: list[str] = Field(default_factory=list)
    linked_type: str | None = None
    linked_id: str | None = None
    notes: str | None = None
    metric_kind: str | None = None
    metric_start_value: float | None = None
    metric_current_value: float | None = None
    metric_target_value: float | None = None


class RoadmapGoalCreate(RoadmapGoalBase):
    pass


class RoadmapGoalUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: str | None = None
    priority: str | None = None
    target_date: date | None = None
    linked_type: str | None = None
    linked_id: str | None = None
    metric_kind: str | None = None
    metric_start_value: float | None = None
    metric_current_value: float | None = None
    metric_target_value: float | None = None


class RoadmapGoalEntityRead(TimestampedRead, RoadmapGoalBase):
    pass


class RoadmapGoalRead(RoadmapGoalBase):
    id: str
    progress: float = 0
    steps: list[DecisionActionRead] = Field(default_factory=list)


class RoadmapStepBase(BaseModel):
    goal_id: str
    title: str
    status: str = "todo"
    due_on: date | None = None
    sort_order: int = 0
    amount: float | None = None
    recommended_action: str | None = None
    depends_on_step_ids: list[str] = Field(default_factory=list)
    is_financial_step: bool = False
    completed_at: datetime | None = None
    linked_type: str | None = None
    linked_id: str | None = None
    notes: str | None = None


class RoadmapStepCreate(RoadmapStepBase):
    pass


class RoadmapStepUpdate(BaseModel):
    title: str | None = None
    status: str | None = None
    due_on: date | None = None
    sort_order: int | None = None
    linked_type: str | None = None
    linked_id: str | None = None
    notes: str | None = None


class RoadmapStepRead(TimestampedRead, RoadmapStepBase):
    pass


class IncomePlanBase(BaseModel):
    label: str
    amount: float
    expected_on: date | None = None
    is_reliable: bool = True
    status: str = "planned"
    priority: str = "medium"
    rolls_up_to_goal_id: str | None = None
    recommended_step: str | None = None
    is_partial: bool = False
    parent_income_plan_id: str | None = None
    source_income_entry_id: str | None = None
    notes: str | None = None


class IncomePlanCreate(IncomePlanBase):
    pass


class IncomePlanUpdate(BaseModel):
    label: str | None = None
    amount: float | None = None
    expected_on: date | None = None
    is_reliable: bool | None = None
    status: str | None = None
    notes: str | None = None


class IncomePlanRead(TimestampedRead, IncomePlanBase):
    pass


class IncomePlanAllocationBase(BaseModel):
    income_plan_id: str
    label: str
    allocation_type: str
    amount: float
    percent_of_income: float | None = None
    sort_order: int = 0
    is_required: bool = False
    goal_id: str | None = None
    linked_type: str | None = None
    linked_id: str | None = None
    account_source_id: str | None = None
    account_destination_id: str | None = None
    status: str = "planned"
    executed_amount: float | None = None
    executed_on: datetime | None = None
    notes: str | None = None


class IncomePlanAllocationCreate(IncomePlanAllocationBase):
    pass


class IncomePlanAllocationUpdate(BaseModel):
    label: str | None = None
    allocation_type: str | None = None
    amount: float | None = None
    sort_order: int | None = None
    linked_type: str | None = None
    linked_id: str | None = None
    notes: str | None = None


class IncomePlanAllocationRead(TimestampedRead, IncomePlanAllocationBase):
    pass


class RoadmapImportV2Step(BaseModel):
    temp_id: str
    title: str
    status: Literal["todo", "in_progress", "blocked", "done"] = "todo"
    due_on: date | None = None
    sort_order: int = 0
    amount: float | None = None
    recommended_action: str | None = None
    depends_on_step_temp_ids: list[str] = Field(default_factory=list)
    is_financial_step: bool = False
    linked_type: str | None = None
    linked_id: str | None = None
    notes: str | None = None
    completed_at: datetime | None = None


class RoadmapImportV2Goal(BaseModel):
    temp_id: str
    title: str
    description: str = ""
    category: Literal["finances", "school", "career", "admin", "health", "personal"] = "finances"
    status: Literal["active", "planned", "blocked", "completed"] = "active"
    priority: Literal["low", "medium", "high", "critical"] = "medium"
    target_date: date | None = None
    target_amount: float | None = None
    current_amount: float | None = None
    blocked_reason: str | None = None
    recommended_next_step: str | None = None
    sort_order: int = 0
    depends_on_goal_temp_ids: list[str] = Field(default_factory=list)
    linked_type: str | None = None
    linked_id: str | None = None
    notes: str | None = None
    steps: list[RoadmapImportV2Step] = Field(default_factory=list)


class RoadmapImportV2Allocation(BaseModel):
    temp_id: str
    label: str
    allocation_type: Literal["obligation_payment", "debt_payment", "buffer", "essentials", "manual"]
    amount: float
    percent_of_income: float | None = None
    sort_order: int = 0
    is_required: bool = False
    goal_temp_id: str | None = None
    linked_type: str | None = None
    linked_id: str | None = None
    account_source_id: str | None = None
    account_destination_id: str | None = None
    status: Literal["planned", "reserved", "paid", "skipped", "changed"] = "planned"
    executed_amount: float | None = None
    executed_on: datetime | None = None
    notes: str | None = None


class RoadmapImportV2IncomePlan(BaseModel):
    temp_id: str
    label: str
    amount: float
    expected_on: date | None = None
    is_reliable: bool = True
    status: Literal["planned", "cancelled", "received"] = "planned"
    priority: Literal["low", "medium", "high", "critical"] = "medium"
    rolls_up_to_goal_temp_id: str | None = None
    recommended_step: str | None = None
    remaining_unallocated_amount: float | None = None
    is_partial: bool = False
    parent_income_plan_temp_id: str | None = None
    source_income_entry_id: str | None = None
    notes: str | None = None
    allocations: list[RoadmapImportV2Allocation] = Field(default_factory=list)


class RoadmapImportV2CashReserve(BaseModel):
    temp_id: str
    label: str
    amount: float
    purpose_type: Literal["taxes", "buffer", "debt", "utilities", "essentials", "custom"]
    linked_type: str | None = None
    linked_id: str | None = None
    account_id: str | None = None
    created_on: date | None = None
    notes: str | None = None


class RoadmapImportV2ExpectedIncomeEntry(BaseModel):
    source_name: str
    amount: float
    status: Literal["expected", "received", "missed"] = "expected"
    expected_on: date | None = None
    received_on: date | None = None
    account_id: str | None = None
    is_reliable: bool = True
    category: Literal["paycheck", "side_gig", "refund", "family_support", "scholarship", "other"] = "other"
    linked_obligation_id: str | None = None
    linked_debt_id: str | None = None
    is_partial: bool = False
    parent_income_entry_id: str | None = None
    notes: str | None = None


class RoadmapImportV2Obligation(BaseModel):
    name: str
    amount: float
    due_on: date
    frequency: Literal["one_time", "weekly", "biweekly", "monthly", "yearly"] = "one_time"
    is_paid: bool = False
    is_recurring: bool = False
    is_externally_covered: bool = False
    coverage_source_label: str | None = None
    minimum_due: float | None = None
    past_due_amount: float = 0
    target_payoff_date: date | None = None
    notes: str | None = None


class RoadmapImportV2Debt(BaseModel):
    name: str
    balance: float
    minimum_payment: float = 0
    due_on: date | None = None
    status: Literal["active", "paused", "paid_off"] = "active"
    apr: float | None = None
    statement_balance: float | None = None
    minimum_met: bool = False
    minimum_met_on: date | None = None
    available_credit: float | None = None
    no_new_spend_mode: bool = False
    notes: str | None = None


class RoadmapImportV2Action(BaseModel):
    title: str
    detail: str | None = None
    status: Literal["todo", "in_progress", "blocked", "done", "skipped"] = "todo"
    lane: Literal["do_now", "this_week", "when_income_lands", "manual"] = "manual"
    source: Literal["system", "manual", "goal"] = "manual"
    due_on: date | None = None
    linked_type: str | None = None
    linked_id: str | None = None


class RoadmapImportV2AllowedValues(BaseModel):
    goal_categories: list[str] = Field(default_factory=list)
    goal_statuses: list[str] = Field(default_factory=list)
    goal_priorities: list[str] = Field(default_factory=list)
    step_statuses: list[str] = Field(default_factory=list)
    linked_types: list[str] = Field(default_factory=list)
    income_plan_statuses: list[str] = Field(default_factory=list)
    income_allocation_types: list[str] = Field(default_factory=list)
    allocation_statuses: list[str] = Field(default_factory=list)
    cash_reserve_purpose_types: list[str] = Field(default_factory=list)
    income_statuses: list[str] = Field(default_factory=list)
    income_categories: list[str] = Field(default_factory=list)
    obligation_frequencies: list[str] = Field(default_factory=list)
    debt_statuses: list[str] = Field(default_factory=list)
    action_statuses: list[str] = Field(default_factory=list)
    action_lanes: list[str] = Field(default_factory=list)
    action_sources: list[str] = Field(default_factory=list)


class RoadmapImportV2Payload(BaseModel):
    version: Literal[2]
    reset_planning_first: bool = False
    goals: list[RoadmapImportV2Goal] = Field(default_factory=list)
    income_plans: list[RoadmapImportV2IncomePlan] = Field(default_factory=list)
    cash_reserves: list[RoadmapImportV2CashReserve] = Field(default_factory=list)
    expected_income_entries: list[RoadmapImportV2ExpectedIncomeEntry] = Field(default_factory=list)
    obligations: list[RoadmapImportV2Obligation] = Field(default_factory=list)
    debts: list[RoadmapImportV2Debt] = Field(default_factory=list)
    actions: list[RoadmapImportV2Action] = Field(default_factory=list)
    allowed_values: RoadmapImportV2AllowedValues | None = None


class RoadmapImportV2Result(BaseModel):
    goals_created: int = 0
    steps_created: int = 0
    income_plans_created: int = 0
    allocations_created: int = 0
    cash_reserves_created: int = 0
    expected_income_entries_created: int = 0
    obligations_created: int = 0
    debts_created: int = 0
    actions_created: int = 0


class RecentUpdate(BaseModel):
    id: str
    event_type: str
    title: str
    detail: str | None = None
    amount: float | None = None
    occurred_at: datetime
    linked_type: str | None = None
    linked_id: str | None = None


class ProgressTrend(BaseModel):
    direction: Literal["forward", "backward", "steady"]
    free_now_delta: float
    free_after_planned_income_delta: float
    total_debt_delta: float
    overdue_delta: int
    completed_actions_delta: int


class ProgressSummary(BaseModel):
    free_now: float
    free_after_planned_income: float
    total_debt: float
    overdue_count: int
    completed_actions_7d: int
    goal_completion_rate: float
    seven_day: ProgressTrend
    thirty_day: ProgressTrend


class CashflowGlance(BaseModel):
    trailing_30_inflow: float
    trailing_30_outflow: float
    trailing_30_net: float
    next_14_planned_inflow: float
    next_14_required_outflow: float
    next_income_date: date | None = None
    next_pressure_point: str | None = None


class DecisionFocus(BaseModel):
    primary_action: DecisionActionRead | None = None
    secondary_action: DecisionActionRead | None = None
    why_now: str


class RoadmapPlanAllocationRead(BaseModel):
    id: str
    label: str
    allocation_type: str
    amount: float
    linked_type: str | None = None
    linked_id: str | None = None


class RoadmapPlanRead(BaseModel):
    id: str
    label: str
    amount: float
    expected_on: date | None = None
    is_reliable: bool
    status: str
    allocations: list[RoadmapPlanAllocationRead] = Field(default_factory=list)


class RoadmapGoalSummary(BaseModel):
    goals: list[RoadmapGoalRead] = Field(default_factory=list)
    plans: list[RoadmapPlanRead] = Field(default_factory=list)


class RoadmapImportStep(BaseModel):
    title: str
    status: str = "todo"
    due_on: date | None = None
    sort_order: int = 0
    linked_type: str | None = None
    linked_id: str | None = None
    notes: str | None = None


class RoadmapImportGoal(BaseModel):
    temp_id: str | None = None
    title: str
    description: str = ""
    status: str = "active"
    priority: str = "medium"
    target_date: date | None = None
    linked_type: str | None = None
    linked_id: str | None = None
    metric_kind: str | None = None
    metric_start_value: float | None = None
    metric_current_value: float | None = None
    metric_target_value: float | None = None
    steps: list[RoadmapImportStep] = Field(default_factory=list)


class RoadmapImportAllocation(BaseModel):
    label: str
    allocation_type: str
    amount: float
    sort_order: int = 0
    linked_type: str | None = None
    linked_id: str | None = None
    notes: str | None = None


class RoadmapImportIncomePlan(BaseModel):
    temp_id: str | None = None
    label: str
    amount: float
    expected_on: date | None = None
    is_reliable: bool = True
    status: str = "planned"
    notes: str | None = None
    allocations: list[RoadmapImportAllocation] = Field(default_factory=list)


class RoadmapImportPayload(BaseModel):
    version: int = 1
    reset_planning_first: bool = False
    goals: list[RoadmapImportGoal] = Field(default_factory=list)
    income_plans: list[RoadmapImportIncomePlan] = Field(default_factory=list)


class RoadmapImportResult(BaseModel):
    goals_created: int = 0
    steps_created: int = 0
    income_plans_created: int = 0
    allocations_created: int = 0
    goal_ids: dict[str, str] = Field(default_factory=dict)
    income_plan_ids: dict[str, str] = Field(default_factory=dict)


class ContextExportAllowedValues(BaseModel):
    account_types: list[str] = Field(default_factory=list)
    debt_statuses: list[str] = Field(default_factory=list)
    obligation_frequencies: list[str] = Field(default_factory=list)
    income_statuses: list[str] = Field(default_factory=list)
    action_statuses: list[str] = Field(default_factory=list)
    action_lanes: list[str] = Field(default_factory=list)
    action_sources: list[str] = Field(default_factory=list)
    roadmap_goal_statuses: list[str] = Field(default_factory=list)
    roadmap_goal_priorities: list[str] = Field(default_factory=list)
    roadmap_step_statuses: list[str] = Field(default_factory=list)
    income_plan_statuses: list[str] = Field(default_factory=list)
    income_allocation_types: list[str] = Field(default_factory=list)


class ContextExportPayload(BaseModel):
    version: int = 1
    exported_at: datetime
    owner_id: str
    settings: dict[str, str] = Field(default_factory=dict)
    accounts: list[AccountRead] = Field(default_factory=list)
    debts: list[DebtRead] = Field(default_factory=list)
    obligations: list[ObligationRead] = Field(default_factory=list)
    expected_income_entries: list[IncomeEntryRead] = Field(default_factory=list)
    expense_transactions: list[TransactionRead] = Field(default_factory=list)
    actions: list[ActionItemRead] = Field(default_factory=list)
    roadmap_goals: list[RoadmapGoalEntityRead] = Field(default_factory=list)
    roadmap_steps: list[RoadmapStepRead] = Field(default_factory=list)
    income_plans: list[IncomePlanRead] = Field(default_factory=list)
    income_plan_allocations: list[IncomePlanAllocationRead] = Field(default_factory=list)
    allowed_values: ContextExportAllowedValues


class DecisionSnapshot(BaseModel):
    generated_at: datetime
    focus: DecisionFocus
    ordered_action_queue: list[DecisionActionRead] = Field(default_factory=list)
    roadmap_summary: RoadmapGoalSummary
    cashflow_glance: CashflowGlance
    recent_updates: list[RecentUpdate] = Field(default_factory=list)
    progress_summary: ProgressSummary
    free_now: FreeCashAmount
    free_after_planned_income: FreeCashAmount
