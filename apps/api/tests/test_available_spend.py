from app.services.available_spend import AvailableSpendInput, compute_available_spend


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

