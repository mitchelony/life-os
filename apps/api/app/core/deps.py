from fastapi import Header, HTTPException, status

from app.core.config import get_settings


def get_owner_id(x_owner_token: str | None = Header(default=None, alias="X-Owner-Token")) -> str:
    settings = get_settings()
    if settings.auth_strategy != "dev-token":
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication strategy is not configured for this build",
        )
    if not x_owner_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing owner token")
    if x_owner_token != settings.dev_owner_token:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid owner token")
    return settings.owner_id
