from sqlalchemy.orm import Session

from app.models.domain import AppSetting, OnboardingState, Profile


def ensure_onboarding_state(db: Session, owner_id: str) -> OnboardingState:
    state = db.query(OnboardingState).filter(OnboardingState.owner_id == owner_id).one_or_none()
    if state is None:
        state = OnboardingState(owner_id=owner_id, current_step="start", is_complete=False)
        db.add(state)
        db.commit()
        db.refresh(state)
    return state


def complete_onboarding(db: Session, owner_id: str) -> OnboardingState:
    state = ensure_onboarding_state(db, owner_id)
    state.is_complete = True
    db.commit()
    db.refresh(state)
    return state


def ensure_owner_profile(db: Session, owner_id: str, display_name: str | None = None) -> Profile:
    profile = db.query(Profile).filter(Profile.owner_id == owner_id).one_or_none()
    if profile is None:
        profile = Profile(id=owner_id, owner_id=owner_id, display_name=display_name, currency="USD")
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile
