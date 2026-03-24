from app.api.routes._crud import build_crud_router
from app.models.domain import Obligation
from app.schemas.domain import ObligationCreate, ObligationRead, ObligationUpdate
from app.services.crud import CRUDService

router = build_crud_router(
    prefix="/obligations",
    tags=["obligations"],
    service=CRUDService(Obligation),
    create_schema=ObligationCreate,
    update_schema=ObligationUpdate,
    read_schema=ObligationRead,
)

