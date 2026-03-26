from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.domain import (
    Account,
    ActionItem,
    AppSetting,
    Debt,
    IncomeEntry,
    IncomePlan,
    IncomePlanAllocation,
    Obligation,
    RoadmapGoal,
    RoadmapStep,
    Transaction,
)
from app.models.enums import AccountType, DebtStatus, IncomeStatus, ObligationFrequency, TransactionKind
from app.schemas.domain import ContextExportAllowedValues, ContextExportPayload


@dataclass(slots=True)
class ContextExportService:
    db: Session
    owner_id: str

    def build(self) -> ContextExportPayload:
        settings = {row.key: row.value for row in self.db.query(AppSetting).filter(AppSetting.owner_id == self.owner_id).all()}
        accounts = self.db.query(Account).filter(Account.owner_id == self.owner_id).order_by(Account.created_at.asc()).all()
        debts = self.db.query(Debt).filter(Debt.owner_id == self.owner_id).order_by(Debt.created_at.asc()).all()
        obligations = self.db.query(Obligation).filter(Obligation.owner_id == self.owner_id).order_by(Obligation.created_at.asc()).all()
        expected_income_entries = (
            self.db.query(IncomeEntry)
            .filter(IncomeEntry.owner_id == self.owner_id, IncomeEntry.status == IncomeStatus.expected)
            .order_by(IncomeEntry.expected_on.asc().nulls_last(), IncomeEntry.created_at.asc())
            .all()
        )
        expense_transactions = (
            self.db.query(Transaction)
            .filter(Transaction.owner_id == self.owner_id, Transaction.kind == TransactionKind.expense)
            .order_by(Transaction.occurred_on.desc(), Transaction.created_at.desc())
            .all()
        )
        actions = self.db.query(ActionItem).filter(ActionItem.owner_id == self.owner_id).order_by(ActionItem.created_at.asc()).all()
        roadmap_goals = self.db.query(RoadmapGoal).filter(RoadmapGoal.owner_id == self.owner_id).order_by(RoadmapGoal.created_at.asc()).all()
        roadmap_steps = self.db.query(RoadmapStep).filter(RoadmapStep.owner_id == self.owner_id).order_by(RoadmapStep.created_at.asc()).all()
        income_plans = self.db.query(IncomePlan).filter(IncomePlan.owner_id == self.owner_id).order_by(IncomePlan.created_at.asc()).all()
        income_plan_allocations = (
            self.db.query(IncomePlanAllocation)
            .filter(IncomePlanAllocation.owner_id == self.owner_id)
            .order_by(IncomePlanAllocation.created_at.asc())
            .all()
        )

        return ContextExportPayload(
            exported_at=datetime.now(timezone.utc),
            owner_id=self.owner_id,
            settings=settings,
            accounts=accounts,
            debts=debts,
            obligations=obligations,
            expected_income_entries=expected_income_entries,
            expense_transactions=expense_transactions,
            actions=actions,
            roadmap_goals=roadmap_goals,
            roadmap_steps=roadmap_steps,
            income_plans=income_plans,
            income_plan_allocations=income_plan_allocations,
            allowed_values=ContextExportAllowedValues(
                account_types=[item.value for item in AccountType],
                debt_statuses=[item.value for item in DebtStatus],
                obligation_frequencies=[item.value for item in ObligationFrequency],
                income_statuses=[item.value for item in IncomeStatus],
                action_statuses=["todo", "in_progress", "blocked", "done", "skipped"],
                action_lanes=["do_now", "this_week", "when_income_lands", "manual"],
                action_sources=["system", "manual", "goal"],
                roadmap_goal_statuses=["active", "planned", "blocked", "completed"],
                roadmap_goal_priorities=["low", "medium", "high", "critical"],
                roadmap_step_statuses=["todo", "in_progress", "blocked", "done"],
                income_plan_statuses=["planned", "cancelled", "received"],
                income_allocation_types=["obligation_payment", "debt_payment", "buffer", "essentials", "manual"],
            ),
        )
