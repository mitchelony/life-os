from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_owner_id
from app.schemas.domain import RecentUpdate
from app.services.decision_engine import DecisionEngineService

router = APIRouter(prefix="/activity", tags=["activity"])


@router.get("", response_model=list[RecentUpdate])
def list_activity(db: Session = Depends(get_db), owner_id: str = Depends(get_owner_id)) -> list[RecentUpdate]:
    return DecisionEngineService(db, owner_id).build().recent_updates
