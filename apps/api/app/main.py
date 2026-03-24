from fastapi import FastAPI

from app.api.router import api_router
from app.core.config import get_settings
from app.core.database import init_db


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title=settings.app_name, version="0.1.0")
    app.include_router(api_router)

    @app.on_event("startup")
    def _startup() -> None:
        init_db()

    @app.get("/healthz", tags=["system"])
    def healthcheck() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()

