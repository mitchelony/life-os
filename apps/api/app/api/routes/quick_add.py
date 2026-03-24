from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_owner_id
from app.schemas.domain import QuickAddRequest, QuickAddResponse
from app.services.quick_add import QuickAddService

router = APIRouter(prefix="/quick-add", tags=["quick-add"])


@router.post("", response_model=QuickAddResponse)
def submit_quick_add(
    payload: QuickAddRequest,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_owner_id),
) -> QuickAddResponse:
    return QuickAddService(db, owner_id).submit(payload)
