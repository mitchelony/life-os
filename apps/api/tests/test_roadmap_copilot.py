from datetime import date, timedelta

from fastapi.testclient import TestClient

from app.core.database import get_db
from app.core.deps import get_owner_id
from app.main import create_app
from app.models.domain import Account, Debt, IncomeEntry, Obligation, PlannerDraft, Transaction
from app.schemas.domain import RoadmapImportV2Payload


def _use_heuristic_planner(monkeypatch) -> None:
    from app.services.roadmap_ai_planner import HeuristicRoadmapPlanner

    monkeypatch.setattr("app.services.roadmap_copilot.build_roadmap_planner", lambda: HeuristicRoadmapPlanner())


def _client(db_session, monkeypatch, owner_id: str) -> TestClient:
    monkeypatch.setattr("app.main.init_db", lambda: None)
    app = create_app()
    app.dependency_overrides[get_db] = lambda: db_session
    app.dependency_overrides[get_owner_id] = lambda: owner_id
    return TestClient(app)


def _seed_owner_context(db_session, owner_id: str) -> None:
    today = date.today()
    db_session.add_all(
        [
            Account(owner_id=owner_id, name="Checking", type="checking", balance=1500),
            Obligation(owner_id=owner_id, name="Rent", amount=825, due_on=today + timedelta(days=2), is_paid=False),
            Debt(owner_id=owner_id, name="Capital One", balance=640, minimum_payment=45, due_on=today + timedelta(days=4), status="active"),
            IncomeEntry(owner_id=owner_id, source_name="Payroll", amount=1200, status="expected", expected_on=today + timedelta(days=5)),
        ]
    )
    db_session.commit()


def test_copilot_draft_persists_a_server_owned_planning_proposal(db_session, monkeypatch) -> None:
    owner_id = "owner-copilot-draft"
    _seed_owner_context(db_session, owner_id)
    _use_heuristic_planner(monkeypatch)
    client = _client(db_session, monkeypatch, owner_id)

    response = client.post("/api/roadmap/copilot/draft", json={"message": "I need a paycheck-first plan that covers rent and stops the slide."})

    assert response.status_code == 200
    body = response.json()
    assert body["draft_id"]
    assert body["summary"]
    assert body["payload"]["version"] == 2
    assert body["payload"]["reset_planning_first"] is True
    assert body["payload"]["expected_income_entries"] == []
    assert any("ledger truth" in warning.lower() for warning in body["warnings"])
    assert len(body["preview"]["goals"]) >= 1
    assert len(body["preview"]["actions"]) >= 1

    drafts = db_session.query(PlannerDraft).filter(PlannerDraft.owner_id == owner_id).all()
    assert len(drafts) == 1
    assert drafts[0].status == "draft"


def test_copilot_draft_persists_model_generated_output_when_a_planner_client_is_available(db_session, monkeypatch) -> None:
    from app.services.roadmap_ai_planner import RoadmapAiPlannerOutput

    owner_id = "owner-copilot-model"
    _seed_owner_context(db_session, owner_id)

    class FakePlanner:
        def plan(self, *, message, context, snapshot):
            assert "utilities" in message.lower()
            assert context.expected_income_entries
            assert snapshot.roadmap_summary is not None
            return RoadmapAiPlannerOutput(
                summary="Model-backed plan keeps utilities first.",
                rationale="The provider elevated utilities ahead of the next paycheck allocations.",
                warnings=["Model planner generated this draft."],
                payload=RoadmapImportV2Payload(
                    version=2,
                    reset_planning_first=True,
                    goals=[],
                    income_plans=[],
                    cash_reserves=[],
                    expected_income_entries=[],
                    obligations=[],
                    debts=[],
                    actions=[],
                ),
            )

    monkeypatch.setattr("app.services.roadmap_copilot.build_roadmap_planner", lambda: FakePlanner())
    client = _client(db_session, monkeypatch, owner_id)

    response = client.post("/api/roadmap/copilot/draft", json={"message": "Put utilities first this month."})

    assert response.status_code == 200
    body = response.json()
    assert body["summary"] == "Model-backed plan keeps utilities first."
    assert body["rationale"] == "The provider elevated utilities ahead of the next paycheck allocations."
    assert "Model planner generated this draft." in body["warnings"]
    assert any("ledger truth" in warning.lower() for warning in body["warnings"])


def test_copilot_revise_supersedes_the_previous_draft(db_session, monkeypatch) -> None:
    owner_id = "owner-copilot-revise"
    _seed_owner_context(db_session, owner_id)
    _use_heuristic_planner(monkeypatch)
    client = _client(db_session, monkeypatch, owner_id)

    first = client.post("/api/roadmap/copilot/draft", json={"message": "Make a plan for the next paycheck."})
    first_draft_id = first.json()["draft_id"]

    response = client.post(
        "/api/roadmap/copilot/revise",
        json={"draft_id": first_draft_id, "revision_note": "Put the buffer lower for now and focus on utilities first."},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["draft_id"] != first_draft_id
    assert "utilities" in body["summary"].lower() or "utilities" in body["rationale"].lower()

    drafts = db_session.query(PlannerDraft).filter(PlannerDraft.owner_id == owner_id).order_by(PlannerDraft.created_at.asc()).all()
    assert [draft.status for draft in drafts] == ["superseded", "draft"]


def test_copilot_approve_imports_the_persisted_payload_without_clearing_income_entries(db_session, monkeypatch) -> None:
    owner_id = "owner-copilot-approve"
    _seed_owner_context(db_session, owner_id)
    _use_heuristic_planner(monkeypatch)
    client = _client(db_session, monkeypatch, owner_id)

    draft = client.post("/api/roadmap/copilot/draft", json={"message": "Build the next-money plan."}).json()

    response = client.post("/api/roadmap/copilot/approve", json={"draft_id": draft["draft_id"]})

    assert response.status_code == 200
    body = response.json()
    assert body["draft"]["status"] == "approved"
    assert body["import_result"]["goals_created"] >= 1
    assert db_session.query(IncomeEntry).filter(IncomeEntry.owner_id == owner_id).count() == 1


def test_copilot_deny_clears_the_current_draft_without_changing_planning_state(db_session, monkeypatch) -> None:
    owner_id = "owner-copilot-deny"
    _seed_owner_context(db_session, owner_id)
    _use_heuristic_planner(monkeypatch)
    client = _client(db_session, monkeypatch, owner_id)

    draft = client.post("/api/roadmap/copilot/draft", json={"message": "Give me a plan."}).json()
    deny = client.post("/api/roadmap/copilot/deny", json={"draft_id": draft["draft_id"]})
    current = client.get("/api/roadmap/copilot/current")

    assert deny.status_code == 200
    assert deny.json()["draft"] is None
    assert current.status_code == 200
    assert current.json()["draft"] is None
    stored = db_session.query(PlannerDraft).filter(PlannerDraft.owner_id == owner_id).one()
    assert stored.status == "denied"


def test_copilot_deny_is_idempotent_for_an_inactive_draft(db_session, monkeypatch) -> None:
    owner_id = "owner-copilot-deny-idempotent"
    _seed_owner_context(db_session, owner_id)
    _use_heuristic_planner(monkeypatch)
    client = _client(db_session, monkeypatch, owner_id)

    draft = client.post("/api/roadmap/copilot/draft", json={"message": "Give me a plan."}).json()

    first = client.post("/api/roadmap/copilot/deny", json={"draft_id": draft["draft_id"]})
    second = client.post("/api/roadmap/copilot/deny", json={"draft_id": draft["draft_id"]})

    assert first.status_code == 200
    assert first.json()["draft"] is None
    assert second.status_code == 200
    assert second.json()["draft"] is None
    stored = db_session.query(PlannerDraft).filter(PlannerDraft.owner_id == owner_id).one()
    assert stored.status == "denied"


def test_copilot_emergency_expense_records_a_real_transaction_and_returns_a_fresh_draft(db_session, monkeypatch) -> None:
    owner_id = "owner-copilot-emergency"
    _seed_owner_context(db_session, owner_id)
    _use_heuristic_planner(monkeypatch)
    client = _client(db_session, monkeypatch, owner_id)

    response = client.post(
        "/api/roadmap/copilot/emergency-expense",
        json={
            "message": "A car repair hit today. Rework the roadmap around it.",
            "amount": 275,
            "title": "Emergency car repair",
            "merchant_or_source": "City Garage",
            "category": "Auto",
            "account": "Checking",
            "date": date.today().isoformat(),
            "notes": "Had to pay immediately.",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["quick_add"]["transaction_id"]
    assert body["draft"]["draft_id"]
    assert db_session.query(Transaction).filter(Transaction.owner_id == owner_id).count() == 1
