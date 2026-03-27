from datetime import date

from app.models.domain import Account, IncomeEntry, Transaction
from app.models.enums import AccountType, IncomeStatus, TransactionKind
from app.schemas.domain import AccountCreate, AccountUpdate
from app.services.accounts import AccountService


def test_account_service_lists_create_updates_and_serializes_delete_state(db_session) -> None:
    owner_id = "owner-accounts"
    service = AccountService(db_session, owner_id)

    created = service.create(
        AccountCreate(
            name="Checking",
            type=AccountType.checking,
            institution="Bank",
            balance=1200,
        )
    )

    listed = service.list()

    assert created.name == "Checking"
    assert created.can_delete is True
    assert created.linked_record_count == 0
    assert len(listed) == 1

    updated = service.update(created.id, AccountUpdate(name="Main checking", balance=1180))

    assert updated is not None
    assert updated.name == "Main checking"
    assert float(updated.balance) == 1180


def test_account_service_refuses_to_delete_linked_accounts(db_session) -> None:
    owner_id = "owner-linked-account"
    account = Account(owner_id=owner_id, name="Checking", type=AccountType.checking, balance=500)
    db_session.add(account)
    db_session.flush()
    db_session.add(
        IncomeEntry(
            owner_id=owner_id,
            source_name="Payroll",
            amount=900,
            status=IncomeStatus.expected,
            account_id=account.id,
        )
    )
    db_session.add(
        Transaction(
            owner_id=owner_id,
            kind=TransactionKind.expense,
            amount=42,
            account_id=account.id,
            occurred_on=date(2026, 3, 26),
        )
    )
    db_session.commit()

    service = AccountService(db_session, owner_id)
    listed = service.list()
    found, linked_record_count = service.delete(account.id)

    assert listed[0].can_delete is False
    assert listed[0].linked_record_count == 2
    assert found is True
    assert linked_record_count == 2
    assert db_session.query(Account).filter(Account.owner_id == owner_id).count() == 1


def test_account_service_reports_effective_balance_with_linked_transactions(db_session) -> None:
    owner_id = "owner-effective-balance"
    account = Account(owner_id=owner_id, name="Checking", type=AccountType.checking, balance=500)
    db_session.add(account)
    db_session.flush()
    db_session.add_all(
        [
            Transaction(
                owner_id=owner_id,
                kind=TransactionKind.income,
                amount=250,
                account_id=account.id,
                occurred_on=date(2026, 3, 27),
            ),
            Transaction(
                owner_id=owner_id,
                kind=TransactionKind.expense,
                amount=40,
                account_id=account.id,
                occurred_on=date(2026, 3, 27),
            ),
        ]
    )
    db_session.commit()

    service = AccountService(db_session, owner_id)
    listed = service.list()
    fetched = service.get(account.id)

    assert len(listed) == 1
    assert float(listed[0].balance) == 710
    assert fetched is not None
    assert float(fetched.balance) == 710
