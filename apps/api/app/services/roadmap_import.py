from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.models.domain import (
    ActionItem,
    ActivityEvent,
    Debt,
    IncomeEntry,
    IncomePlan,
    IncomePlanAllocation,
    Obligation,
    PlannerDraft,
    ProgressSnapshot,
    Reserve,
    RoadmapGoal,
    RoadmapItem,
    RoadmapStep,
    StrategyDocument,
    Task,
)
from app.models.enums import DebtStatus, IncomeStatus, ObligationFrequency, ReserveKind
from app.schemas.domain import RoadmapImportV2Payload, RoadmapImportV2Result


@dataclass(slots=True)
class RoadmapImportService:
    db: Session
    owner_id: str

    def import_v2(self, payload: RoadmapImportV2Payload) -> RoadmapImportV2Result:
        if payload.reset_planning_first:
            self._reset(payload)

        result = RoadmapImportV2Result()
        goal_ids: dict[str, str] = {}
        step_ids: dict[str, str] = {}
        plan_ids: dict[str, str] = {}

        created_goals: list[tuple[RoadmapGoal, object]] = []
        for goal_payload in payload.goals:
            goal = RoadmapGoal(
                owner_id=self.owner_id,
                title=goal_payload.title,
                description=goal_payload.description,
                category=goal_payload.category,
                status=goal_payload.status,
                priority=goal_payload.priority,
                target_date=goal_payload.target_date,
                target_amount=goal_payload.target_amount,
                current_amount=goal_payload.current_amount,
                blocked_reason=goal_payload.blocked_reason,
                recommended_next_step=goal_payload.recommended_next_step,
                sort_order=goal_payload.sort_order,
                depends_on_goal_ids=[],
                linked_type=goal_payload.linked_type,
                linked_id=goal_payload.linked_id,
                notes=goal_payload.notes,
            )
            self.db.add(goal)
            self.db.flush()
            goal_ids[goal_payload.temp_id] = goal.id
            created_goals.append((goal, goal_payload))
            result.goals_created += 1

        for goal, goal_payload in created_goals:
            goal.depends_on_goal_ids = [goal_ids[temp_id] for temp_id in goal_payload.depends_on_goal_temp_ids if temp_id in goal_ids]

        created_steps: list[tuple[RoadmapStep, object]] = []
        for goal_payload in payload.goals:
            goal_id = goal_ids[goal_payload.temp_id]
            for step_payload in goal_payload.steps:
                step = RoadmapStep(
                    owner_id=self.owner_id,
                    goal_id=goal_id,
                    title=step_payload.title,
                    status=step_payload.status,
                    due_on=step_payload.due_on,
                    sort_order=step_payload.sort_order,
                    amount=step_payload.amount,
                    recommended_action=step_payload.recommended_action,
                    depends_on_step_ids=[],
                    is_financial_step=step_payload.is_financial_step,
                    completed_at=step_payload.completed_at,
                    linked_type=step_payload.linked_type,
                    linked_id=step_payload.linked_id,
                    notes=step_payload.notes,
                )
                self.db.add(step)
                self.db.flush()
                step_ids[step_payload.temp_id] = step.id
                created_steps.append((step, step_payload))
                result.steps_created += 1

        for step, step_payload in created_steps:
            step.depends_on_step_ids = [step_ids[temp_id] for temp_id in step_payload.depends_on_step_temp_ids if temp_id in step_ids]

        created_plans: list[tuple[IncomePlan, object]] = []
        for plan_payload in payload.income_plans:
            plan = IncomePlan(
                owner_id=self.owner_id,
                label=plan_payload.label,
                amount=plan_payload.amount,
                expected_on=plan_payload.expected_on,
                is_reliable=plan_payload.is_reliable,
                status=plan_payload.status,
                priority=plan_payload.priority,
                rolls_up_to_goal_id=None,
                recommended_step=plan_payload.recommended_step,
                is_partial=plan_payload.is_partial,
                parent_income_plan_id=None,
                source_income_entry_id=plan_payload.source_income_entry_id,
                notes=plan_payload.notes,
            )
            self.db.add(plan)
            self.db.flush()
            plan_ids[plan_payload.temp_id] = plan.id
            created_plans.append((plan, plan_payload))
            result.income_plans_created += 1

        for plan, plan_payload in created_plans:
            if plan_payload.rolls_up_to_goal_temp_id and plan_payload.rolls_up_to_goal_temp_id in goal_ids:
                plan.rolls_up_to_goal_id = goal_ids[plan_payload.rolls_up_to_goal_temp_id]
            if plan_payload.parent_income_plan_temp_id and plan_payload.parent_income_plan_temp_id in plan_ids:
                plan.parent_income_plan_id = plan_ids[plan_payload.parent_income_plan_temp_id]

        for plan_payload in payload.income_plans:
            plan_id = plan_ids[plan_payload.temp_id]
            for allocation_payload in plan_payload.allocations:
                self.db.add(
                    IncomePlanAllocation(
                        owner_id=self.owner_id,
                        income_plan_id=plan_id,
                        label=allocation_payload.label,
                        allocation_type=allocation_payload.allocation_type,
                        amount=allocation_payload.amount,
                        percent_of_income=allocation_payload.percent_of_income,
                        sort_order=allocation_payload.sort_order,
                        is_required=allocation_payload.is_required,
                        goal_id=goal_ids.get(allocation_payload.goal_temp_id) if allocation_payload.goal_temp_id else None,
                        linked_type=allocation_payload.linked_type,
                        linked_id=allocation_payload.linked_id,
                        account_source_id=allocation_payload.account_source_id,
                        account_destination_id=allocation_payload.account_destination_id,
                        status=allocation_payload.status,
                        executed_amount=allocation_payload.executed_amount,
                        executed_on=allocation_payload.executed_on,
                        notes=allocation_payload.notes,
                    )
                )
                result.allocations_created += 1

        for reserve_payload in payload.cash_reserves:
            self.db.add(
                Reserve(
                    owner_id=self.owner_id,
                    name=reserve_payload.label,
                    amount=reserve_payload.amount,
                    kind=ReserveKind.manual,
                    is_active=True,
                    purpose_type=reserve_payload.purpose_type,
                    linked_type=reserve_payload.linked_type,
                    linked_id=reserve_payload.linked_id,
                    account_id=reserve_payload.account_id,
                    created_on=reserve_payload.created_on,
                    notes=reserve_payload.notes,
                )
            )
            result.cash_reserves_created += 1

        for income_payload in payload.expected_income_entries:
            self.db.add(
                IncomeEntry(
                    owner_id=self.owner_id,
                    source_name=income_payload.source_name,
                    amount=income_payload.amount,
                    status=IncomeStatus(income_payload.status),
                    expected_on=income_payload.expected_on,
                    received_on=income_payload.received_on,
                    account_id=income_payload.account_id,
                    is_reliable=income_payload.is_reliable,
                    category=income_payload.category,
                    linked_obligation_id=income_payload.linked_obligation_id,
                    linked_debt_id=income_payload.linked_debt_id,
                    is_partial=income_payload.is_partial,
                    parent_income_entry_id=income_payload.parent_income_entry_id,
                    notes=income_payload.notes,
                )
            )
            result.expected_income_entries_created += 1

        for obligation_payload in payload.obligations:
            self.db.add(
                Obligation(
                    owner_id=self.owner_id,
                    name=obligation_payload.name,
                    amount=obligation_payload.amount,
                    due_on=obligation_payload.due_on,
                    frequency=ObligationFrequency(obligation_payload.frequency),
                    is_paid=obligation_payload.is_paid,
                    is_recurring=obligation_payload.is_recurring,
                    is_externally_covered=obligation_payload.is_externally_covered,
                    coverage_source_label=obligation_payload.coverage_source_label,
                    minimum_due=obligation_payload.minimum_due,
                    past_due_amount=obligation_payload.past_due_amount,
                    target_payoff_date=obligation_payload.target_payoff_date,
                    notes=obligation_payload.notes,
                )
            )
            result.obligations_created += 1

        for debt_payload in payload.debts:
            self.db.add(
                Debt(
                    owner_id=self.owner_id,
                    name=debt_payload.name,
                    balance=debt_payload.balance,
                    minimum_payment=debt_payload.minimum_payment,
                    due_on=debt_payload.due_on,
                    status=DebtStatus(debt_payload.status),
                    apr=debt_payload.apr,
                    statement_balance=debt_payload.statement_balance,
                    minimum_met=debt_payload.minimum_met,
                    minimum_met_on=debt_payload.minimum_met_on,
                    available_credit=debt_payload.available_credit,
                    no_new_spend_mode=debt_payload.no_new_spend_mode,
                    notes=debt_payload.notes,
                )
            )
            result.debts_created += 1

        for action_payload in payload.actions:
            self.db.add(
                ActionItem(
                    owner_id=self.owner_id,
                    title=action_payload.title,
                    detail=action_payload.detail,
                    status=action_payload.status,
                    lane=action_payload.lane,
                    source=action_payload.source,
                    due_on=action_payload.due_on,
                    linked_type=action_payload.linked_type,
                    linked_id=action_payload.linked_id,
                )
            )
            result.actions_created += 1

        self.db.add(
            ActivityEvent(
                owner_id=self.owner_id,
                event_type="roadmap_imported",
                title="Roadmap imported",
                detail="Loaded a roadmap setup from the v2 bulk import payload.",
                payload={
                    "version": payload.version,
                    "goals_created": result.goals_created,
                    "steps_created": result.steps_created,
                    "income_plans_created": result.income_plans_created,
                    "allocations_created": result.allocations_created,
                    "cash_reserves_created": result.cash_reserves_created,
                    "expected_income_entries_created": result.expected_income_entries_created,
                    "obligations_created": result.obligations_created,
                    "debts_created": result.debts_created,
                    "actions_created": result.actions_created,
                },
            )
        )

        self.db.commit()
        return result

    def _reset(self, payload: RoadmapImportV2Payload) -> None:
        for model in (
            IncomePlanAllocation,
            IncomePlan,
            PlannerDraft,
            ActivityEvent,
            ProgressSnapshot,
            RoadmapStep,
            RoadmapGoal,
            ActionItem,
            Task,
            RoadmapItem,
            StrategyDocument,
        ):
            self.db.execute(delete(model).where(model.owner_id == self.owner_id))

        if payload.cash_reserves or payload.reset_planning_first:
            self.db.execute(delete(Reserve).where(Reserve.owner_id == self.owner_id))
        if payload.expected_income_entries or payload.reset_planning_first:
            self.db.execute(delete(IncomeEntry).where(IncomeEntry.owner_id == self.owner_id))
        if payload.obligations:
            self.db.execute(delete(Obligation).where(Obligation.owner_id == self.owner_id))
        if payload.debts:
            self.db.execute(delete(Debt).where(Debt.owner_id == self.owner_id))

        self.db.flush()
