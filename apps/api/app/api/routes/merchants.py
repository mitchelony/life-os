from app.api.routes._crud import build_crud_router
from app.models.domain import Merchant
from app.schemas.domain import MerchantCreate, MerchantRead, MerchantUpdate
from app.services.crud import CRUDService

router = build_crud_router(
    prefix="/merchants",
    tags=["merchants"],
    service=CRUDService(Merchant),
    create_schema=MerchantCreate,
    update_schema=MerchantUpdate,
    read_schema=MerchantRead,
)

