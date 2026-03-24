from enum import Enum


class AccountType(str, Enum):
    checking = "checking"
    savings = "savings"
    cash = "cash"
    credit_card = "credit_card"
    debt = "debt"


class TransactionKind(str, Enum):
    expense = "expense"
    income = "income"
    transfer = "transfer"


class IncomeStatus(str, Enum):
    expected = "expected"
    received = "received"
    missed = "missed"


class ObligationFrequency(str, Enum):
    one_time = "one_time"
    weekly = "weekly"
    biweekly = "biweekly"
    monthly = "monthly"
    yearly = "yearly"


class DebtStatus(str, Enum):
    active = "active"
    paused = "paused"
    paid_off = "paid_off"


class TaskStatus(str, Enum):
    todo = "todo"
    doing = "doing"
    done = "done"
    blocked = "blocked"


class ReserveKind(str, Enum):
    manual = "manual"
    automatic = "automatic"

