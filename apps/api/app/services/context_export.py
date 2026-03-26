from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone

from sqlalchemy.exc import ProgrammingError
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


def _is_missing_relation_error(error: ProgrammingError) -> bool:
    return "does not exist" in str(error).lower()


@dataclass(slots=True)
class ContextExportService:
    db: Session
    owner_id: str

    def _safe_query_all(self, model, *filters, order_by=None):
        try:
            query = self.db.query(model)
            for item in filters:
                query = query.filter(item)
            if order_by is not None:
                if isinstance(order_by, (list, tuple)):
                    query = query.order_by(*order_by)
                else:
                    query = query.order_by(order_by)
            return query.all()
        except ProgrammingError as error:
            if _is_missing_relation_error(error):
                self.db.rollback()
                return []
            raise

    def build(self) -> ContextExportPayload:
        settings = {
            row.key: row.value
            for row in self._safe_query_all(AppSetting, AppSetting.owner_id == self.owner_id)
        }
        accounts = self._safe_query_all(Account, Account.owner_id == self.owner_id, order_by=Account.created_at.asc())
        debts = self._safe_query_all(Debt, Debt.owner_id == self.owner_id, order_by=Debt.created_at.asc())
        obligations = self._safe_query_all(Obligation, Obligation.owner_id == self.owner_id, order_by=Obligation.created_at.asc())
        expected_income_entries = self._safe_query_all(
            IncomeEntry,
            IncomeEntry.owner_id == self.owner_id,
            IncomeEntry.status == IncomeStatus.expected,
            order_by=[IncomeEntry.expected_on.asc().nulls_last(), IncomeEntry.created_at.asc()],
        )
        expense_transactions = self._safe_query_all(
            Transaction,
            Transaction.owner_id == self.owner_id,
            Transaction.kind == TransactionKind.expense,
            order_by=[Transaction.occurred_on.desc(), Transaction.created_at.desc()],
        )
        actions = self._safe_query_all(ActionItem, ActionItem.owner_id == self.owner_id, order_by=ActionItem.created_at.asc())
        roadmap_goals = self._safe_query_all(RoadmapGoal, RoadmapGoal.owner_id == self.owner_id, order_by=RoadmapGoal.created_at.asc())
        roadmap_steps = self._safe_query_all(RoadmapStep, RoadmapStep.owner_id == self.owner_id, order_by=RoadmapStep.created_at.asc())
        income_plans = self._safe_query_all(IncomePlan, IncomePlan.owner_id == self.owner_id, order_by=IncomePlan.created_at.asc())
        income_plan_allocations = self._safe_query_all(
            IncomePlanAllocation,
            IncomePlanAllocation.owner_id == self.owner_id,
            order_by=IncomePlanAllocation.created_at.asc(),
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
