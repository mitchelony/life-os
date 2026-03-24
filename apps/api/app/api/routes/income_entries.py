from app.api.routes._crud import build_crud_router
from app.models.domain import IncomeEntry
from app.schemas.domain import IncomeEntryCreate, IncomeEntryRead, IncomeEntryUpdate
from app.services.crud import CRUDService

router = build_crud_router(
    prefix="/income-entries",
    tags=["income-entries"],
    service=CRUDService(IncomeEntry),
    create_schema=IncomeEntryCreate,
    update_schema=IncomeEntryUpdate,
    read_schema=IncomeEntryRead,
)

