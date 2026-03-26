from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.models.domain import (
    Account,
    ActionItem,
    IncomeEntry,
    IncomePlanAllocation,
    Reserve,
    RoadmapGoal,
    RoadmapStep,
    Transaction,
)
from app.schemas.domain import AccountCreate, AccountRead, AccountUpdate


def _linked_record_count(db: Session, owner_id: str, account_id: str) -> int:
    counts = [
        db.query(func.count(Transaction.id)).filter(Transaction.owner_id == owner_id, Transaction.account_id == account_id).scalar() or 0,
        db.query(func.count(IncomeEntry.id)).filter(IncomeEntry.owner_id == owner_id, IncomeEntry.account_id == account_id).scalar() or 0,
        db.query(func.count(Reserve.id)).filter(Reserve.owner_id == owner_id, Reserve.account_id == account_id).scalar() or 0,
        db.query(func.count(IncomePlanAllocation.id))
        .filter(
            IncomePlanAllocation.owner_id == owner_id,
            or_(IncomePlanAllocation.account_source_id == account_id, IncomePlanAllocation.account_destination_id == account_id),
        )
        .scalar()
        or 0,
        db.query(func.count(RoadmapGoal.id))
        .filter(RoadmapGoal.owner_id == owner_id, RoadmapGoal.linked_type == "account", RoadmapGoal.linked_id == account_id)
        .scalar()
        or 0,
        db.query(func.count(RoadmapStep.id))
        .filter(RoadmapStep.owner_id == owner_id, RoadmapStep.linked_type == "account", RoadmapStep.linked_id == account_id)
        .scalar()
        or 0,
        db.query(func.count(ActionItem.id))
        .filter(ActionItem.owner_id == owner_id, ActionItem.linked_type == "account", ActionItem.linked_id == account_id)
        .scalar()
        or 0,
    ]
    return int(sum(counts))


def _serialize_account(db: Session, owner_id: str, account: Account) -> AccountRead:
    linked_record_count = _linked_record_count(db, owner_id, account.id)
    return AccountRead.model_validate(
        {
            "id": account.id,
            "owner_id": account.owner_id,
            "created_at": account.created_at,
            "updated_at": account.updated_at,
            "name": account.name,
            "type": account.type,
            "institution": account.institution,
            "balance": float(account.balance),
            "is_active": account.is_active,
            "notes": account.notes,
            "linked_record_count": linked_record_count,
            "can_delete": linked_record_count == 0,
        }
    )


@dataclass(slots=True)
class AccountService:
    db: Session
    owner_id: str

    def list(self) -> list[AccountRead]:
        accounts = (
            self.db.query(Account)
            .filter(Account.owner_id == self.owner_id, Account.is_active.is_(True))
            .order_by(Account.created_at.asc())
            .all()
        )
        return [_serialize_account(self.db, self.owner_id, account) for account in accounts]

    def get(self, account_id: str) -> AccountRead | None:
        account = (
            self.db.query(Account)
            .filter(Account.owner_id == self.owner_id, Account.id == account_id, Account.is_active.is_(True))
            .one_or_none()
        )
        if account is None:
            return None
        return _serialize_account(self.db, self.owner_id, account)

    def create(self, payload: AccountCreate) -> AccountRead:
        account = Account(owner_id=self.owner_id, **payload.model_dump())
        self.db.add(account)
        self.db.commit()
        self.db.refresh(account)
        return _serialize_account(self.db, self.owner_id, account)

    def update(self, account_id: str, payload: AccountUpdate) -> AccountRead | None:
        account = (
            self.db.query(Account)
            .filter(Account.owner_id == self.owner_id, Account.id == account_id, Account.is_active.is_(True))
            .one_or_none()
        )
        if account is None:
            return None
        for key, value in payload.model_dump(exclude_unset=True).items():
            setattr(account, key, value)
        self.db.commit()
        self.db.refresh(account)
        return _serialize_account(self.db, self.owner_id, account)

    def delete(self, account_id: str) -> tuple[bool, int]:
        account = (
            self.db.query(Account)
            .filter(Account.owner_id == self.owner_id, Account.id == account_id, Account.is_active.is_(True))
            .one_or_none()
        )
        if account is None:
            return False, 0
        linked_record_count = _linked_record_count(self.db, self.owner_id, account.id)
        if linked_record_count > 0:
            return True, linked_record_count
        self.db.delete(account)
        self.db.commit()
        return True, 0
