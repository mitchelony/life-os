from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = Field(default="Life OS API", alias="APP_NAME")
    environment: str = Field(default="development", alias="ENVIRONMENT")
    database_url: str = Field(default="sqlite:///./life_os.db", alias="DATABASE_URL")
    default_currency: str = Field(default="USD", alias="DEFAULT_CURRENCY")
    owner_id: str = Field(default="00000000-0000-0000-0000-000000000001", alias="OWNER_ID")
    dev_owner_token: str = Field(default="dev-owner-token", alias="DEV_OWNER_TOKEN")
    auth_strategy: str = Field(default="dev-token", alias="AUTH_STRATEGY")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()

