import json
from datetime import date, datetime

import httpx

from app.core.config import Settings
from app.schemas.domain import (
    ActionItemRead,
    ContextExportAllowedValues,
    ContextExportPayload,
    DecisionActionRead,
    DecisionFocus,
    DecisionSnapshot,
    FreeCashAmount,
    IncomeEntryRead,
    ProgressSummary,
    RecentUpdate,
    RoadmapGoalSummary,
    RoadmapImportV2Payload,
)
from app.services.roadmap_ai_planner import (
    AdaptiveRoadmapPlanner,
    OpenAIResponsesRoadmapPlannerClient,
    RoadmapAiPlannerOutput,
    build_roadmap_planner,
)


def _empty_payload() -> RoadmapImportV2Payload:
    return RoadmapImportV2Payload(
        version=2,
        reset_planning_first=True,
        goals=[],
        income_plans=[],
        cash_reserves=[],
        expected_income_entries=[],
        obligations=[],
        debts=[],
        actions=[],
    )


def _context_payload() -> ContextExportPayload:
    return ContextExportPayload(
        exported_at=datetime(2026, 3, 27, 12, 0, 0),
        owner_id="owner-1",
        settings={"protected_buffer": "300"},
        accounts=[],
        debts=[],
        obligations=[],
        expected_income_entries=[],
        expense_transactions=[],
        actions=[],
        roadmap_goals=[],
        roadmap_steps=[],
        income_plans=[],
        income_plan_allocations=[],
        allowed_values=ContextExportAllowedValues(),
    )


def _decision_snapshot() -> DecisionSnapshot:
    return DecisionSnapshot(
        generated_at=datetime(2026, 3, 27, 12, 0, 0),
        focus=DecisionFocus(primary_action=None, secondary_action=None, why_now="Rent is due soon."),
        ordered_action_queue=[],
        roadmap_summary=RoadmapGoalSummary(goals=[], plans=[]),
        cashflow_glance={
            "trailing_30_inflow": 0,
            "trailing_30_outflow": 0,
            "trailing_30_net": 0,
            "next_14_planned_inflow": 0,
            "next_14_required_outflow": 0,
            "next_income_date": None,
            "next_pressure_point": None,
        },
        recent_updates=[],
        progress_summary=ProgressSummary(
            free_now=0,
            free_after_planned_income=0,
            total_debt=0,
            overdue_count=0,
            completed_actions_7d=0,
            goal_completion_rate=0,
            seven_day={
                "direction": "steady",
                "free_now_delta": 0,
                "free_after_planned_income_delta": 0,
                "total_debt_delta": 0,
                "overdue_delta": 0,
                "completed_actions_delta": 0,
            },
            thirty_day={
                "direction": "steady",
                "free_now_delta": 0,
                "free_after_planned_income_delta": 0,
                "total_debt_delta": 0,
                "overdue_delta": 0,
                "completed_actions_delta": 0,
            },
        ),
        free_now=FreeCashAmount(amount=0, breakdown={
            "liquid_cash": 0,
            "protected_buffer": 0,
            "active_reserves": 0,
            "overdue_obligations": 0,
            "obligations_due_within_horizon": 0,
            "debt_minimums_due_within_horizon": 0,
            "essentials_reserve_within_horizon": 0,
            "reliable_income_within_horizon": 0,
            "extra_allocations_within_horizon": 0,
        }),
        free_after_planned_income=FreeCashAmount(amount=0, breakdown={
            "liquid_cash": 0,
            "protected_buffer": 0,
            "active_reserves": 0,
            "overdue_obligations": 0,
            "obligations_due_within_horizon": 0,
            "debt_minimums_due_within_horizon": 0,
            "essentials_reserve_within_horizon": 0,
            "reliable_income_within_horizon": 0,
            "extra_allocations_within_horizon": 0,
        }),
    )


def test_adaptive_planner_falls_back_to_deterministic_logic_when_the_provider_fails() -> None:
    class FailingModelClient:
        def plan(self, *, message, context, snapshot, today):
            raise RuntimeError("provider unavailable")

    class FakeHeuristicPlanner:
        def plan(self, *, message, context, snapshot):
            return RoadmapAiPlannerOutput(
                summary="Fallback draft",
                rationale="Used the deterministic planning rules.",
                warnings=[],
                payload=_empty_payload(),
            )

    planner = AdaptiveRoadmapPlanner(model_client=FailingModelClient(), fallback_planner=FakeHeuristicPlanner())

    proposal = planner.plan(
        message="Cover rent first.",
        context=_context_payload(),
        snapshot=_decision_snapshot(),
    )

    assert proposal.summary == "Fallback draft"
    assert any("fell back" in warning.lower() for warning in proposal.warnings)


def test_adaptive_planner_surfaces_quota_failures_in_the_warning() -> None:
    request = httpx.Request("POST", "https://api.openai.com/v1/responses")
    response = httpx.Response(
        429,
        request=request,
        json={
            "error": {
                "message": "You exceeded your current quota, please check your plan and billing details.",
                "type": "insufficient_quota",
                "code": "insufficient_quota",
            }
        },
    )

    class FailingModelClient:
        def plan(self, *, message, context, snapshot, today):
            raise httpx.HTTPStatusError("quota exceeded", request=request, response=response)

    class FakeHeuristicPlanner:
        def plan(self, *, message, context, snapshot):
            return RoadmapAiPlannerOutput(
                summary="Fallback draft",
                rationale="Used the deterministic planning rules.",
                warnings=[],
                payload=_empty_payload(),
            )

    planner = AdaptiveRoadmapPlanner(model_client=FailingModelClient(), fallback_planner=FakeHeuristicPlanner())

    proposal = planner.plan(
        message="Cover rent first.",
        context=_context_payload(),
        snapshot=_decision_snapshot(),
    )

    assert any("quota" in warning.lower() for warning in proposal.warnings)
    assert any("fell back" in warning.lower() for warning in proposal.warnings)


def test_adaptive_planner_surfaces_truncated_json_failures_in_the_warning() -> None:
    class FailingModelClient:
        def plan(self, *, message, context, snapshot, today):
            raise json.JSONDecodeError("Unterminated string", '{"summary":"x"', 14)

    class FakeHeuristicPlanner:
        def plan(self, *, message, context, snapshot):
            return RoadmapAiPlannerOutput(
                summary="Fallback draft",
                rationale="Used the deterministic planning rules.",
                warnings=[],
                payload=_empty_payload(),
            )

    planner = AdaptiveRoadmapPlanner(model_client=FailingModelClient(), fallback_planner=FakeHeuristicPlanner())

    proposal = planner.plan(
        message="Cover rent first.",
        context=_context_payload(),
        snapshot=_decision_snapshot(),
    )

    assert any("malformed or truncated json" in warning.lower() for warning in proposal.warnings)
    assert any("fell back" in warning.lower() for warning in proposal.warnings)


def test_adaptive_planner_backfills_income_plans_for_payment_order_drafts_when_expected_income_exists() -> None:
    class FakeModelClient:
        def plan(self, *, message, context, snapshot, today):
            return RoadmapAiPlannerOutput(
                summary="Payment-order draft",
                rationale="Focus pay order by due date.",
                warnings=[],
                payload=_empty_payload(),
            )

    class FakeHeuristicPlanner:
        def plan(self, *, message, context, snapshot):
            return RoadmapAiPlannerOutput(
                summary="Fallback",
                rationale="Fallback rationale.",
                warnings=[],
                payload=_empty_payload(),
            )

    planner = AdaptiveRoadmapPlanner(model_client=FakeModelClient(), fallback_planner=FakeHeuristicPlanner())

    context = _context_payload().model_copy(
        update={
            "expected_income_entries": [
                IncomeEntryRead(
                    id="income-1",
                    owner_id="owner-1",
                    created_at=datetime(2026, 3, 27, 8, 0, 0),
                    updated_at=datetime(2026, 3, 27, 8, 0, 0),
                    source_name="Payroll",
                    amount=1200,
                    status="expected",
                    expected_on=date(2026, 3, 29),
                    received_on=None,
                    account_id=None,
                    is_reliable=True,
                    category="paycheck",
                    linked_obligation_id=None,
                    linked_debt_id=None,
                    is_partial=False,
                    parent_income_entry_id=None,
                    notes=None,
                )
            ]
        }
    )

    proposal = planner.plan(
        message="Create the payment order for what gets paid first when paycheck lands.",
        context=context,
        snapshot=_decision_snapshot(),
    )

    assert len(proposal.payload.income_plans) == 1
    assert proposal.payload.income_plans[0].source_income_entry_id == "income-1"
    assert proposal.payload.income_plans[0].amount == 1200
    assert any("payment-order drafts always include income plan" in warning for warning in proposal.warnings)


def test_openai_responses_planner_client_parses_a_json_proposal() -> None:
    requests: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        return httpx.Response(
            200,
            json={
                "output_text": json.dumps(
                    {
                        "summary": "Model-backed draft",
                        "rationale": "The model reordered the next few moves.",
                        "warnings": ["Buffer stays protected."],
                        "payload": _empty_payload().model_dump(mode="json"),
                    }
                )
            },
        )

    http_client = httpx.Client(transport=httpx.MockTransport(handler))
    planner = OpenAIResponsesRoadmapPlannerClient(
        api_key="test-key",
        model="gpt-5-mini",
        base_url="https://api.openai.com",
        http_client=http_client,
    )

    proposal = planner.plan(
        message="Refocus the roadmap around rent.",
        context=_context_payload().model_dump(mode="json"),
        snapshot=_decision_snapshot().model_dump(mode="json"),
        today=date(2026, 3, 27),
    )

    assert proposal.summary == "Model-backed draft"
    assert proposal.warnings == ["Buffer stays protected."]
    assert requests[0].url.path == "/v1/responses"
    body = json.loads(requests[0].content.decode("utf-8"))
    assert body["model"] == "gpt-5-mini"
    assert "Refocus the roadmap around rent." in json.dumps(body)


def test_build_roadmap_planner_uses_openai_direct_when_model_and_key_are_present() -> None:
    planner = build_roadmap_planner(
        Settings(
            DEV_OWNER_TOKEN="token",
            AI_PLANNER_PROVIDER="openai",
            AI_PLANNER_MODEL="gpt-4o-mini",
            OPENAI_API_KEY="openai-test-key",
        )
    )

    assert isinstance(planner, AdaptiveRoadmapPlanner)
