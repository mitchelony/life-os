from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_owner_id
from app.schemas.domain import DecisionSnapshot
from app.services.decision_engine import DecisionEngineService

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("", response_model=DecisionSnapshot)
def get_dashboard(db: Session = Depends(get_db), owner_id: str = Depends(get_owner_id)) -> DecisionSnapshot:
    return DecisionEngineService(db, owner_id).build()
