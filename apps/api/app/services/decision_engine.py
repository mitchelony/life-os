from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone

from sqlalchemy.exc import ProgrammingError
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


INACTIVE_ACTION_STATUSES = {"done", "skipped", "blocked"}
INACTIVE_GOAL_STATUSES = {"completed", "blocked"}
INACTIVE_PLAN_STATUSES = {"cancelled", "received"}


def _start_of_today() -> date:
    return date.today()


def _setting(settings: dict[str, str], key: str) -> float:
    try:
        return float(settings.get(key, "0") or 0)
    except ValueError:
        return 0.0


def _is_missing_relation_error(error: ProgrammingError) -> bool:
    return "does not exist" in str(error).lower()


def _effective_liquid_cash(accounts: list[Account], transactions: list[Transaction]) -> float:
    liquid_types = {"checking", "savings", "cash"}
    balances = {
        account.id: float(account.balance)
        for account in accounts
        if account.type.value in liquid_types
    }
    for item in transactions:
        if item.account_id not in balances:
            continue
        amount = float(item.amount)
        if item.kind == TransactionKind.income:
            balances[item.account_id] += amount
        elif item.kind == TransactionKind.expense:
            balances[item.account_id] -= amount
    return _money(sum(balances.values()))


def _lane_from_due_date(due_on: date | None, today: date, fallback: str = "manual") -> str:
    if due_on is None:
        return fallback
    if due_on <= today:
        return "do_now"
    if due_on <= today + timedelta(days=6):
        return "this_week"
    return "manual"


def _live_action_lane(action: ActionItem, today: date) -> str:
    if action.lane == "when_income_lands":
        return "when_income_lands"
    return _lane_from_due_date(action.due_on, today, fallback=action.lane or "manual")


@dataclass(slots=True)
class DecisionEngineService:
    db: Session
    owner_id: str

    def _safe_query_all(self, model, *filters, order_by=None, limit: int | None = None):
        try:
            query = self.db.query(model)
            for item in filters:
                query = query.filter(item)
            if order_by is not None:
                if isinstance(order_by, (list, tuple)):
                    query = query.order_by(*order_by)
                else:
                    query = query.order_by(order_by)
            if limit is not None:
                query = query.limit(limit)
            return query.all()
        except ProgrammingError as error:
            if _is_missing_relation_error(error):
                self.db.rollback()
                return []
            raise

    def build(self) -> DecisionSnapshot:
        accounts = self._safe_query_all(Account, Account.owner_id == self.owner_id, Account.is_active.is_(True))
        obligations = self._safe_query_all(Obligation, Obligation.owner_id == self.owner_id)
        debts = self._safe_query_all(Debt, Debt.owner_id == self.owner_id)
        reserves = self._safe_query_all(Reserve, Reserve.owner_id == self.owner_id, Reserve.is_active.is_(True))
        settings = {row.key: row.value for row in self._safe_query_all(AppSetting, AppSetting.owner_id == self.owner_id)}
        income_entries = self._safe_query_all(IncomeEntry, IncomeEntry.owner_id == self.owner_id)
        income_plans = self._safe_query_all(IncomePlan, IncomePlan.owner_id == self.owner_id, order_by=IncomePlan.expected_on.asc())
        allocations = self._safe_query_all(IncomePlanAllocation, IncomePlanAllocation.owner_id == self.owner_id, order_by=IncomePlanAllocation.sort_order.asc())
        goals = self._safe_query_all(RoadmapGoal, RoadmapGoal.owner_id == self.owner_id, order_by=RoadmapGoal.created_at.asc())
        steps = self._safe_query_all(RoadmapStep, RoadmapStep.owner_id == self.owner_id, order_by=RoadmapStep.sort_order.asc())
        actions = self._safe_query_all(ActionItem, ActionItem.owner_id == self.owner_id, ActionItem.is_archived.is_(False))
        transactions = self._safe_query_all(Transaction, Transaction.owner_id == self.owner_id)
        events = self._safe_query_all(ActivityEvent, ActivityEvent.owner_id == self.owner_id, order_by=ActivityEvent.occurred_at.desc(), limit=12)
        snapshots = self._safe_query_all(ProgressSnapshot, ProgressSnapshot.owner_id == self.owner_id, order_by=ProgressSnapshot.snapshot_date.desc())

        horizon = self._planning_horizon(income_plans, income_entries, obligations, debts)
        free_now, free_after = self._free_cash(
            accounts,
            obligations,
            debts,
            reserves,
            settings,
            income_entries,
            income_plans,
            allocations,
            transactions,
            horizon,
        )
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
            plan.expected_on
            for plan in income_plans
            if plan.is_reliable and plan.status not in INACTIVE_PLAN_STATUSES and plan.expected_on and plan.expected_on >= today
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
        income_entries: list[IncomeEntry],
        income_plans: list[IncomePlan],
        allocations: list[IncomePlanAllocation],
        transactions: list[Transaction],
        horizon: date,
    ) -> tuple[FreeCashAmount, FreeCashAmount]:
        today = _start_of_today()
        active_plan_ids = {plan.id for plan in income_plans if plan.status not in INACTIVE_PLAN_STATUSES}
        liquid_cash = _effective_liquid_cash(accounts, transactions)
        protected_buffer = _money(_setting(settings, "protected_cash_buffer"))
        active_reserves = _money(sum(float(reserve.amount) for reserve in reserves if reserve.kind.value == "manual"))
        essentials_reserve = _money(_setting(settings, "essential_spend_target"))
        overdue_obligations = _money(sum(float(item.amount) for item in obligations if not item.is_paid and item.due_on < today))
        obligations_due = _money(sum(float(item.amount) for item in obligations if not item.is_paid and today <= item.due_on <= horizon))
        debt_minimums = _money(
            sum(
                float(item.minimum_payment)
                for item in debts
                if item.status == DebtStatus.active and (item.due_on is None or item.due_on <= horizon)
            )
        )
        free_now_amount = _money(liquid_cash - protected_buffer - active_reserves - overdue_obligations - obligations_due - debt_minimums - essentials_reserve)

        reliable_income = _money(
            sum(
                float(plan.amount)
                for plan in income_plans
                if plan.is_reliable and plan.status not in INACTIVE_PLAN_STATUSES and plan.expected_on and today <= plan.expected_on <= horizon
            )
        )
        linked_expected_income_ids = {
            plan.source_income_entry_id
            for plan in income_plans
            if plan.is_reliable
            and plan.status not in INACTIVE_PLAN_STATUSES
            and plan.expected_on
            and today <= plan.expected_on <= horizon
            and plan.source_income_entry_id
        }
        expected_income = _money(
            sum(
                float(entry.amount)
                for entry in income_entries
                if entry.status == IncomeStatus.expected
                and entry.expected_on
                and today <= entry.expected_on <= horizon
                and entry.id not in linked_expected_income_ids
            )
        )
        debt_lookup = {item.id: item for item in debts}
        obligation_lookup = {item.id: item for item in obligations}
        remaining_obligation_pressure = {
            item.id: float(item.amount)
            for item in obligations
            if not item.is_paid and item.due_on <= horizon
        }
        remaining_debt_minimum_pressure = {
            item.id: float(item.minimum_payment)
            for item in debts
            if item.status == DebtStatus.active and (item.due_on is None or item.due_on <= horizon)
        }
        extra_allocations = 0.0
        for allocation in allocations:
            if allocation.income_plan_id not in active_plan_ids:
                continue
            amount = float(allocation.amount)
            if allocation.linked_type == "obligation" and allocation.linked_id in obligation_lookup:
                covered = min(amount, remaining_obligation_pressure.get(allocation.linked_id, 0.0))
                remaining_obligation_pressure[allocation.linked_id] = max(
                    remaining_obligation_pressure.get(allocation.linked_id, 0.0) - covered,
                    0.0,
                )
                extra_allocations += amount - covered
                continue
            if allocation.linked_type == "debt" and allocation.linked_id in debt_lookup:
                covered = min(amount, remaining_debt_minimum_pressure.get(allocation.linked_id, 0.0))
                remaining_debt_minimum_pressure[allocation.linked_id] = max(
                    remaining_debt_minimum_pressure.get(allocation.linked_id, 0.0) - covered,
                    0.0,
                )
                extra_allocations += amount - covered
                continue
            extra_allocations += amount
        extra_allocations = _money(extra_allocations)
        free_after_amount = _money(free_now_amount + reliable_income + expected_income - extra_allocations)

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
                expected_income_within_horizon=0,
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
                expected_income_within_horizon=expected_income,
                extra_allocations_within_horizon=extra_allocations,
            ),
        )
        return free_now, free_after

    def _sync_system_actions(self, actions: list[ActionItem], obligations: list[Obligation], debts: list[Debt]) -> list[ActionItem]:
        existing = {(action.linked_type, action.linked_id): action for action in actions if action.source == "system"}
        today = _start_of_today()
        created = list(actions)
        active_keys: set[tuple[str | None, str | None]] = set()

        for obligation in obligations:
            if obligation.is_paid:
                continue
            key = ("obligation", obligation.id)
            active_keys.add(key)
            title = f"Pay {obligation.name}"
            lane = _lane_from_due_date(obligation.due_on, today)
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
            active_keys.add(key)
            title = f"Pay {debt.name} minimum"
            lane = _lane_from_due_date(debt.due_on, today)
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

        for action in actions:
            if action.source != "system":
                continue
            key = (action.linked_type, action.linked_id)
            if key not in active_keys:
                action.is_archived = True

        try:
            self.db.commit()
        except ProgrammingError as error:
            if _is_missing_relation_error(error):
                self.db.rollback()
                return []
            raise

        return self._safe_query_all(
            ActionItem,
            ActionItem.owner_id == self.owner_id,
            ActionItem.is_archived.is_(False),
            order_by=[ActionItem.due_on.asc().nulls_last(), ActionItem.created_at.asc()],
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
            for plan in sorted(income_plans, key=lambda item: (1 if item.status in INACTIVE_PLAN_STATUSES else 0, item.expected_on or date.max, item.created_at))
        ]
        sorted_goals = sorted(
            goals,
            key=lambda item: (
                1 if item.status in INACTIVE_GOAL_STATUSES else 0,
                item.target_date or date.max,
                item.title.lower(),
            ),
        )
        return RoadmapGoalSummary(goals=sorted_goals, plans=plans)

    def _action_queue(self, actions: list[ActionItem]) -> list[DecisionActionRead]:
        today = _start_of_today()
        priority_order = {"do_now": 0, "this_week": 1, "when_income_lands": 2, "manual": 3}
        status_order = {"in_progress": 0, "todo": 1}
        return [
            DecisionActionRead(
                id=action.id,
                title=action.title,
                detail=action.detail,
                status=action.status,
                lane=_live_action_lane(action, today),
                source=action.source,
                due_on=action.due_on,
                linked_type=action.linked_type,
                linked_id=action.linked_id,
            )
            for action in sorted(
                actions,
                key=lambda item: (
                    1 if item.status in INACTIVE_ACTION_STATUSES else 0,
                    priority_order.get(_live_action_lane(item, today), 99),
                    status_order.get(item.status, 99),
                    item.due_on or date.max,
                    item.created_at,
                ),
            )
        ]

    def _focus(self, actions: list[DecisionActionRead]) -> DecisionFocus:
        primary = next((action for action in actions if action.status not in INACTIVE_ACTION_STATUSES), None)
        secondary = next(
            (action for action in actions if primary and action.id != primary.id and action.status not in INACTIVE_ACTION_STATUSES),
            None,
        )
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
            sum(float(plan.amount) for plan in income_plans if plan.status not in INACTIVE_PLAN_STATUSES and plan.expected_on and today <= plan.expected_on <= horizon)
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
                        *(plan.expected_on for plan in income_plans if plan.status not in INACTIVE_PLAN_STATUSES and plan.expected_on and plan.expected_on >= today),
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
        active_goals = [goal for goal in goals if goal.status not in INACTIVE_GOAL_STATUSES]
        goal_completion_rate = _money(sum(goal.progress for goal in active_goals) / len(active_goals)) if active_goals else 0

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
