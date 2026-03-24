from app.api.routes._crud import build_crud_router
from app.models.domain import Task
from app.schemas.domain import TaskCreate, TaskRead, TaskUpdate
from app.services.crud import CRUDService

router = build_crud_router(
    prefix="/tasks",
    tags=["tasks"],
    service=CRUDService(Task),
    create_schema=TaskCreate,
    update_schema=TaskUpdate,
    read_schema=TaskRead,
)

