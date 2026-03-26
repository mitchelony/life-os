from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.routes._crud import build_crud_router
from app.core.database import get_db
from app.core.deps import get_owner_id
from app.models.domain import RoadmapGoal, RoadmapStep
from app.schemas.domain import (
    RoadmapGoalCreate,
    RoadmapGoalEntityRead,
    RoadmapGoalSummary,
    RoadmapGoalUpdate,
    RoadmapImportPayload,
    RoadmapImportResult,
    RoadmapStepCreate,
    RoadmapStepRead,
    RoadmapStepUpdate,
)
from app.services.crud import CRUDService
from app.services.decision_engine import DecisionEngineService
from app.services.roadmap_import import RoadmapImportService

router = APIRouter(prefix="/roadmap", tags=["roadmap"])


@router.get("", response_model=RoadmapGoalSummary)
def get_roadmap(db: Session = Depends(get_db), owner_id: str = Depends(get_owner_id)) -> RoadmapGoalSummary:
    return DecisionEngineService(db, owner_id).build().roadmap_summary


@router.post("/import", response_model=RoadmapImportResult)
def import_roadmap(
    payload: RoadmapImportPayload,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_owner_id),
) -> RoadmapImportResult:
    return RoadmapImportService(db, owner_id).run(payload)


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
