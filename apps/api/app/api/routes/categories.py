from app.api.routes._crud import build_crud_router
from app.models.domain import Category
from app.schemas.domain import CategoryCreate, CategoryRead, CategoryUpdate
from app.services.crud import CRUDService

router = build_crud_router(
    prefix="/categories",
    tags=["categories"],
    service=CRUDService(Category),
    create_schema=CategoryCreate,
    update_schema=CategoryUpdate,
    read_schema=CategoryRead,
)

