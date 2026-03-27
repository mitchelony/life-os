from fastapi import APIRouter, Depends, HTTPException, status
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
    RoadmapCopilotApproveRequest,
    RoadmapCopilotApproveResponse,
    RoadmapCopilotCurrentResponse,
    RoadmapCopilotDenyRequest,
    RoadmapCopilotDenyResponse,
    RoadmapCopilotDraftRequest,
    RoadmapCopilotDraftResponse,
    RoadmapCopilotEmergencyExpenseRequest,
    RoadmapCopilotEmergencyExpenseResponse,
    RoadmapCopilotReviseRequest,
    RoadmapImportV2Payload,
    RoadmapImportV2Result,
    RoadmapStepCreate,
    RoadmapStepRead,
    RoadmapStepUpdate,
)
from app.services.crud import CRUDService
from app.services.decision_engine import DecisionEngineService
from app.services.roadmap_copilot import RoadmapCopilotService
from app.services.roadmap_import import RoadmapImportService

router = APIRouter(prefix="/roadmap", tags=["roadmap"])


@router.get("", response_model=RoadmapGoalSummary)
def get_roadmap(db: Session = Depends(get_db), owner_id: str = Depends(get_owner_id)) -> RoadmapGoalSummary:
    return DecisionEngineService(db, owner_id).build().roadmap_summary


@router.post("/import", response_model=RoadmapImportV2Result)
def import_roadmap(
    payload: RoadmapImportV2Payload,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_owner_id),
) -> RoadmapImportV2Result:
    return RoadmapImportService(db, owner_id).import_v2(payload)


@router.get("/copilot/current", response_model=RoadmapCopilotCurrentResponse)
def get_current_copilot_draft(
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_owner_id),
) -> RoadmapCopilotCurrentResponse:
    return RoadmapCopilotService(db, owner_id).current()


@router.post("/copilot/draft", response_model=RoadmapCopilotDraftResponse)
def draft_roadmap_copilot(
    payload: RoadmapCopilotDraftRequest,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_owner_id),
) -> RoadmapCopilotDraftResponse:
    return RoadmapCopilotService(db, owner_id).draft(payload.message)


@router.post("/copilot/revise", response_model=RoadmapCopilotDraftResponse)
def revise_roadmap_copilot(
    payload: RoadmapCopilotReviseRequest,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_owner_id),
) -> RoadmapCopilotDraftResponse:
    try:
        return RoadmapCopilotService(db, owner_id).revise(payload.draft_id, payload.revision_note)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc


@router.post("/copilot/approve", response_model=RoadmapCopilotApproveResponse)
def approve_roadmap_copilot(
    payload: RoadmapCopilotApproveRequest,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_owner_id),
) -> RoadmapCopilotApproveResponse:
    try:
        return RoadmapCopilotService(db, owner_id).approve(payload.draft_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc


@router.post("/copilot/deny", response_model=RoadmapCopilotDenyResponse)
def deny_roadmap_copilot(
    payload: RoadmapCopilotDenyRequest,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_owner_id),
) -> RoadmapCopilotDenyResponse:
    try:
        return RoadmapCopilotService(db, owner_id).deny(payload.draft_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc


@router.post("/copilot/emergency-expense", response_model=RoadmapCopilotEmergencyExpenseResponse)
def emergency_expense_roadmap_copilot(
    payload: RoadmapCopilotEmergencyExpenseRequest,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_owner_id),
) -> RoadmapCopilotEmergencyExpenseResponse:
    return RoadmapCopilotService(db, owner_id).emergency_expense(payload)


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
