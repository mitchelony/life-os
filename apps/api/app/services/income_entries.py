from __future__ import annotations

from dataclasses import dataclass
from datetime import date

from sqlalchemy.orm import Session

from app.models.domain import Account, ActivityEvent, IncomeEntry, IncomeSource, Transaction
from app.models.enums import IncomeStatus, TransactionKind
from app.schemas.domain import IncomeEntryConfirmResponse


def _find_or_create_income_source(db: Session, owner_id: str, name: str) -> IncomeSource:
    existing = db.query(IncomeSource).filter(IncomeSource.owner_id == owner_id, IncomeSource.name == name).one_or_none()
    if existing is not None:
        return existing
    created = IncomeSource(owner_id=owner_id, name=name)
    db.add(created)
    db.flush()
    return created


@dataclass(slots=True)
class IncomeEntryService:
    db: Session
    owner_id: str

    def confirm(self, entry_id: str, *, account_id: str | None = None, received_on: date | None = None) -> IncomeEntryConfirmResponse | None:
        income_entry = (
            self.db.query(IncomeEntry)
            .filter(IncomeEntry.owner_id == self.owner_id, IncomeEntry.id == entry_id)
            .one_or_none()
        )
        if income_entry is None:
            return None

        effective_account_id = account_id or income_entry.account_id
        effective_received_on = received_on or income_entry.expected_on or date.today()
        income_source = _find_or_create_income_source(self.db, self.owner_id, income_entry.source_name)

        transaction = Transaction(
            owner_id=self.owner_id,
            kind=TransactionKind.income,
            amount=float(income_entry.amount),
            account_id=effective_account_id,
            income_source_id=income_source.id,
            occurred_on=effective_received_on,
            notes=income_entry.notes,
            is_planned=False,
            is_cleared=True,
        )
        self.db.add(transaction)

        if effective_account_id:
            account = (
                self.db.query(Account)
                .filter(Account.owner_id == self.owner_id, Account.id == effective_account_id)
                .one_or_none()
            )
            if account is not None:
                account.balance = float(account.balance) + float(income_entry.amount)

        income_entry.status = IncomeStatus.received
        income_entry.received_on = effective_received_on
        income_entry.account_id = effective_account_id

        self.db.flush()
        self.db.add(
            ActivityEvent(
                owner_id=self.owner_id,
                event_type="income_confirmed",
                title=income_entry.source_name,
                detail="Expected income confirmed and recorded.",
                amount=float(income_entry.amount),
                linked_type="income_entry",
                linked_id=income_entry.id,
            )
        )
        self.db.commit()
        self.db.refresh(income_entry)
        self.db.refresh(transaction)
        return IncomeEntryConfirmResponse(income_entry=income_entry, transaction_id=transaction.id)
