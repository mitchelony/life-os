from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_owner_id
from app.schemas.domain import ProgressSummary
from app.services.decision_engine import DecisionEngineService

router = APIRouter(prefix="/progress", tags=["progress"])


@router.get("", response_model=ProgressSummary)
def get_progress(db: Session = Depends(get_db), owner_id: str = Depends(get_owner_id)) -> ProgressSummary:
    return DecisionEngineService(db, owner_id).build().progress_summary
