from sqlalchemy import case
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.domain import AppSetting, OnboardingState, Profile


def _canonical_owner_record(db: Session, model: type[Profile] | type[OnboardingState], owner_id: str):
    return (
        db.query(model)
        .filter(model.owner_id == owner_id)
        .order_by(
            case((model.id == owner_id, 0), else_=1),
            model.created_at.asc(),
            model.id.asc(),
        )
        .first()
    )


def ensure_onboarding_state(db: Session, owner_id: str) -> OnboardingState:
    state = _canonical_owner_record(db, OnboardingState, owner_id)
    if state is None:
        state = OnboardingState(id=owner_id, owner_id=owner_id, current_step="start", is_complete=False)
        db.add(state)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            state = _canonical_owner_record(db, OnboardingState, owner_id)
            if state is None:
                raise
        else:
            db.refresh(state)
    return state


def complete_onboarding(db: Session, owner_id: str) -> OnboardingState:
    state = ensure_onboarding_state(db, owner_id)
    state.is_complete = True
    db.commit()
    db.refresh(state)
    return state


def ensure_owner_profile(db: Session, owner_id: str, display_name: str | None = None) -> Profile:
    profile = _canonical_owner_record(db, Profile, owner_id)
    if profile is None:
        profile = Profile(id=owner_id, owner_id=owner_id, display_name=display_name, currency="USD")
        db.add(profile)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            profile = _canonical_owner_record(db, Profile, owner_id)
            if profile is None:
                raise
        else:
            db.refresh(profile)
    return profile
