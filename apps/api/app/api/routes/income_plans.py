from app.api.routes._crud import build_crud_router
from app.models.domain import IncomePlan, IncomePlanAllocation
from app.schemas.domain import IncomePlanAllocationCreate, IncomePlanAllocationRead, IncomePlanAllocationUpdate, IncomePlanCreate, IncomePlanRead, IncomePlanUpdate
from app.services.crud import CRUDService

router = build_crud_router(
    prefix="/income-plans",
    tags=["income-plans"],
    service=CRUDService(IncomePlan),
    create_schema=IncomePlanCreate,
    update_schema=IncomePlanUpdate,
    read_schema=IncomePlanRead,
)

allocations_router = build_crud_router(
    prefix="/income-plan-allocations",
    tags=["income-plans"],
    service=CRUDService(IncomePlanAllocation),
    create_schema=IncomePlanAllocationCreate,
    update_schema=IncomePlanAllocationUpdate,
    read_schema=IncomePlanAllocationRead,
)
