import httpx
from fastapi import Header, HTTPException, status

from app.core.config import get_settings


def _extract_bearer_token(authorization: str | None) -> str | None:
    if not authorization:
        return None
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        return None
    return token


def _get_supabase_owner_id(access_token: str) -> str:
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_anon_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase auth is not configured for this build",
        )

    try:
        response = httpx.get(
            f"{settings.supabase_url.rstrip('/')}{settings.supabase_auth_user_path}",
            headers={
                "Authorization": f"Bearer {access_token}",
                "apikey": settings.supabase_anon_key,
            },
            timeout=10,
        )
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to verify Supabase session",
        ) from exc
    if response.status_code in {401, 403}:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid access token")
    if response.status_code >= 400:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to verify Supabase session",
        )

    user = response.json()
    owner_id = user.get("id")
    if not isinstance(owner_id, str) or not owner_id:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase session payload is missing a user id",
        )
    return owner_id


def get_owner_id(
    authorization: str | None = Header(default=None, alias="Authorization"),
    x_owner_token: str | None = Header(default=None, alias="X-Owner-Token"),
) -> str:
    settings = get_settings()
    if settings.auth_strategy == "supabase":
        access_token = _extract_bearer_token(authorization)
        if not access_token:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")
        return _get_supabase_owner_id(access_token)
    if settings.auth_strategy == "dev-token":
        if not x_owner_token:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing owner token")
        if x_owner_token != settings.dev_owner_token:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid owner token")
        return settings.owner_id
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Authentication strategy is not configured for this build",
    )
