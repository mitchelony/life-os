from fastapi.testclient import TestClient

from app.core.config import get_settings
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


def test_unknown_auth_strategy_fails_closed(monkeypatch) -> None:
    monkeypatch.setenv("AUTH_STRATEGY", "supabase")
    get_settings.cache_clear()

    try:
        get_owner_id("test-owner-token")
    except Exception as exc:
        assert getattr(exc, "status_code", None) == 503
        assert "not configured" in str(getattr(exc, "detail", ""))
    else:
        raise AssertionError("Expected get_owner_id() to fail for unsupported auth strategies")
