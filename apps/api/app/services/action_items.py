from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.models.domain import ActionItem, ActivityEvent


def _payload_dict(payload: BaseModel | dict[str, Any]) -> dict[str, Any]:
    if isinstance(payload, BaseModel):
        return payload.model_dump(exclude_unset=True)
    return payload


@dataclass(slots=True)
class ActionItemService:
    db: Session
    owner_id: str

    def list(self) -> list[ActionItem]:
        return self.db.query(ActionItem).filter(ActionItem.owner_id == self.owner_id).all()

    def get(self, item_id: str) -> ActionItem | None:
        return (
            self.db.query(ActionItem)
            .filter(ActionItem.owner_id == self.owner_id, ActionItem.id == item_id)
            .one_or_none()
        )

    def create(self, payload: BaseModel | dict[str, Any]) -> ActionItem:
        instance = ActionItem(owner_id=self.owner_id, **_payload_dict(payload))
        self.db.add(instance)
        self.db.commit()
        self.db.refresh(instance)
        return instance

    def update(self, item_id: str, payload: BaseModel | dict[str, Any]) -> ActionItem | None:
        instance = self.get(item_id)
        if instance is None:
            return None

        updates = _payload_dict(payload)
        previous_status = instance.status
        for key, value in updates.items():
            setattr(instance, key, value)

        next_status = updates.get("status", instance.status)
        now = datetime.now(timezone.utc)
        if next_status == "done":
            instance.completed_at = now
            instance.skipped_at = None
        elif next_status == "skipped":
            instance.skipped_at = now
            instance.completed_at = None
        elif "status" in updates:
            instance.completed_at = None
            instance.skipped_at = None

        if previous_status != next_status and next_status in {"done", "skipped"}:
            self.db.add(
                ActivityEvent(
                    owner_id=self.owner_id,
                    event_type="action_completed" if next_status == "done" else "action_skipped",
                    title=instance.title,
                    detail="Completed action" if next_status == "done" else "Skipped action",
                    linked_type=instance.linked_type,
                    linked_id=instance.linked_id,
                )
            )

        self.db.commit()
        self.db.refresh(instance)
        return instance

    def delete(self, item_id: str) -> bool:
        instance = self.get(item_id)
        if instance is None:
            return False
        self.db.delete(instance)
        self.db.commit()
        return True
