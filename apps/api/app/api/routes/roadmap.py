from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.routes._crud import build_crud_router
from app.core.database import get_db
from app.core.deps import get_owner_id
from app.models.domain import RoadmapGoal, RoadmapStep
from app.schemas.domain import RoadmapGoalCreate, RoadmapGoalEntityRead, RoadmapGoalSummary, RoadmapGoalUpdate, RoadmapStepCreate, RoadmapStepRead, RoadmapStepUpdate
from app.services.crud import CRUDService
from app.services.decision_engine import DecisionEngineService

router = APIRouter(prefix="/roadmap", tags=["roadmap"])


@router.get("", response_model=RoadmapGoalSummary)
def get_roadmap(db: Session = Depends(get_db), owner_id: str = Depends(get_owner_id)) -> RoadmapGoalSummary:
    return DecisionEngineService(db, owner_id).build().roadmap_summary


goals_router = build_crud_router(
    prefix="/roadmap/goals",
    tags=["roadmap"],
    service=CRUDService(RoadmapGoal),
    create_schema=RoadmapGoalCreate,
    update_schema=RoadmapGoalUpdate,
    read_schema=RoadmapGoalEntityRead,
)

steps_router = build_crud_router(
    prefix="/roadmap/steps",
    tags=["roadmap"],
    service=CRUDService(RoadmapStep),
    create_schema=RoadmapStepCreate,
    update_schema=RoadmapStepUpdate,
    read_schema=RoadmapStepRead,
)
