from __future__ import annotations

from dataclasses import dataclass
from datetime import date

from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.models.domain import (
    ActionItem,
    ActivityEvent,
    Debt,
    IncomePlan,
    IncomePlanAllocation,
    Merchant,
    Obligation,
    PlannerDraft,
    ProgressSnapshot,
    Reserve,
    RoadmapGoal,
    RoadmapItem,
    RoadmapStep,
    StrategyDocument,
    Task,
    Transaction,
)
from app.models.enums import DebtStatus


@dataclass(slots=True)
class PlanningResetService:
    db: Session
    owner_id: str

    def relaunch(self) -> None:
        for model in (
            IncomePlanAllocation,
            IncomePlan,
            ActivityEvent,
            ProgressSnapshot,
            RoadmapStep,
            RoadmapGoal,
            ActionItem,
            Task,
            RoadmapItem,
            StrategyDocument,
            PlannerDraft,
            Transaction,
            Merchant,
            Reserve,
        ):
            self.db.execute(delete(model).where(model.owner_id == self.owner_id))

        today = date.today()
        obligations = self.db.query(Obligation).filter(Obligation.owner_id == self.owner_id, Obligation.is_paid.is_(False)).all()
        debts = self.db.query(Debt).filter(Debt.owner_id == self.owner_id, Debt.status == DebtStatus.active).all()

        for obligation in obligations:
            self.db.add(
                ActionItem(
                    owner_id=self.owner_id,
                    title=f"Pay {obligation.name}",
                    status="todo",
                    lane="do_now" if obligation.due_on <= today else "this_week",
                    source="system",
                    due_on=obligation.due_on,
                    linked_type="obligation",
                    linked_id=obligation.id,
                )
            )
        for debt in debts:
            self.db.add(
                ActionItem(
                    owner_id=self.owner_id,
                    title=f"Pay {debt.name} minimum",
                    status="todo",
                    lane="this_week",
                    source="system",
                    due_on=debt.due_on,
                    linked_type="debt",
                    linked_id=debt.id,
                )
            )

        self.db.add(
            ProgressSnapshot(
                owner_id=self.owner_id,
                snapshot_date=today,
                free_now=0,
                free_after_planned_income=0,
                total_debt=sum(float(item.balance) for item in debts),
                overdue_count=sum(1 for item in obligations if item.due_on < today),
                completed_actions=0,
                goal_completion_rate=0,
            )
        )
        self.db.add(
            ActivityEvent(
                owner_id=self.owner_id,
                event_type="relaunch",
                title="Planning memory reset",
                detail="Preserved accounts, debts, obligations, income entries, and income sources. Cleared planning history for a fresh start.",
                payload={"preserved": ["accounts", "debts", "obligations", "income_entries", "income_sources"]},
            )
        )
        self.db.commit()
