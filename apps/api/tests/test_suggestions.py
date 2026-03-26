from datetime import date, timedelta

from app.api.routes.suggestions import merchant_suggestions, source_suggestions
from app.models.domain import IncomeSource, Merchant, Transaction
from app.models.enums import TransactionKind


def test_merchant_suggestions_prefer_recent_and_frequent_items(db_session) -> None:
    owner_id = "owner-suggestions-merchants"
    grocery = Merchant(owner_id=owner_id, name="Grocery World")
    cafe = Merchant(owner_id=owner_id, name="Cafe Loop")
    old_once = Merchant(owner_id=owner_id, name="Old Bakery")
    db_session.add_all([grocery, cafe, old_once])
    db_session.flush()

    today = date.today()
    db_session.add_all(
        [
            Transaction(owner_id=owner_id, kind=TransactionKind.expense, amount=42, merchant_id=grocery.id, occurred_on=today),
            Transaction(owner_id=owner_id, kind=TransactionKind.expense, amount=18, merchant_id=grocery.id, occurred_on=today - timedelta(days=3)),
            Transaction(owner_id=owner_id, kind=TransactionKind.expense, amount=9, merchant_id=cafe.id, occurred_on=today - timedelta(days=1)),
            Transaction(owner_id=owner_id, kind=TransactionKind.expense, amount=5, merchant_id=old_once.id, occurred_on=today - timedelta(days=45)),
        ]
    )
    db_session.commit()

    suggestions = merchant_suggestions(db=db_session, owner_id=owner_id, q="")

    expect_order = ["Grocery World", "Cafe Loop", "Old Bakery"]
    assert suggestions[:3] == expect_order


def test_source_suggestions_prefer_recent_and_frequent_items(db_session) -> None:
    owner_id = "owner-suggestions-sources"
    payroll = IncomeSource(owner_id=owner_id, name="Payroll")
    tutoring = IncomeSource(owner_id=owner_id, name="Tutoring")
    refund = IncomeSource(owner_id=owner_id, name="State Refund")
    db_session.add_all([payroll, tutoring, refund])
    db_session.flush()

    today = date.today()
    db_session.add_all(
        [
            Transaction(owner_id=owner_id, kind=TransactionKind.income, amount=500, income_source_id=payroll.id, occurred_on=today),
            Transaction(owner_id=owner_id, kind=TransactionKind.income, amount=500, income_source_id=payroll.id, occurred_on=today - timedelta(days=14)),
            Transaction(owner_id=owner_id, kind=TransactionKind.income, amount=120, income_source_id=tutoring.id, occurred_on=today - timedelta(days=2)),
            Transaction(owner_id=owner_id, kind=TransactionKind.income, amount=32, income_source_id=refund.id, occurred_on=today - timedelta(days=60)),
        ]
    )
    db_session.commit()

    suggestions = source_suggestions(db=db_session, owner_id=owner_id, q="")

    expect_order = ["Payroll", "Tutoring", "State Refund"]
    assert suggestions[:3] == expect_order
