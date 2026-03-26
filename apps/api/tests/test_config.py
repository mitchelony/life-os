import pytest

from app.core.config import Settings
from app.main import create_app


def test_settings_extracts_matching_supabase_project_refs() -> None:
    settings = Settings(
        APP_NAME="Life OS API",
        ENVIRONMENT="development",
        AUTH_STRATEGY="supabase",
        SUPABASE_URL="https://dmalyowpduvsjeinkifm.supabase.co",
        SUPABASE_ANON_KEY="anon",
        SUPABASE_SERVICE_ROLE_KEY="service",
        DEV_OWNER_TOKEN="token",
        DATABASE_URL="postgresql+psycopg://postgres.dmalyowpduvsjeinkifm:password@aws-0-us-west-2.pooler.supabase.com:6543/postgres?sslmode=require",
    )

    assert settings.get_supabase_project_ref() == "dmalyowpduvsjeinkifm"
    assert settings.get_database_project_ref() == "dmalyowpduvsjeinkifm"


def test_settings_rejects_mismatched_supabase_project_refs() -> None:
    settings = Settings(
        APP_NAME="Life OS API",
        ENVIRONMENT="development",
        AUTH_STRATEGY="supabase",
        SUPABASE_URL="https://dmalyowpduvsjeinkifm.supabase.co",
        SUPABASE_ANON_KEY="anon",
        SUPABASE_SERVICE_ROLE_KEY="service",
        DEV_OWNER_TOKEN="token",
        DATABASE_URL="postgresql+psycopg://postgres.dzjxgkzmxpdbqwarqzsa:password@aws-1-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require",
    )

    with pytest.raises(RuntimeError, match="different projects"):
        settings.validate_supabase_alignment()


def test_create_app_fails_fast_when_supabase_url_and_database_url_do_not_match(monkeypatch) -> None:
    monkeypatch.setattr("app.main.init_db", lambda: None)

    settings = Settings(
        APP_NAME="Life OS API",
        ENVIRONMENT="development",
        AUTH_STRATEGY="supabase",
        SUPABASE_URL="https://dmalyowpduvsjeinkifm.supabase.co",
        SUPABASE_ANON_KEY="anon",
        SUPABASE_SERVICE_ROLE_KEY="service",
        DEV_OWNER_TOKEN="token",
        DATABASE_URL="postgresql+psycopg://postgres.dzjxgkzmxpdbqwarqzsa:password@aws-1-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require",
    )

    monkeypatch.setattr("app.main.get_settings", lambda: settings)

    with pytest.raises(RuntimeError, match="dmalyowpduvsjeinkifm"):
        create_app()


def test_settings_include_legacy_allowed_origin_in_cors_list() -> None:
    settings = Settings(
        APP_NAME="Life OS API",
        ENVIRONMENT="development",
        AUTH_STRATEGY="supabase",
        SUPABASE_URL="https://dmalyowpduvsjeinkifm.supabase.co",
        SUPABASE_ANON_KEY="anon",
        SUPABASE_SERVICE_ROLE_KEY="service",
        DEV_OWNER_TOKEN="token",
        DATABASE_URL="postgresql+psycopg://postgres.dmalyowpduvsjeinkifm:password@aws-0-us-west-2.pooler.supabase.com:6543/postgres?sslmode=require",
        CORS_ALLOWED_ORIGINS="http://localhost:3000,http://localhost:3001",
        ALLOWED_ORIGIN="http://192.168.1.162:3000",
    )

    assert settings.get_cors_allowed_origins() == [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://192.168.1.162:3000",
    ]
