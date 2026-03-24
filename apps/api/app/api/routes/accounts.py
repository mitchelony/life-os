from app.api.routes._crud import build_crud_router
from app.models.domain import Account
from app.schemas.domain import AccountCreate, AccountRead, AccountUpdate
from app.services.crud import CRUDService

router = build_crud_router(
    prefix="/accounts",
    tags=["accounts"],
    service=CRUDService(Account),
    create_schema=AccountCreate,
    update_schema=AccountUpdate,
    read_schema=AccountRead,
)

