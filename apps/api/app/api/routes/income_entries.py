from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.routes._crud import build_crud_router
from app.core.database import get_db
from app.core.deps import get_owner_id
from app.models.domain import IncomeEntry
from app.schemas.domain import IncomeEntryConfirmRequest, IncomeEntryConfirmResponse, IncomeEntryCreate, IncomeEntryRead, IncomeEntryUpdate
from app.services.crud import CRUDService
from app.services.income_entries import IncomeEntryService

router = build_crud_router(
    prefix="/income-entries",
    tags=["income-entries"],
    service=CRUDService(IncomeEntry),
    create_schema=IncomeEntryCreate,
    update_schema=IncomeEntryUpdate,
    read_schema=IncomeEntryRead,
)


@router.post("/{item_id}/confirm", response_model=IncomeEntryConfirmResponse, status_code=status.HTTP_200_OK)
def confirm_income_entry(
    item_id: str,
    payload: IncomeEntryConfirmRequest,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_owner_id),
) -> IncomeEntryConfirmResponse:
    result = IncomeEntryService(db, owner_id).confirm(
        item_id,
        account_id=payload.account_id,
        received_on=payload.received_on,
    )
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return result
