from typing import Any, Generic, TypeVar

from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.deps import get_owner_id

ModelT = TypeVar("ModelT")
CreateT = TypeVar("CreateT", bound=BaseModel)
UpdateT = TypeVar("UpdateT", bound=BaseModel)


class CRUDService(Generic[ModelT, CreateT, UpdateT]):
    def __init__(self, model: type[ModelT]):
        self.model = model

    def list(self, db: Session, owner_id: str) -> list[ModelT]:
        return db.query(self.model).filter(self.model.owner_id == owner_id).all()  # type: ignore[attr-defined]

    def get(self, db: Session, owner_id: str, item_id: str) -> ModelT | None:
        return (
            db.query(self.model)
            .filter(self.model.owner_id == owner_id, self.model.id == item_id)  # type: ignore[attr-defined]
            .one_or_none()
        )

    def create(self, db: Session, owner_id: str, payload: CreateT) -> ModelT:
        instance = self.model(owner_id=owner_id, **payload.model_dump())  # type: ignore[call-arg]
        db.add(instance)
        db.commit()
        db.refresh(instance)
        return instance

    def update(self, db: Session, owner_id: str, item_id: str, payload: UpdateT) -> ModelT | None:
        instance = self.get(db, owner_id, item_id)
        if instance is None:
            return None
        for key, value in payload.model_dump(exclude_unset=True).items():
            setattr(instance, key, value)
        db.commit()
        db.refresh(instance)
        return instance

    def delete(self, db: Session, owner_id: str, item_id: str) -> bool:
        instance = self.get(db, owner_id, item_id)
        if instance is None:
            return False
        db.delete(instance)
        db.commit()
        return True

