from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models.domain import (
    Account,
    ActionItem,
    ActivityEvent,
    AppSetting,
    Debt,
    IncomeEntry,
    IncomePlan,
    IncomePlanAllocation,
    Obligation,
    ProgressSnapshot,
    Reserve,
    RoadmapGoal,
    RoadmapStep,
    Transaction,
)
from app.models.enums import DebtStatus, IncomeStatus, TransactionKind
from app.schemas.domain import (
    CashflowGlance,
    DecisionActionRead,
    DecisionFocus,
    DecisionSnapshot,
    FreeCashAmount,
    FreeCashBreakdown,
    ProgressTrend,
    ProgressSummary,
    RecentUpdate,
    RoadmapGoalRead,
    RoadmapGoalSummary,
    RoadmapPlanAllocationRead,
    RoadmapPlanRead,
)


def _money(value: float) -> float:
    return round(float(value), 2)


def _start_of_today() -> date:
    return date.today()


def _setting(settings: dict[str, str], key: str) -> float:
    try:
        return float(settings.get(key, "0") or 0)
    except ValueError:
        return 0.0


@dataclass(slots=True)
class DecisionEngineService:
    db: Session
    owner_id: str

    def build(self) -> DecisionSnapshot:
        accounts = self.db.query(Account).filter(Account.owner_id == self.owner_id, Account.is_active.is_(True)).all()
        obligations = self.db.query(Obligation).filter(Obligation.owner_id == self.owner_id).all()
        debts = self.db.query(Debt).filter(Debt.owner_id == self.owner_id).all()
        reserves = self.db.query(Reserve).filter(Reserve.owner_id == self.owner_id, Reserve.is_active.is_(True)).all()
        settings = {row.key: row.value for row in self.db.query(AppSetting).filter(AppSetting.owner_id == self.owner_id).all()}
        income_entries = self.db.query(IncomeEntry).filter(IncomeEntry.owner_id == self.owner_id).all()
        income_plans = self.db.query(IncomePlan).filter(IncomePlan.owner_id == self.owner_id).order_by(IncomePlan.expected_on.asc()).all()
        allocations = self.db.query(IncomePlanAllocation).filter(IncomePlanAllocation.owner_id == self.owner_id).order_by(IncomePlanAllocation.sort_order.asc()).all()
        goals = self.db.query(RoadmapGoal).filter(RoadmapGoal.owner_id == self.owner_id).order_by(RoadmapGoal.created_at.asc()).all()
        steps = self.db.query(RoadmapStep).filter(RoadmapStep.owner_id == self.owner_id).order_by(RoadmapStep.sort_order.asc()).all()
        actions = self.db.query(ActionItem).filter(ActionItem.owner_id == self.owner_id, ActionItem.is_archived.is_(False)).all()
        transactions = self.db.query(Transaction).filter(Transaction.owner_id == self.owner_id).all()
        events = (
            self.db.query(ActivityEvent)
            .filter(ActivityEvent.owner_id == self.owner_id)
            .order_by(ActivityEvent.occurred_at.desc())
            .limit(12)
            .all()
        )
        snapshots = (
            self.db.query(ProgressSnapshot)
            .filter(ProgressSnapshot.owner_id == self.owner_id)
            .order_by(ProgressSnapshot.snapshot_date.desc())
            .all()
        )

        horizon = self._planning_horizon(income_plans, income_entries, obligations, debts)
        free_now, free_after = self._free_cash(accounts, obligations, debts, reserves, settings, income_plans, allocations, horizon)
        synced_actions = self._sync_system_actions(actions, obligations, debts)
        goal_reads = self._goal_reads(goals, steps)
        roadmap = self._roadmap_summary(goal_reads, income_plans, allocations)
        action_queue = self._action_queue(synced_actions)
        focus = self._focus(action_queue)
        cashflow = self._cashflow_glance(income_plans, income_entries, obligations, debts, transactions)
        progress = self._progress_summary(free_now.amount, free_after.amount, debts, obligations, goal_reads, synced_actions, snapshots)
        recent_updates = self._recent_updates(events, synced_actions, income_entries, transactions)

        return DecisionSnapshot(
            generated_at=datetime.now(timezone.utc),
            focus=focus,
            ordered_action_queue=action_queue,
            roadmap_summary=roadmap,
            cashflow_glance=cashflow,
            recent_updates=recent_updates,
            progress_summary=progress,
            free_now=free_now,
            free_after_planned_income=free_after,
        )

    def _planning_horizon(
        self,
        income_plans: list[IncomePlan],
        income_entries: list[IncomeEntry],
        obligations: list[Obligation],
        debts: list[Debt],
    ) -> date:
        today = _start_of_today()
        reliable_income_dates = sorted(
            plan.expected_on for plan in income_plans if plan.is_reliable and plan.status != "cancelled" and plan.expected_on and plan.expected_on >= today
        )
        expected_income_dates = sorted(
            entry.expected_on for entry in income_entries if entry.status == IncomeStatus.expected and entry.expected_on and entry.expected_on >= today
        )
        combined_income_dates = sorted([*reliable_income_dates, *expected_income_dates])
        if combined_income_dates:
            return combined_income_dates[0]
        requirement_dates = sorted(
            [item.due_on for item in obligations if item.due_on >= today]
            + [item.due_on for item in debts if item.due_on and item.due_on >= today]
        )
        if requirement_dates:
            return min(today + timedelta(days=14), requirement_dates[0])
        return today + timedelta(days=14)

    def _free_cash(
        self,
        accounts: list[Account],
        obligations: list[Obligation],
        debts: list[Debt],
        reserves: list[Reserve],
        settings: dict[str, str],
        income_plans: list[IncomePlan],
        allocations: list[IncomePlanAllocation],
        horizon: date,
    ) -> tuple[FreeCashAmount, FreeCashAmount]:
        today = _start_of_today()
        liquid_cash = _money(sum(float(account.balance) for account in accounts if account.type.value in {"checking", "savings", "cash"}))
        protected_buffer = _money(_setting(settings, "protected_cash_buffer"))
        active_reserves = _money(sum(float(reserve.amount) for reserve in reserves if reserve.kind.value == "manual"))
        essentials_reserve = _money(_setting(settings, "essential_spend_target"))
        overdue_obligations = _money(sum(float(item.amount) for item in obligations if not item.is_paid and item.due_on < today))
        obligations_due = _money(sum(float(item.amount) for item in obligations if not item.is_paid and today <= item.due_on <= horizon))
        debt_minimums = _money(
            sum(float(item.minimum_payment) for item in debts if item.status == DebtStatus.active and item.due_on and today <= item.due_on <= horizon)
        )
        free_now_amount = _money(liquid_cash - protected_buffer - active_reserves - overdue_obligations - obligations_due - debt_minimums - essentials_reserve)

        reliable_income = _money(
            sum(float(plan.amount) for plan in income_plans if plan.is_reliable and plan.status != "cancelled" and plan.expected_on and today <= plan.expected_on <= horizon)
        )
        debt_lookup = {item.id: item for item in debts}
        obligation_lookup = {item.id: item for item in obligations}
        extra_allocations = 0.0
        for allocation in allocations:
            if allocation.linked_type == "obligation" and allocation.linked_id in obligation_lookup:
                continue
            if allocation.linked_type == "debt" and allocation.linked_id in debt_lookup:
                minimum = float(debt_lookup[allocation.linked_id].minimum_payment)
                extra_allocations += max(float(allocation.amount) - minimum, 0)
                continue
            extra_allocations += float(allocation.amount)
        extra_allocations = _money(extra_allocations)
        free_after_amount = _money(free_now_amount + reliable_income - extra_allocations)

        free_now = FreeCashAmount(
            amount=free_now_amount,
            breakdown=FreeCashBreakdown(
                liquid_cash=liquid_cash,
                protected_buffer=protected_buffer,
                active_reserves=active_reserves,
                overdue_obligations=overdue_obligations,
                obligations_due_within_horizon=obligations_due,
                debt_minimums_due_within_horizon=debt_minimums,
                essentials_reserve_within_horizon=essentials_reserve,
                reliable_income_within_horizon=0,
                extra_allocations_within_horizon=0,
            ),
        )
        free_after = FreeCashAmount(
            amount=free_after_amount,
            breakdown=FreeCashBreakdown(
                liquid_cash=liquid_cash,
                protected_buffer=protected_buffer,
                active_reserves=active_reserves,
                overdue_obligations=overdue_obligations,
                obligations_due_within_horizon=obligations_due,
                debt_minimums_due_within_horizon=debt_minimums,
                essentials_reserve_within_horizon=essentials_reserve,
                reliable_income_within_horizon=reliable_income,
                extra_allocations_within_horizon=extra_allocations,
            ),
        )
        return free_now, free_after

    def _sync_system_actions(self, actions: list[ActionItem], obligations: list[Obligation], debts: list[Debt]) -> list[ActionItem]:
        existing = {(action.linked_type, action.linked_id): action for action in actions if action.source == "system"}
        today = _start_of_today()
        created = list(actions)

        for obligation in obligations:
            if obligation.is_paid:
                continue
            key = ("obligation", obligation.id)
            title = f"Pay {obligation.name}"
            lane = "do_now" if obligation.due_on < today else "this_week"
            if key not in existing:
                action = ActionItem(
                    owner_id=self.owner_id,
                    title=title,
                    status="todo",
                    lane=lane,
                    source="system",
                    due_on=obligation.due_on,
                    linked_type="obligation",
                    linked_id=obligation.id,
                )
                self.db.add(action)
                created.append(action)
            else:
                existing[key].title = title
                existing[key].lane = lane
                existing[key].due_on = obligation.due_on

        for debt in debts:
            if debt.status != DebtStatus.active:
                continue
            key = ("debt", debt.id)
            title = f"Pay {debt.name} minimum"
            lane = "do_now" if debt.due_on and debt.due_on <= today + timedelta(days=3) else "this_week"
            if key not in existing:
                action = ActionItem(
                    owner_id=self.owner_id,
                    title=title,
                    status="todo",
                    lane=lane,
                    source="system",
                    due_on=debt.due_on,
                    linked_type="debt",
                    linked_id=debt.id,
                )
                self.db.add(action)
                created.append(action)
            else:
                existing[key].title = title
                existing[key].lane = lane
                existing[key].due_on = debt.due_on

        self.db.commit()
        return (
            self.db.query(ActionItem)
            .filter(ActionItem.owner_id == self.owner_id, ActionItem.is_archived.is_(False))
            .order_by(ActionItem.due_on.asc().nulls_last(), ActionItem.created_at.asc())
            .all()
        )

    def _goal_reads(self, goals: list[RoadmapGoal], steps: list[RoadmapStep]) -> list[RoadmapGoalRead]:
        steps_by_goal: dict[str, list[RoadmapStep]] = {}
        for step in steps:
            steps_by_goal.setdefault(step.goal_id, []).append(step)
        reads: list[RoadmapGoalRead] = []
        for goal in goals:
            goal_steps = steps_by_goal.get(goal.id, [])
            completed = sum(1 for step in goal_steps if step.status == "done")
            progress = _money((completed / len(goal_steps)) * 100) if goal_steps else 0
            reads.append(
                RoadmapGoalRead(
                    id=goal.id,
                    title=goal.title,
                    description=goal.description,
                    status=goal.status,
                    priority=goal.priority,
                    target_date=goal.target_date,
                    progress=progress,
                    linked_type=goal.linked_type,
                    linked_id=goal.linked_id,
                    metric_kind=goal.metric_kind,
                    metric_start_value=float(goal.metric_start_value) if goal.metric_start_value is not None else None,
                    metric_current_value=float(goal.metric_current_value) if goal.metric_current_value is not None else None,
                    metric_target_value=float(goal.metric_target_value) if goal.metric_target_value is not None else None,
                    steps=[
                        DecisionActionRead(
                            id=step.id,
                            title=step.title,
                            detail=step.notes,
                            status=step.status,
                            lane="goal_step",
                            source="goal",
                            due_on=step.due_on,
                            linked_type=step.linked_type,
                            linked_id=step.linked_id,
                        )
                        for step in goal_steps
                    ],
                )
            )
        return reads

    def _roadmap_summary(
        self,
        goals: list[RoadmapGoalRead],
        income_plans: list[IncomePlan],
        allocations: list[IncomePlanAllocation],
    ) -> RoadmapGoalSummary:
        allocation_by_plan: dict[str, list[IncomePlanAllocation]] = {}
        for allocation in allocations:
            allocation_by_plan.setdefault(allocation.income_plan_id, []).append(allocation)
        plans = [
            RoadmapPlanRead(
                id=plan.id,
                label=plan.label,
                amount=float(plan.amount),
                expected_on=plan.expected_on,
                is_reliable=plan.is_reliable,
                status=plan.status,
                allocations=[
                    RoadmapPlanAllocationRead(
                        id=allocation.id,
                        label=allocation.label,
                        allocation_type=allocation.allocation_type,
                        amount=float(allocation.amount),
                        linked_type=allocation.linked_type,
                        linked_id=allocation.linked_id,
                    )
                    for allocation in sorted(allocation_by_plan.get(plan.id, []), key=lambda item: item.sort_order)
                ],
            )
            for plan in income_plans
        ]
        return RoadmapGoalSummary(goals=goals, plans=plans)

    def _action_queue(self, actions: list[ActionItem]) -> list[DecisionActionRead]:
        priority_order = {"do_now": 0, "this_week": 1, "when_income_lands": 2, "manual": 3}
        return [
            DecisionActionRead(
                id=action.id,
                title=action.title,
                detail=action.detail,
                status=action.status,
                lane=action.lane,
                source=action.source,
                due_on=action.due_on,
                linked_type=action.linked_type,
                linked_id=action.linked_id,
            )
            for action in sorted(
                actions,
                key=lambda item: (
                    priority_order.get(item.lane, 99),
                    item.due_on or date.max,
                    item.created_at,
                ),
            )
        ]

    def _focus(self, actions: list[DecisionActionRead]) -> DecisionFocus:
        primary = next((action for action in actions if action.status != "done"), None)
        secondary = next((action for action in actions if primary and action.id != primary.id and action.status != "done"), None)
        return DecisionFocus(
            primary_action=primary,
            secondary_action=secondary,
            why_now="This sequence is driven by overdue obligations, debt minimums, and your committed cash plan.",
        )

    def _cashflow_glance(
        self,
        income_plans: list[IncomePlan],
        income_entries: list[IncomeEntry],
        obligations: list[Obligation],
        debts: list[Debt],
        transactions: list[Transaction],
    ) -> CashflowGlance:
        today = _start_of_today()
        horizon = today + timedelta(days=14)
        trailing_start = today - timedelta(days=30)
        trailing_income = _money(
            sum(float(item.amount) for item in transactions if item.kind == TransactionKind.income and trailing_start <= item.occurred_on <= today)
        )
        trailing_expense = _money(
            sum(float(item.amount) for item in transactions if item.kind == TransactionKind.expense and trailing_start <= item.occurred_on <= today)
        )
        planned_inflow = _money(
            sum(float(plan.amount) for plan in income_plans if plan.status != "cancelled" and plan.expected_on and today <= plan.expected_on <= horizon)
            + sum(
                float(entry.amount)
                for entry in income_entries
                if entry.status == IncomeStatus.expected and entry.expected_on and today <= entry.expected_on <= horizon
            )
        )
        required_outflow = _money(
            sum(float(item.amount) for item in obligations if not item.is_paid and today <= item.due_on <= horizon)
            + sum(float(item.minimum_payment) for item in debts if item.status == DebtStatus.active and item.due_on and today <= item.due_on <= horizon)
        )
        next_income = next(
            iter(
                sorted(
                    [
                        *(plan.expected_on for plan in income_plans if plan.status != "cancelled" and plan.expected_on and plan.expected_on >= today),
                        *(entry.expected_on for entry in income_entries if entry.status == IncomeStatus.expected and entry.expected_on and entry.expected_on >= today),
                    ]
                )
            ),
            None,
        )
        next_pressure = next(
            (
                f"{item.name} due {item.due_on.isoformat()}"
                for item in sorted(obligations, key=lambda obligation: obligation.due_on)
                if not item.is_paid and item.due_on >= today
            ),
            None,
        )
        return CashflowGlance(
            trailing_30_inflow=trailing_income,
            trailing_30_outflow=trailing_expense,
            trailing_30_net=_money(trailing_income - trailing_expense),
            next_14_planned_inflow=planned_inflow,
            next_14_required_outflow=required_outflow,
            next_income_date=next_income,
            next_pressure_point=next_pressure,
        )

    def _progress_summary(
        self,
        free_now: float,
        free_after: float,
        debts: list[Debt],
        obligations: list[Obligation],
        goals: list[RoadmapGoalRead],
        actions: list[ActionItem],
        snapshots: list[ProgressSnapshot],
    ) -> ProgressSummary:
        today = _start_of_today()
        total_debt = _money(sum(float(item.balance) for item in debts if item.status == DebtStatus.active))
        overdue_count = sum(1 for item in obligations if not item.is_paid and item.due_on < today)
        completed_actions = sum(1 for item in actions if item.completed_at and item.completed_at.date() >= today - timedelta(days=7))
        goal_completion_rate = _money(sum(goal.progress for goal in goals) / len(goals)) if goals else 0

        def build_trend(days: int) -> ProgressTrend:
            baseline = next((snapshot for snapshot in snapshots if snapshot.snapshot_date <= today - timedelta(days=days)), None)
            if baseline is None:
                return ProgressTrend(direction="steady", free_now_delta=0, free_after_planned_income_delta=0, total_debt_delta=0, overdue_delta=0, completed_actions_delta=0)
            debt_delta = _money(total_debt - float(baseline.total_debt))
            overdue_delta = overdue_count - int(baseline.overdue_count)
            completed_delta = completed_actions - int(baseline.completed_actions)
            score = 0
            if free_now > float(baseline.free_now):
                score += 1
            elif free_now < float(baseline.free_now):
                score -= 1
            if total_debt < float(baseline.total_debt):
                score += 1
            elif total_debt > float(baseline.total_debt):
                score -= 1
            if overdue_count < int(baseline.overdue_count):
                score += 1
            elif overdue_count > int(baseline.overdue_count):
                score -= 1
            direction = "forward" if score > 0 else "backward" if score < 0 else "steady"
            return ProgressTrend(
                direction=direction,
                free_now_delta=_money(free_now - float(baseline.free_now)),
                free_after_planned_income_delta=_money(free_after - float(baseline.free_after_planned_income)),
                total_debt_delta=debt_delta,
                overdue_delta=overdue_delta,
                completed_actions_delta=completed_delta,
            )

        return ProgressSummary(
            free_now=free_now,
            free_after_planned_income=free_after,
            total_debt=total_debt,
            overdue_count=overdue_count,
            completed_actions_7d=completed_actions,
            goal_completion_rate=goal_completion_rate,
            seven_day=build_trend(7),
            thirty_day=build_trend(30),
        )

    def _recent_updates(
        self,
        events: list[ActivityEvent],
        actions: list[ActionItem],
        income_entries: list[IncomeEntry],
        transactions: list[Transaction],
    ) -> list[RecentUpdate]:
        if events:
            return [
                RecentUpdate(
                    id=event.id,
                    event_type=event.event_type,
                    title=event.title,
                    detail=event.detail,
                    amount=float(event.amount) if event.amount is not None else None,
                    occurred_at=event.occurred_at,
                    linked_type=event.linked_type,
                    linked_id=event.linked_id,
                )
                for event in events
            ]
        transaction_updates = [
            RecentUpdate(
                id=item.id,
                event_type="transaction_income" if item.kind == TransactionKind.income else "transaction_expense",
                title="Income logged" if item.kind == TransactionKind.income else "Expense logged",
                detail=item.notes,
                amount=float(item.amount),
                occurred_at=datetime.combine(item.occurred_on, datetime.min.time(), tzinfo=timezone.utc),
                linked_type="transaction",
                linked_id=item.id,
            )
            for item in transactions
        ]
        expected_income_updates = [
            RecentUpdate(
                id=item.id,
                event_type="expected_income",
                title=item.source_name,
                detail="Expected income added",
                amount=float(item.amount),
                occurred_at=datetime.combine(item.expected_on, datetime.min.time(), tzinfo=timezone.utc) if item.expected_on else datetime.now(timezone.utc),
                linked_type="income_entry",
                linked_id=item.id,
            )
            for item in income_entries
            if item.status == IncomeStatus.expected
        ]
        combined_updates = [*transaction_updates, *expected_income_updates]
        combined_updates.sort(key=lambda item: item.occurred_at, reverse=True)
        if combined_updates:
            return combined_updates[:10]
        completed = [item for item in actions if item.completed_at]
        completed.sort(key=lambda item: item.completed_at or datetime.min.replace(tzinfo=timezone.utc), reverse=True)
        return [
            RecentUpdate(
                id=item.id,
                event_type="action_completed",
                title=item.title,
                detail="Completed action",
                amount=None,
                occurred_at=item.completed_at or datetime.now(timezone.utc),
                linked_type=item.linked_type,
                linked_id=item.linked_id,
            )
            for item in completed[:10]
        ]
