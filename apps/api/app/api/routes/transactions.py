from app.api.routes._crud import build_crud_router
from app.models.domain import Transaction
from app.schemas.domain import TransactionCreate, TransactionRead, TransactionUpdate
from app.services.crud import CRUDService

router = build_crud_router(
    prefix="/transactions",
    tags=["transactions"],
    service=CRUDService(Transaction),
    create_schema=TransactionCreate,
    update_schema=TransactionUpdate,
    read_schema=TransactionRead,
)

