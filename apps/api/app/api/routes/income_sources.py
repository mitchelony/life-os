from app.api.routes._crud import build_crud_router
from app.models.domain import IncomeSource
from app.schemas.domain import IncomeSourceCreate, IncomeSourceRead, IncomeSourceUpdate
from app.services.crud import CRUDService

router = build_crud_router(
    prefix="/income-sources",
    tags=["income-sources"],
    service=CRUDService(IncomeSource),
    create_schema=IncomeSourceCreate,
    update_schema=IncomeSourceUpdate,
    read_schema=IncomeSourceRead,
)

