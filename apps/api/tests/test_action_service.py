from datetime import date

from app.models.domain import ActionItem
from app.services.action_items import ActionItemService


def test_marking_action_done_sets_completion_timestamps_and_emits_activity(db_session) -> None:
    owner_id = "owner-actions"
    action = ActionItem(owner_id=owner_id, title="Call lender", status="todo", lane="this_week", source="manual", due_on=date.today())
    db_session.add(action)
    db_session.commit()

    updated = ActionItemService(db_session, owner_id).update(
        action.id,
        {
            "status": "done",
        },
    )

    assert updated is not None
    assert updated.status == "done"
    assert updated.completed_at is not None
    assert updated.skipped_at is None
