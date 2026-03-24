from datetime import date
from typing import Literal

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


class ObligationBase(BaseModel):
    name: str
    amount: float
    due_on: date
    frequency: ObligationFrequency = ObligationFrequency.one_time
    is_paid: bool = False
    is_recurring: bool = False
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
    reserves: list[ReserveRead] = Field(default_factory=list)
    settings: dict[str, str] = Field(default_factory=dict)
    protected_cash_buffer: float = 0
    essential_spend_target: float = 0


class DashboardSummary(BaseModel):
    whats_next: DashboardItem | None = None
    whats_after_that: DashboardItem | None = None
    available_spend: AvailableSpendBreakdown
    account_snapshot: AccountSnapshot
    top_priorities: list[DashboardItem] = Field(default_factory=list)


class DashboardResponse(BaseModel):
    summary: DashboardSummary
