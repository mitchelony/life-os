from app.api.routes._crud import build_crud_router
from app.models.domain import Reserve
from app.schemas.domain import ReserveCreate, ReserveRead, ReserveUpdate
from app.services.crud import CRUDService

router = build_crud_router(
    prefix="/reserves",
    tags=["reserves"],
    service=CRUDService(Reserve),
    create_schema=ReserveCreate,
    update_schema=ReserveUpdate,
    read_schema=ReserveRead,
)

