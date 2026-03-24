from fastapi import APIRouter, Depends, HTTPException, status

from app.core.config import get_settings
from app.core.deps import get_owner_id
from app.schemas.domain import DevLoginRequest, DevLoginResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/dev-login", response_model=DevLoginResponse)
def dev_login(_: DevLoginRequest | None = None) -> DevLoginResponse:
    settings = get_settings()
    if settings.environment != "development" or not settings.allow_dev_login:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return DevLoginResponse(owner_id=settings.owner_id, owner_token=settings.dev_owner_token)


@router.get("/whoami")
def whoami(owner_id: str = Depends(get_owner_id)) -> dict[str, str]:
    return {"owner_id": owner_id}
