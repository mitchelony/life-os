from collections.abc import Sequence

from pydantic import BaseModel, Field

from app.models.enums import IncomeStatus
from app.schemas.domain import AvailableSpendBreakdown, AvailableSpendExplainResponse


class AvailableSpendInput(BaseModel):
    liquid_cash: float
    protected_cash_buffer: float = 0
    manual_reserves: float = 0
    obligations_due_before_next_income: float = 0
    minimum_debt_payments_due_before_next_income: float = 0
    essential_spend_target_remaining_until_next_income: float = 0
    notes: list[str] = Field(default_factory=list)


def build_available_spend_input(
    *,
    accounts: Sequence[object],
    obligations: Sequence[object],
    debts: Sequence[object],
    reserves: Sequence[object],
    income_entries: Sequence[object],
    income_plans: Sequence[object] = (),
    transactions: Sequence[object] = (),
    settings: dict[str, str],
) -> AvailableSpendInput:
    next_income_dates = [
        entry.expected_on
        for entry in income_entries
        if getattr(entry, "expected_on", None) and getattr(entry, "status", None) == IncomeStatus.expected
    ] + [
        plan.expected_on
        for plan in income_plans
        if getattr(plan, "expected_on", None)
        and getattr(plan, "is_reliable", False)
        and getattr(plan, "status", None) not in {"cancelled", "received"}
    ]
    next_income_date = min(next_income_dates) if next_income_dates else None
    balances = {
        account.id: float(account.balance)
        for account in accounts
        if account.type.value in {"checking", "savings", "cash"}
    }
    for transaction in transactions:
        account_id = getattr(transaction, "account_id", None)
        if account_id not in balances:
            continue
        amount = float(getattr(transaction, "amount", 0) or 0)
        kind = getattr(getattr(transaction, "kind", None), "value", getattr(transaction, "kind", None))
        if kind == "income":
            balances[account_id] += amount
        elif kind == "expense":
            balances[account_id] -= amount
    liquid_cash = sum(balances.values())
    manual_reserves = sum(float(reserve.amount) for reserve in reserves if getattr(reserve, "is_active", True))
    obligations_due = sum(
        float(item.amount)
        for item in obligations
        if not item.is_paid and (next_income_date is None or item.due_on <= next_income_date)
    )
    debt_minimums = sum(
        float(item.minimum_payment)
        for item in debts
        if item.status.value == "active" and (item.due_on is None or next_income_date is None or item.due_on <= next_income_date)
    )
    protected_buffer = float(settings.get("protected_cash_buffer", "0") or 0)
    essential_target = float(settings.get("essential_spend_target", "0") or 0)

    notes = [
        "Computed from cash-like accounts, active reserves, protected settings, upcoming obligations, and debt minimums.",
    ]
    if next_income_date:
        notes.append(f"Next expected income date: {next_income_date.isoformat()}.")
    else:
        notes.append("No expected income was found, so obligations are treated as currently relevant.")

    return AvailableSpendInput(
        liquid_cash=liquid_cash,
        protected_cash_buffer=protected_buffer,
        manual_reserves=manual_reserves,
        obligations_due_before_next_income=obligations_due,
        minimum_debt_payments_due_before_next_income=debt_minimums,
        essential_spend_target_remaining_until_next_income=essential_target,
        notes=notes,
    )


def compute_available_spend(payload: AvailableSpendInput) -> AvailableSpendExplainResponse:
    available_spend = (
        payload.liquid_cash
        - payload.protected_cash_buffer
        - payload.manual_reserves
        - payload.obligations_due_before_next_income
        - payload.minimum_debt_payments_due_before_next_income
        - payload.essential_spend_target_remaining_until_next_income
    )
    breakdown = AvailableSpendBreakdown(
        liquid_cash=payload.liquid_cash,
        protected_cash_buffer=payload.protected_cash_buffer,
        manual_reserves=payload.manual_reserves,
        obligations_due_before_next_income=payload.obligations_due_before_next_income,
        minimum_debt_payments_due_before_next_income=payload.minimum_debt_payments_due_before_next_income,
        essential_spend_target_remaining_until_next_income=payload.essential_spend_target_remaining_until_next_income,
        available_spend=available_spend,
    )
    notes = list(payload.notes)
    if available_spend < 0:
        notes.append("Available spend is negative, so the next dollars should go to obligations and buffers.")
    return AvailableSpendExplainResponse(breakdown=breakdown, notes=notes)
