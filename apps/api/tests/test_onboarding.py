from app.models.domain import OnboardingState, Profile
from app.services.onboarding import complete_onboarding, ensure_onboarding_state, ensure_owner_profile


def test_ensure_owner_profile_prefers_existing_canonical_row_when_duplicates_exist(db_session) -> None:
    db_session.add_all(
        [
            Profile(id="owner", owner_id="owner", display_name="Primary", currency="USD"),
            Profile(id="owner-duplicate", owner_id="owner", display_name="Duplicate", currency="USD"),
        ]
    )
    db_session.commit()

    profile = ensure_owner_profile(db_session, "owner")

    assert profile.id == "owner"
    assert profile.display_name == "Primary"


def test_ensure_onboarding_state_uses_stable_owner_id_and_ignores_duplicate_rows(db_session) -> None:
    db_session.add_all(
        [
            OnboardingState(id="owner", owner_id="owner", current_step="start", is_complete=False),
            OnboardingState(id="owner-duplicate", owner_id="owner", current_step="review", is_complete=True),
        ]
    )
    db_session.commit()

    state = ensure_onboarding_state(db_session, "owner")

    assert state.id == "owner"
    assert state.current_step == "start"
    assert state.is_complete is False


def test_complete_onboarding_marks_canonical_row_complete(db_session) -> None:
    db_session.add_all(
        [
            OnboardingState(id="owner", owner_id="owner", current_step="start", is_complete=False),
            OnboardingState(id="owner-duplicate", owner_id="owner", current_step="review", is_complete=False),
        ]
    )
    db_session.commit()

    state = complete_onboarding(db_session, "owner")

    assert state.id == "owner"
    assert state.is_complete is True
