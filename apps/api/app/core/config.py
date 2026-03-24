from functools import lru_cache

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


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
