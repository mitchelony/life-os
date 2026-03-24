from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_owner_id
from app.schemas.domain import OnboardingStateRead, ProfileRead
from app.services.onboarding import complete_onboarding, ensure_onboarding_state, ensure_owner_profile

router = APIRouter(prefix="/onboarding", tags=["onboarding"])


@router.post("/start")
def start_onboarding(db: Session = Depends(get_db), owner_id: str = Depends(get_owner_id)) -> dict[str, object]:
    state = ensure_onboarding_state(db, owner_id)
    profile = ensure_owner_profile(db, owner_id)
    return {
        "state": OnboardingStateRead.model_validate(state),
        "profile": ProfileRead.model_validate(profile),
    }


@router.post("/complete")
def complete(db: Session = Depends(get_db), owner_id: str = Depends(get_owner_id)) -> dict[str, object]:
    state = complete_onboarding(db, owner_id)
    return {"state": OnboardingStateRead.model_validate(state)}
