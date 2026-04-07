from fastapi.testclient import TestClient

from app.core.config import Settings, get_settings
from app.core.deps import get_owner_id
from app.main import create_app


def _client(monkeypatch):
    monkeypatch.setattr("app.main.init_db", lambda: None)
    return TestClient(create_app())


def test_dev_login_is_available_only_when_explicitly_enabled_in_development(monkeypatch) -> None:
    monkeypatch.setenv("ENVIRONMENT", "development")
    monkeypatch.setenv("ALLOW_DEV_LOGIN", "true")
    monkeypatch.setenv("DEV_OWNER_TOKEN", "test-owner-token")
    get_settings.cache_clear()

    client = _client(monkeypatch)
    response = client.post("/api/auth/dev-login")

    assert response.status_code == 200
    assert response.json()["owner_token"] == "test-owner-token"


def test_dev_login_stays_hidden_when_allow_dev_login_is_unset(monkeypatch) -> None:
    monkeypatch.setattr(
        "app.api.routes.auth.get_settings",
        lambda: Settings(_env_file=None, ENVIRONMENT="development", DEV_OWNER_TOKEN="test-owner-token"),
    )

    client = _client(monkeypatch)
    response = client.post("/api/auth/dev-login")

    assert response.status_code == 404


def test_dev_login_is_hidden_outside_local_dev(monkeypatch) -> None:
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("ALLOW_DEV_LOGIN", "false")
    get_settings.cache_clear()

    client = _client(monkeypatch)
    response = client.post("/api/auth/dev-login")

    assert response.status_code == 404


def test_available_spend_post_requires_owner_token(monkeypatch) -> None:
    monkeypatch.setenv("ENVIRONMENT", "development")
    monkeypatch.setenv("ALLOW_DEV_LOGIN", "true")
    monkeypatch.setenv("DEV_OWNER_TOKEN", "test-owner-token")
    monkeypatch.setenv("AUTH_STRATEGY", "dev-token")
    get_settings.cache_clear()

    client = _client(monkeypatch)
    response = client.post(
        "/api/available-spend/explain",
        json={
            "liquid_cash": 500,
            "protected_cash_buffer": 100,
            "manual_reserves": 25,
            "obligations_due_before_next_income": 50,
            "minimum_debt_payments_due_before_next_income": 25,
            "essential_spend_target_remaining_until_next_income": 50,
        },
    )

    assert response.status_code == 401


def test_supabase_auth_accepts_verified_bearer_token(monkeypatch) -> None:
    monkeypatch.setenv("AUTH_STRATEGY", "supabase")
    monkeypatch.setenv("SUPABASE_URL", "http://localhost:54321")
    monkeypatch.setenv("SUPABASE_ANON_KEY", "test-anon-key")
    get_settings.cache_clear()

    monkeypatch.setattr("app.core.deps._get_supabase_owner_id", lambda token: "owner-123" if token == "good-token" else None)

    client = _client(monkeypatch)
    response = client.get("/api/auth/whoami", headers={"Authorization": "Bearer good-token"})

    assert response.status_code == 200
    assert response.json() == {"owner_id": "owner-123"}


def test_supabase_auth_requires_bearer_token(monkeypatch) -> None:
    monkeypatch.setenv("AUTH_STRATEGY", "supabase")
    monkeypatch.setenv("SUPABASE_URL", "http://localhost:54321")
    monkeypatch.setenv("SUPABASE_ANON_KEY", "test-anon-key")
    get_settings.cache_clear()

    client = _client(monkeypatch)
    response = client.get("/api/auth/whoami")

    assert response.status_code == 401


def test_unknown_auth_strategy_fails_closed(monkeypatch) -> None:
    monkeypatch.setenv("AUTH_STRATEGY", "supabase")
    monkeypatch.setenv("SUPABASE_URL", "")
    monkeypatch.setenv("SUPABASE_ANON_KEY", "")
    get_settings.cache_clear()

    try:
        get_owner_id("Bearer test-owner-token")
    except Exception as exc:
        assert getattr(exc, "status_code", None) == 503
        assert "Supabase auth is not configured" in str(getattr(exc, "detail", ""))
    else:
        raise AssertionError("Expected get_owner_id() to fail when Supabase auth is not configured")


def test_dashboard_preflight_allows_local_web_origin(monkeypatch) -> None:
    monkeypatch.setenv("CORS_ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:3001")
    get_settings.cache_clear()

    client = _client(monkeypatch)
    response = client.options(
        "/api/dashboard",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "authorization,content-type",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"


def test_dashboard_preflight_allows_legacy_allowed_origin(monkeypatch) -> None:
    monkeypatch.setenv("CORS_ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:3001")
    monkeypatch.setenv("ALLOWED_ORIGIN", "http://192.168.1.162:3000")
    get_settings.cache_clear()

    client = _client(monkeypatch)
    response = client.options(
        "/api/dashboard",
        headers={
            "Origin": "http://192.168.1.162:3000",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "authorization,content-type",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://192.168.1.162:3000"
