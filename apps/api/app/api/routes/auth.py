from fastapi import APIRouter, Depends

from app.core.config import get_settings
from app.core.deps import get_owner_id
from app.schemas.domain import DevLoginRequest, DevLoginResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/dev-login", response_model=DevLoginResponse)
def dev_login(_: DevLoginRequest | None = None) -> DevLoginResponse:
    settings = get_settings()
    return DevLoginResponse(owner_id=settings.owner_id, owner_token=settings.dev_owner_token)


@router.get("/whoami")
def whoami(owner_id: str = Depends(get_owner_id)) -> dict[str, str]:
    return {"owner_id": owner_id}

