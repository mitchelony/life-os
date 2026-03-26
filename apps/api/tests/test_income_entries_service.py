from datetime import date

from app.models.domain import Account, IncomeEntry
from app.services.income_entries import IncomeEntryService


def test_confirm_expected_income_marks_received_and_creates_income_transaction(db_session) -> None:
    owner_id = "owner-income"
    account = Account(owner_id=owner_id, name="Checking", type="checking", balance=100)
    entry = IncomeEntry(
        owner_id=owner_id,
        source_name="Payroll",
        amount=500,
        status="expected",
        expected_on=date.today(),
        account_id=None,
    )
    db_session.add_all([account, entry])
    db_session.commit()

    result = IncomeEntryService(db_session, owner_id).confirm(entry.id, account_id=account.id, received_on=date.today())

    assert result is not None
    assert result.income_entry.status == "received"
    assert result.income_entry.received_on == date.today()
    assert result.transaction_id is not None
    db_session.refresh(account)
    assert float(account.balance) == 600
