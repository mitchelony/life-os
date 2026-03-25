from functools import lru_cache
from urllib.parse import urlparse

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = Field(default="Life OS API", alias="APP_NAME")
    environment: str = Field(default="development", alias="ENVIRONMENT")
    database_url: str = Field(default="postgresql+psycopg://postgres:postgres@127.0.0.1:54322/postgres", alias="DATABASE_URL")
    cors_allowed_origins: str = Field(
        default="http://localhost:3000,http://localhost:3001",
        alias="CORS_ALLOWED_ORIGINS",
    )
    default_currency: str = Field(default="USD", alias="DEFAULT_CURRENCY")
    supabase_url: str | None = Field(default=None, alias="SUPABASE_URL")
    supabase_anon_key: str | None = Field(default=None, alias="SUPABASE_ANON_KEY")
    supabase_service_role_key: str | None = Field(default=None, alias="SUPABASE_SERVICE_ROLE_KEY")
    supabase_auth_user_path: str = Field(default="/auth/v1/user", alias="SUPABASE_AUTH_USER_PATH")
    owner_id: str = Field(default="00000000-0000-0000-0000-000000000001", alias="OWNER_ID")
    dev_owner_token: str = Field(alias="DEV_OWNER_TOKEN")
    auth_strategy: str = Field(default="supabase", alias="AUTH_STRATEGY")
    allow_dev_login: bool = Field(default=True, alias="ALLOW_DEV_LOGIN")

    def get_cors_allowed_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_allowed_origins.split(",") if origin.strip()]

    def get_supabase_project_ref(self) -> str | None:
        parsed = urlparse(self.supabase_url or "")
        host = parsed.hostname or ""
        if host.endswith(".supabase.co"):
            return host.split(".", 1)[0] or None
        return None

    def get_database_project_ref(self) -> str | None:
        parsed = urlparse(self.database_url)
        if parsed.scheme.startswith("sqlite"):
            return None
        username = parsed.username or ""
        if username.startswith("postgres."):
            return username.split(".", 1)[1] or None
        host = parsed.hostname or ""
        if host.startswith("db.") and host.endswith(".supabase.co"):
            return host.split(".")[1] or None
        return None

    def validate_supabase_alignment(self) -> None:
        if self.auth_strategy != "supabase":
            return
        supabase_ref = self.get_supabase_project_ref()
        database_ref = self.get_database_project_ref()
        if not supabase_ref or not database_ref:
            return
        if supabase_ref != database_ref:
            raise RuntimeError(
                "Supabase auth and database config point at different projects. "
                f"SUPABASE_URL uses '{supabase_ref}' but DATABASE_URL uses '{database_ref}'. "
                "Update DATABASE_URL and SUPABASE_DB_URL to the same project as SUPABASE_URL."
            )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
