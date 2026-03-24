from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.router import api_router
from app.core.config import get_settings
from app.core.database import init_db


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    init_db()
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    is_dev = settings.environment == "development"
    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        docs_url="/docs" if is_dev else None,
        redoc_url="/redoc" if is_dev else None,
        openapi_url="/openapi.json" if is_dev else None,
        lifespan=lifespan,
    )
    app.include_router(api_router)

    @app.get("/healthz", tags=["system"])
    def healthcheck() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()
