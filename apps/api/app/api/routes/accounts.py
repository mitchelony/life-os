from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_owner_id
from app.schemas.domain import AccountCreate, AccountRead, AccountUpdate
from app.services.accounts import AccountService

router = APIRouter(prefix="/accounts", tags=["accounts"])


@router.get("", response_model=list[AccountRead])
def list_accounts(db: Session = Depends(get_db), owner_id: str = Depends(get_owner_id)) -> list[AccountRead]:
    return AccountService(db, owner_id).list()


@router.post("", response_model=AccountRead, status_code=status.HTTP_201_CREATED)
def create_account(
    payload: AccountCreate,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_owner_id),
) -> AccountRead:
    return AccountService(db, owner_id).create(payload)


@router.get("/{account_id}", response_model=AccountRead)
def get_account(account_id: str, db: Session = Depends(get_db), owner_id: str = Depends(get_owner_id)) -> AccountRead:
    account = AccountService(db, owner_id).get(account_id)
    if account is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return account


@router.patch("/{account_id}", response_model=AccountRead)
def update_account(
    account_id: str,
    payload: AccountUpdate,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_owner_id),
) -> AccountRead:
    account = AccountService(db, owner_id).update(account_id, payload)
    if account is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return account


@router.delete("/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_account(account_id: str, db: Session = Depends(get_db), owner_id: str = Depends(get_owner_id)) -> None:
    found, linked_record_count = AccountService(db, owner_id).delete(account_id)
    if not found:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    if linked_record_count > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Account is still linked to {linked_record_count} record(s). Move those links before deleting it.",
        )
    return None
