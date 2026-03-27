from datetime import date, timedelta
from types import SimpleNamespace

from app.models.enums import IncomeStatus
from app.services.available_spend import AvailableSpendInput, build_available_spend_input, compute_available_spend


def test_compute_available_spend_returns_negative_warning() -> None:
    result = compute_available_spend(
        AvailableSpendInput(
            liquid_cash=500,
            protected_cash_buffer=100,
            manual_reserves=50,
            obligations_due_before_next_income=200,
            minimum_debt_payments_due_before_next_income=300,
            essential_spend_target_remaining_until_next_income=75,
        )
    )

    assert result.breakdown.available_spend == -225
    assert result.notes


def test_compute_available_spend_balances_all_inputs() -> None:
    result = compute_available_spend(
        AvailableSpendInput(
            liquid_cash=1500,
            protected_cash_buffer=250,
            manual_reserves=100,
            obligations_due_before_next_income=300,
            minimum_debt_payments_due_before_next_income=200,
            essential_spend_target_remaining_until_next_income=150,
        )
    )

    assert result.breakdown.available_spend == 500


def test_build_available_spend_input_uses_effective_cash_and_next_income_horizon() -> None:
    today = date.today()

    payload = build_available_spend_input(
        accounts=[SimpleNamespace(id="acct-1", balance=100, type=SimpleNamespace(value="checking"))],
        obligations=[SimpleNamespace(amount=20, is_paid=False, due_on=today + timedelta(days=2))],
        debts=[SimpleNamespace(minimum_payment=75, status=SimpleNamespace(value="active"), due_on=today - timedelta(days=1))],
        reserves=[],
        income_entries=[SimpleNamespace(expected_on=today + timedelta(days=7), status=IncomeStatus.expected)],
        income_plans=[SimpleNamespace(expected_on=today + timedelta(days=3), is_reliable=True, status="planned")],
        transactions=[
            SimpleNamespace(account_id="acct-1", kind=SimpleNamespace(value="income"), amount=400),
            SimpleNamespace(account_id="acct-1", kind=SimpleNamespace(value="expense"), amount=50),
        ],
        settings={},
    )

    assert payload.liquid_cash == 450
    assert payload.obligations_due_before_next_income == 20
    assert payload.minimum_debt_payments_due_before_next_income == 75
