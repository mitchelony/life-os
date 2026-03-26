from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_owner_id
from app.schemas.domain import ActionItemRead, DecisionActionCreate, DecisionActionUpdate
from app.services.action_items import ActionItemService

router = APIRouter(prefix="/actions", tags=["actions"])


@router.get("", response_model=list[ActionItemRead])
def list_actions(db: Session = Depends(get_db), owner_id: str = Depends(get_owner_id)):
    return ActionItemService(db, owner_id).list()


@router.post("", response_model=ActionItemRead, status_code=status.HTTP_201_CREATED)
def create_action(
    payload: DecisionActionCreate,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_owner_id),
):
    return ActionItemService(db, owner_id).create(payload)


@router.get("/{item_id}", response_model=ActionItemRead)
def get_action(item_id: str, db: Session = Depends(get_db), owner_id: str = Depends(get_owner_id)):
    item = ActionItemService(db, owner_id).get(item_id)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return item


@router.patch("/{item_id}", response_model=ActionItemRead)
def update_action(
    item_id: str,
    payload: DecisionActionUpdate,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_owner_id),
):
    item = ActionItemService(db, owner_id).update(item_id, payload)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return item


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_action(item_id: str, db: Session = Depends(get_db), owner_id: str = Depends(get_owner_id)):
    deleted = ActionItemService(db, owner_id).delete(item_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return None
