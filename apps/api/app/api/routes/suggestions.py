from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_owner_id
from app.models.domain import IncomeSource, Merchant

router = APIRouter(prefix="/suggestions", tags=["suggestions"])


@router.get("/merchants", response_model=list[str])
def merchant_suggestions(
    q: str = Query(default="", max_length=80),
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_owner_id),
) -> list[str]:
    query = db.query(Merchant).filter(Merchant.owner_id == owner_id, Merchant.is_active.is_(True))
    if q.strip():
        query = query.filter(Merchant.name.ilike(f"%{q.strip()}%"))
    return [item.name for item in query.order_by(Merchant.name.asc()).limit(8).all()]


@router.get("/sources", response_model=list[str])
def source_suggestions(
    q: str = Query(default="", max_length=80),
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_owner_id),
) -> list[str]:
    query = db.query(IncomeSource).filter(IncomeSource.owner_id == owner_id, IncomeSource.is_active.is_(True))
    if q.strip():
        query = query.filter(IncomeSource.name.ilike(f"%{q.strip()}%"))
    return [item.name for item in query.order_by(IncomeSource.name.asc()).limit(8).all()]

