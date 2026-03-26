from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_owner_id
from app.services.planning_reset import PlanningResetService

router = APIRouter(prefix="/planning", tags=["planning"])


@router.post("/relaunch", status_code=status.HTTP_204_NO_CONTENT)
def relaunch_planning(db: Session = Depends(get_db), owner_id: str = Depends(get_owner_id)):
    PlanningResetService(db, owner_id).relaunch()
    return None
