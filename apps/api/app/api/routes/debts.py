from app.api.routes._crud import build_crud_router
from app.models.domain import Debt
from app.schemas.domain import DebtCreate, DebtRead, DebtUpdate
from app.services.crud import CRUDService

router = build_crud_router(
    prefix="/debts",
    tags=["debts"],
    service=CRUDService(Debt),
    create_schema=DebtCreate,
    update_schema=DebtUpdate,
    read_schema=DebtRead,
)

