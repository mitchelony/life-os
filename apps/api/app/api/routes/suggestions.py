from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy import and_, func, literal
from sqlalchemy.orm import Session

from app.core.deps import get_owner_id
from app.core.database import get_db
from app.models.domain import IncomeSource, Merchant, Transaction
from app.models.enums import TransactionKind

router = APIRouter(prefix="/suggestions", tags=["suggestions"])


@router.get("/merchants", response_model=list[str])
def merchant_suggestions(
    q: str = Query(default="", max_length=80),
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_owner_id),
) -> list[str]:
    last_used = func.coalesce(func.max(Transaction.occurred_on), literal(date(1900, 1, 1)))
    usage_count = func.count(Transaction.id)
    query = (
        db.query(Merchant.name)
        .outerjoin(
            Transaction,
            and_(
                Transaction.owner_id == owner_id,
                Transaction.merchant_id == Merchant.id,
            ),
        )
        .filter(Merchant.owner_id == owner_id, Merchant.is_active.is_(True))
    )
    if q.strip():
        query = query.filter(Merchant.name.ilike(f"%{q.strip()}%"))
    return [
        item[0]
        for item in query.group_by(Merchant.id, Merchant.name).order_by(usage_count.desc(), last_used.desc(), Merchant.name.asc()).limit(8).all()
    ]


@router.get("/sources", response_model=list[str])
def source_suggestions(
    q: str = Query(default="", max_length=80),
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_owner_id),
) -> list[str]:
    last_used = func.coalesce(func.max(Transaction.occurred_on), literal(date(1900, 1, 1)))
    usage_count = func.count(Transaction.id)
    query = (
        db.query(IncomeSource.name)
        .outerjoin(
            Transaction,
            and_(
                Transaction.owner_id == owner_id,
                Transaction.kind == TransactionKind.income,
                Transaction.income_source_id == IncomeSource.id,
            ),
        )
        .filter(IncomeSource.owner_id == owner_id, IncomeSource.is_active.is_(True))
    )
    if q.strip():
        query = query.filter(IncomeSource.name.ilike(f"%{q.strip()}%"))
    return [
        item[0]
        for item in query.group_by(IncomeSource.id, IncomeSource.name).order_by(usage_count.desc(), last_used.desc(), IncomeSource.name.asc()).limit(8).all()
    ]
