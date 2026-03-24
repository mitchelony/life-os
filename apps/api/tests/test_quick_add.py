from datetime import date

from app.models.domain import Account, IncomeEntry, Obligation, Transaction
from app.models.enums import AccountType, IncomeStatus, ObligationFrequency, TransactionKind
from app.schemas.domain import QuickAddRequest
from app.services.quick_add import QuickAddService


def test_quick_add_service_creates_transaction_and_upcoming_obligation(db_session) -> None:
    account = Account(owner_id="owner", name="Checking", type=AccountType.checking, institution="Bank", balance=500)
    db_session.add(account)
    db_session.commit()

    payload = QuickAddRequest(
        kind="expense",
        amount=42.5,
        title="Groceries",
        merchant_or_source="Trader Joe's",
        category="Food",
        account="Checking",
        date=date(2026, 3, 24),
        notes="weekly run",
        status="received",
        recurrence="one-time",
        save_as_obligation=True,
        obligation_due_date=date(2026, 3, 28),
    )

    result = QuickAddService(db_session, "owner").submit(payload)

    transactions = db_session.query(Transaction).all()
    obligations = db_session.query(Obligation).all()

    assert result.ok is True
    assert len(transactions) == 1
    assert transactions[0].kind == TransactionKind.expense
    assert float(transactions[0].amount) == 42.5
    assert transactions[0].account_id == account.id
    assert len(obligations) == 1
    assert obligations[0].name == "Groceries"
    assert obligations[0].frequency == ObligationFrequency.one_time
    assert obligations[0].is_recurring is False


def test_quick_add_service_creates_expected_income_without_touching_transactions(db_session) -> None:
    account = Account(owner_id="owner", name="Checking", type=AccountType.checking, institution="Bank", balance=500)
    db_session.add(account)
    db_session.commit()

    payload = QuickAddRequest(
        kind="income",
        amount=250,
        title="Tutoring",
        merchant_or_source="Tutoring paycheck",
        category="Income",
        account="Checking",
        date=date(2026, 3, 27),
        notes="",
        status="expected",
        recurrence="monthly",
    )

    QuickAddService(db_session, "owner").submit(payload)

    transactions = db_session.query(Transaction).all()
    income_entries = db_session.query(IncomeEntry).all()

    assert transactions == []
    assert len(income_entries) == 1
    assert income_entries[0].status == IncomeStatus.expected
    assert income_entries[0].source_name == "Tutoring paycheck"
    assert float(income_entries[0].amount) == 250
    assert income_entries[0].account_id == account.id
