from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.models.domain import (
    ActionItem,
    ActivityEvent,
    IncomePlan,
    IncomePlanAllocation,
    PlannerDraft,
    RoadmapGoal,
    RoadmapStep,
)
from app.schemas.domain import RoadmapImportPayload, RoadmapImportResult


@dataclass(slots=True)
class RoadmapImportService:
    db: Session
    owner_id: str

    def run(self, payload: RoadmapImportPayload) -> RoadmapImportResult:
        if payload.reset_planning_first:
            self._clear_planning_layers()

        goal_ids: dict[str, str] = {}
        income_plan_ids: dict[str, str] = {}
        steps_created = 0
        allocations_created = 0

        for goal_input in payload.goals:
            goal = RoadmapGoal(
                owner_id=self.owner_id,
                title=goal_input.title,
                description=goal_input.description,
                status=goal_input.status,
                priority=goal_input.priority,
                target_date=goal_input.target_date,
                linked_type=goal_input.linked_type,
                linked_id=goal_input.linked_id,
                metric_kind=goal_input.metric_kind,
                metric_start_value=goal_input.metric_start_value,
                metric_current_value=goal_input.metric_current_value,
                metric_target_value=goal_input.metric_target_value,
            )
            self.db.add(goal)
            self.db.flush()
            if goal_input.temp_id:
                goal_ids[goal_input.temp_id] = goal.id

            for step_input in goal_input.steps:
                self.db.add(
                    RoadmapStep(
                        owner_id=self.owner_id,
                        goal_id=goal.id,
                        title=step_input.title,
                        status=step_input.status,
                        due_on=step_input.due_on,
                        sort_order=step_input.sort_order,
                        linked_type=step_input.linked_type,
                        linked_id=step_input.linked_id,
                        notes=step_input.notes,
                    )
                )
                steps_created += 1

        for plan_input in payload.income_plans:
            plan = IncomePlan(
                owner_id=self.owner_id,
                label=plan_input.label,
                amount=plan_input.amount,
                expected_on=plan_input.expected_on,
                is_reliable=plan_input.is_reliable,
                status=plan_input.status,
                notes=plan_input.notes,
            )
            self.db.add(plan)
            self.db.flush()
            if plan_input.temp_id:
                income_plan_ids[plan_input.temp_id] = plan.id

            for allocation_input in plan_input.allocations:
                self.db.add(
                    IncomePlanAllocation(
                        owner_id=self.owner_id,
                        income_plan_id=plan.id,
                        label=allocation_input.label,
                        allocation_type=allocation_input.allocation_type,
                        amount=allocation_input.amount,
                        sort_order=allocation_input.sort_order,
                        linked_type=allocation_input.linked_type,
                        linked_id=allocation_input.linked_id,
                        notes=allocation_input.notes,
                    )
                )
                allocations_created += 1

        self.db.add(
            ActivityEvent(
                owner_id=self.owner_id,
                event_type="roadmap_imported",
                title="Roadmap imported",
                detail="Loaded goals, steps, and paycheck plans from a bulk import payload.",
                payload={
                    "version": payload.version,
                    "goals_created": len(payload.goals),
                    "income_plans_created": len(payload.income_plans),
                },
            )
        )
        self.db.commit()

        return RoadmapImportResult(
            goals_created=len(payload.goals),
            steps_created=steps_created,
            income_plans_created=len(payload.income_plans),
            allocations_created=allocations_created,
            goal_ids=goal_ids,
            income_plan_ids=income_plan_ids,
        )

    def _clear_planning_layers(self) -> None:
        for model in (IncomePlanAllocation, IncomePlan, PlannerDraft, RoadmapStep, RoadmapGoal, ActionItem):
            self.db.execute(delete(model).where(model.owner_id == self.owner_id))
        self.db.flush()
