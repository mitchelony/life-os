from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import date
from typing import Any, Protocol

import httpx
from pydantic import BaseModel, Field

from app.core.config import Settings, get_settings
from app.models.enums import DebtStatus
from app.schemas.domain import (
    ContextExportPayload,
    DecisionSnapshot,
    RoadmapImportV2Action,
    RoadmapImportV2AllowedValues,
    RoadmapImportV2Allocation,
    RoadmapImportV2Goal,
    RoadmapImportV2IncomePlan,
    RoadmapImportV2Payload,
    RoadmapImportV2Step,
)


def _planner_failure_warning(error: Exception) -> str:
    if isinstance(error, httpx.HTTPStatusError):
        try:
            payload = error.response.json()
        except ValueError:
            payload = {}

        details = payload.get("error") if isinstance(payload, dict) else {}
        code = details.get("code") if isinstance(details, dict) else None
        error_type = details.get("type") if isinstance(details, dict) else None

        if code == "insufficient_quota" or error_type == "insufficient_quota":
            return "OpenAI quota is unavailable right now, so the copilot fell back to deterministic planning rules."

        message = details.get("message") if isinstance(details, dict) else None
        if isinstance(message, str) and message.strip():
            return f"Model planner failed: {message.strip()}"

    if isinstance(error, httpx.TimeoutException):
        return "Model planner timed out, so the copilot fell back to deterministic planning rules."

    return "Model planner was unavailable, so the copilot fell back to deterministic planning rules."


def _contains_term(value: str, *terms: str) -> bool:
    normalized = value.lower()
    return any(term in normalized for term in terms)


def _enum_value(value: Any) -> str:
    return getattr(value, "value", value)


class RoadmapAiPlannerOutput(BaseModel):
    summary: str
    rationale: str
    warnings: list[str] = Field(default_factory=list)
    payload: RoadmapImportV2Payload


class RoadmapModelPlannerClient(Protocol):
    def plan(self, *, message: str, context: dict[str, Any], snapshot: dict[str, Any], today: date) -> RoadmapAiPlannerOutput: ...


class RoadmapPlanner(Protocol):
    def plan(self, *, message: str, context: ContextExportPayload, snapshot: DecisionSnapshot) -> RoadmapAiPlannerOutput: ...


def _allow_income_rewrite(message: str) -> bool:
    normalized = message.lower()
    mentions_income = any(term in normalized for term in ("income", "paycheck", "salary", "pay day", "payday"))
    mentions_change = any(term in normalized for term in ("change", "update", "replace", "rewrite", "adjust"))
    return mentions_income and mentions_change


def _normalize_model_output(proposal: RoadmapAiPlannerOutput, *, message: str) -> RoadmapAiPlannerOutput:
    payload = proposal.payload.model_copy(
        update={
            "version": 2,
            "reset_planning_first": True,
            "expected_income_entries": proposal.payload.expected_income_entries if _allow_income_rewrite(message) else [],
        }
    )
    return proposal.model_copy(update={"payload": payload})


@dataclass(slots=True)
class AdaptiveRoadmapPlanner:
    model_client: RoadmapModelPlannerClient
    fallback_planner: RoadmapPlanner

    def plan(self, *, message: str, context: ContextExportPayload, snapshot: DecisionSnapshot) -> RoadmapAiPlannerOutput:
        try:
            proposal = self.model_client.plan(
                message=message,
                context=context.model_dump(mode="json"),
                snapshot=snapshot.model_dump(mode="json"),
                today=date.today(),
            )
        except Exception as error:
            fallback = self.fallback_planner.plan(message=message, context=context, snapshot=snapshot)
            return fallback.model_copy(
                update={
                    "warnings": [
                        *fallback.warnings,
                        _planner_failure_warning(error),
                    ]
                }
            )

        return _normalize_model_output(proposal, message=message)


@dataclass(slots=True)
class HeuristicRoadmapPlanner:
    def plan(self, *, message: str, context: ContextExportPayload, snapshot: DecisionSnapshot) -> RoadmapAiPlannerOutput:
        today = date.today()
        normalized_message = message.strip()

        obligations = sorted(
            [item for item in context.obligations if not item.is_paid],
            key=lambda item: (item.due_on or today, item.amount),
        )
        active_debts = sorted(
            [item for item in context.debts if _enum_value(item.status) == DebtStatus.active.value],
            key=lambda item: (item.due_on or today, item.minimum_payment or 0),
        )
        expected_income = sorted(
            [item for item in context.expected_income_entries if _enum_value(item.status) == "expected"],
            key=lambda item: (item.expected_on or today, -item.amount),
        )

        warnings: list[str] = []
        if snapshot.free_now.amount < 0:
            warnings.append(f"Available now is below zero at ${abs(snapshot.free_now.amount):.2f}.")
        if not expected_income:
            warnings.append("No expected income is on the calendar, so the plan stays cash-tight.")
        if obligations and obligations[0].due_on and obligations[0].due_on <= today:
            warnings.append(f"{obligations[0].name} is already due.")

        goals: list[RoadmapImportV2Goal] = []
        actions: list[RoadmapImportV2Action] = []

        if obligations:
            goal_steps = [
                RoadmapImportV2Step(
                    temp_id=f"step-obligation-{index}",
                    title=f"Cover {item.name}",
                    status="todo",
                    due_on=item.due_on,
                    sort_order=index,
                    amount=item.amount,
                    recommended_action=f"Pay {item.name} before lower-priority moves.",
                    linked_type="obligation",
                    linked_id=item.id,
                    notes=item.notes,
                )
                for index, item in enumerate(obligations[:3])
            ]
            goals.append(
                RoadmapImportV2Goal(
                    temp_id="goal-obligations",
                    title="Stabilize the next required bills",
                    description="Cover the most urgent obligations before discretionary moves.",
                    category="finances",
                    status="active",
                    priority="critical",
                    target_date=goal_steps[0].due_on if goal_steps else None,
                    recommended_next_step=goal_steps[0].title if goal_steps else None,
                    linked_type="obligation",
                    linked_id=obligations[0].id,
                    steps=goal_steps,
                )
            )
            actions.extend(
                RoadmapImportV2Action(
                    title=f"Pay {item.name}",
                    detail="Keep required bills ahead of lower-priority moves.",
                    lane="do_now" if item.due_on and item.due_on <= today else "this_week",
                    source="system",
                    due_on=item.due_on,
                    linked_type="obligation",
                    linked_id=item.id,
                )
                for item in obligations[:2]
            )

        if active_debts:
            debt_steps = [
                RoadmapImportV2Step(
                    temp_id=f"step-debt-{index}",
                    title=f"Pay {item.name} minimum",
                    status="todo",
                    due_on=item.due_on,
                    sort_order=index,
                    amount=item.minimum_payment,
                    recommended_action="Keep the minimum current before extra paydown.",
                    linked_type="debt",
                    linked_id=item.id,
                    notes=item.notes,
                )
                for index, item in enumerate(active_debts[:2])
            ]
            goals.append(
                RoadmapImportV2Goal(
                    temp_id="goal-debts",
                    title="Keep debt minimums current",
                    description="Protect the next few due dates before aiming for faster paydown.",
                    category="finances",
                    status="planned",
                    priority="high",
                    target_date=debt_steps[0].due_on if debt_steps else None,
                    recommended_next_step=debt_steps[0].title if debt_steps else None,
                    linked_type="debt",
                    linked_id=active_debts[0].id,
                    steps=debt_steps,
                )
            )
            actions.append(
                RoadmapImportV2Action(
                    title=f"Pay {active_debts[0].name} minimum",
                    detail="Keep the minimum current before extras.",
                    lane="this_week",
                    source="system",
                    due_on=active_debts[0].due_on,
                    linked_type="debt",
                    linked_id=active_debts[0].id,
                )
            )

        wants_buffer = _contains_term(normalized_message, "buffer", "reserve", "savings")
        mentions_utilities = _contains_term(normalized_message, "utilities", "utility")
        mentions_emergency = _contains_term(normalized_message, "emergency", "repair", "urgent")

        if wants_buffer or snapshot.free_after_planned_income.amount > 0:
            goals.append(
                RoadmapImportV2Goal(
                    temp_id="goal-buffer",
                    title="Rebuild buffer after the must-pay items",
                    description="Protect a little flexibility once required bills are covered.",
                    category="finances",
                    status="planned",
                    priority="medium",
                    recommended_next_step="Reserve part of the next reliable income.",
                    linked_type="manual",
                    linked_id=None,
                    steps=[
                        RoadmapImportV2Step(
                            temp_id="step-buffer",
                            title="Reserve part of the next reliable income",
                            status="todo",
                            sort_order=0,
                            amount=max(round(snapshot.free_after_planned_income.amount * 0.25, 2), 50) if snapshot.free_after_planned_income.amount > 0 else 50,
                            recommended_action="Create a small buffer move after the urgent bills.",
                            linked_type="manual",
                            linked_id=None,
                        )
                    ],
                )
            )

        if mentions_utilities:
            actions.insert(
                0,
                RoadmapImportV2Action(
                    title="Put utilities at the front of the next plan",
                    detail="Revision request: utilities first.",
                    lane="do_now",
                    source="manual",
                ),
            )
        if mentions_emergency:
            actions.insert(
                0,
                RoadmapImportV2Action(
                    title="Rework this week around the emergency hit",
                    detail="Protect required bills after the new emergency spend.",
                    lane="do_now",
                    source="manual",
                ),
            )

        income_plans: list[RoadmapImportV2IncomePlan] = []
        if expected_income:
            next_income = expected_income[0]
            remaining = float(next_income.amount)
            allocations: list[RoadmapImportV2Allocation] = []
            allocation_index = 0

            for item in obligations[:2]:
                amount = min(remaining, float(item.amount))
                if amount <= 0:
                    break
                allocations.append(
                    RoadmapImportV2Allocation(
                        temp_id=f"alloc-obligation-{allocation_index}",
                        label=f"{item.name} payment",
                        allocation_type="obligation_payment",
                        amount=round(amount, 2),
                        sort_order=allocation_index,
                        is_required=True,
                        linked_type="obligation",
                        linked_id=item.id,
                        status="planned",
                    )
                )
                allocation_index += 1
                remaining -= amount

            for item in active_debts[:1]:
                amount = min(remaining, float(item.minimum_payment))
                if amount <= 0:
                    break
                allocations.append(
                    RoadmapImportV2Allocation(
                        temp_id=f"alloc-debt-{allocation_index}",
                        label=f"{item.name} minimum",
                        allocation_type="debt_payment",
                        amount=round(amount, 2),
                        sort_order=allocation_index,
                        is_required=True,
                        linked_type="debt",
                        linked_id=item.id,
                        status="planned",
                    )
                )
                allocation_index += 1
                remaining -= amount

            if remaining > 0:
                buffer_amount = remaining if remaining < 150 else min(remaining, max(round(float(next_income.amount) * 0.15, 2), 75))
                allocations.append(
                    RoadmapImportV2Allocation(
                        temp_id=f"alloc-buffer-{allocation_index}",
                        label="Buffer move",
                        allocation_type="buffer",
                        amount=round(buffer_amount, 2),
                        sort_order=allocation_index,
                        is_required=False,
                        linked_type="manual",
                        linked_id=None,
                        status="planned",
                    )
                )
                remaining -= buffer_amount

            income_plans.append(
                RoadmapImportV2IncomePlan(
                    temp_id="plan-next-income",
                    label=f"Next income from {next_income.source_name}",
                    amount=float(next_income.amount),
                    expected_on=next_income.expected_on,
                    is_reliable=bool(next_income.is_reliable),
                    status="planned",
                    priority="critical",
                    recommended_step=goals[0].recommended_next_step if goals else "Protect the next urgent bill.",
                    remaining_unallocated_amount=round(max(remaining, 0), 2),
                    source_income_entry_id=next_income.id,
                    notes="Copilot replacement draft",
                    allocations=allocations,
                )
            )

        payload = RoadmapImportV2Payload(
            version=2,
            reset_planning_first=True,
            goals=goals,
            income_plans=income_plans,
            cash_reserves=[],
            expected_income_entries=[],
            obligations=[],
            debts=[],
            actions=actions,
            allowed_values=RoadmapImportV2AllowedValues(
                goal_categories=["finances", "school", "career", "admin", "health", "personal"],
                goal_statuses=["active", "planned", "blocked", "completed"],
                goal_priorities=["low", "medium", "high", "critical"],
                step_statuses=["todo", "in_progress", "blocked", "done"],
                linked_types=["obligation", "debt", "income", "manual", "account"],
                income_plan_statuses=["planned", "cancelled", "received"],
                income_allocation_types=["obligation_payment", "debt_payment", "buffer", "essentials", "manual"],
                allocation_statuses=["planned", "reserved", "paid", "skipped", "changed"],
                cash_reserve_purpose_types=["taxes", "buffer", "debt", "utilities", "essentials", "custom"],
                income_statuses=["expected", "received", "missed"],
                income_categories=["paycheck", "side_gig", "refund", "family_support", "scholarship", "other"],
                obligation_frequencies=["one_time", "weekly", "biweekly", "monthly", "yearly"],
                debt_statuses=["active", "paused", "paid_off"],
                action_statuses=["todo", "in_progress", "blocked", "done", "skipped"],
                action_lanes=["do_now", "this_week", "when_income_lands", "manual"],
                action_sources=["system", "manual", "goal"],
            ),
        )

        primary_pressure = obligations[0].name if obligations else (active_debts[0].name if active_debts else "the next cash move")
        summary = f"Refocus the roadmap around {primary_pressure} and the next reliable income."
        if mentions_utilities:
            summary = "Refocus the roadmap around utilities first while keeping the required bills current."
        elif mentions_emergency:
            summary = "Refocus the roadmap around the new emergency expense while keeping required bills covered."

        rationale_parts = []
        if obligations:
            rationale_parts.append(f"{len(obligations)} open obligation(s) need attention.")
        if active_debts:
            rationale_parts.append(f"{len(active_debts)} active debt minimum(s) still need coverage.")
        if expected_income:
            rationale_parts.append(f"The next expected income is {expected_income[0].source_name} for ${float(expected_income[0].amount):.2f}.")
        if normalized_message:
            rationale_parts.append(f"User context: {normalized_message}")
        rationale = " ".join(rationale_parts) or "The plan keeps the roadmap centered on the next required move."

        return RoadmapAiPlannerOutput(
            summary=summary,
            rationale=rationale,
            warnings=warnings,
            payload=payload,
        )


@dataclass(slots=True)
class OpenAIResponsesRoadmapPlannerClient:
    api_key: str
    model: str
    base_url: str = "https://api.openai.com"
    timeout_seconds: float = 25.0
    max_output_tokens: int = 4000
    http_client: httpx.Client | None = None

    def plan(self, *, message: str, context: dict[str, Any], snapshot: dict[str, Any], today: date) -> RoadmapAiPlannerOutput:
        request_body = {
            "model": self.model,
            "input": [
                {
                    "role": "system",
                    "content": [
                        {
                            "type": "input_text",
                            "text": self._system_prompt(),
                        }
                    ],
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "input_text",
                            "text": self._user_prompt(message=message, context=context, snapshot=snapshot, today=today),
                        }
                    ],
                },
            ],
            "text": {"format": {"type": "json_object"}},
            "max_output_tokens": self.max_output_tokens,
        }

        client = self.http_client or httpx.Client(timeout=self.timeout_seconds)
        close_client = self.http_client is None
        try:
            response = client.post(
                f"{self.base_url.rstrip('/')}/v1/responses",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json=request_body,
            )
            response.raise_for_status()
            payload = response.json()
        finally:
            if close_client:
                client.close()

        parsed = self._extract_json(payload)
        return RoadmapAiPlannerOutput.model_validate(parsed)

    @staticmethod
    def _system_prompt() -> str:
        return (
            "You are the Life OS roadmap copilot for a private single-user finance app. "
            "You are drafting advisory planning changes only. "
            "Never invent bank activity, never silently mutate ledger truth, and keep the plan conservative. "
            "Prioritize overdue obligations, upcoming obligations, debt minimums, and preserving a cash buffer. "
            "Return JSON only."
        )

    @staticmethod
    def _user_prompt(*, message: str, context: dict[str, Any], snapshot: dict[str, Any], today: date) -> str:
        schema = RoadmapAiPlannerOutput.model_json_schema()
        return (
            f"Today is {today.isoformat()}.\n"
            f"User message:\n{message.strip()}\n\n"
            "Hard rules:\n"
            "- Return a complete replacement planning payload in roadmap import schema v2.\n"
            "- Keep reset_planning_first true.\n"
            "- Preserve expected income entries by default unless the user explicitly asks to rewrite income planning.\n"
            "- Keep top-level obligations and debts empty unless the user explicitly asks to replace those planning records.\n"
            "- Keep summary and rationale short and plain.\n\n"
            f"Response schema:\n{json.dumps(schema, indent=2)}\n\n"
            f"Planning context:\n{json.dumps(context, indent=2)}\n\n"
            f"Decision snapshot:\n{json.dumps(snapshot, indent=2)}"
        )

    @staticmethod
    def _extract_json(payload: dict[str, Any]) -> dict[str, Any]:
        if isinstance(payload.get("output_text"), str) and payload["output_text"].strip():
            return json.loads(payload["output_text"])

        for item in payload.get("output", []):
            for content in item.get("content", []):
                text = content.get("text")
                if isinstance(text, str) and text.strip():
                    return json.loads(text)

        raise RuntimeError("Provider response did not include JSON output text.")


def build_roadmap_planner(settings: Settings | None = None) -> RoadmapPlanner:
    settings = settings or get_settings()
    heuristic = HeuristicRoadmapPlanner()
    if settings.ai_planner_provider.lower() not in {"openai", "openai_compatible"}:
        return heuristic

    api_key = settings.ai_planner_api_key or settings.openai_api_key
    if not api_key or not settings.ai_planner_model:
        return heuristic

    return AdaptiveRoadmapPlanner(
        model_client=OpenAIResponsesRoadmapPlannerClient(
            api_key=api_key,
            model=settings.ai_planner_model,
            base_url=settings.ai_planner_base_url,
            timeout_seconds=settings.ai_planner_timeout_seconds,
            max_output_tokens=settings.ai_planner_max_output_tokens,
        ),
        fallback_planner=heuristic,
    )
