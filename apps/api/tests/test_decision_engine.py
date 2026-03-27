from datetime import date, datetime, timedelta, timezone

from sqlalchemy.exc import ProgrammingError

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
from app.models.enums import TransactionKind
from app.services.decision_engine import DecisionEngineService


def _dt(days_ago: int) -> datetime:
    return datetime.now(timezone.utc) - timedelta(days=days_ago)


def test_decision_snapshot_computes_free_cash_and_forecast_without_double_counting(db_session) -> None:
    owner_id = "owner-1"
    today = date.today()

    db_session.add_all(
        [
            Account(owner_id=owner_id, name="Checking", type="checking", balance=2000),
            AppSetting(owner_id=owner_id, key="protected_cash_buffer", value="200"),
            AppSetting(owner_id=owner_id, key="essential_spend_target", value="150"),
            Reserve(owner_id=owner_id, name="Trip", amount=100, kind="manual", is_active=True),
            Obligation(owner_id=owner_id, name="Rent", amount=500, due_on=today + timedelta(days=3), is_paid=False),
            Debt(owner_id=owner_id, name="Card", balance=1200, minimum_payment=80, due_on=today + timedelta(days=4), status="active"),
            IncomePlan(
                owner_id=owner_id,
                label="Paycheck",
                amount=600,
                expected_on=today + timedelta(days=5),
                is_reliable=True,
                status="planned",
            ),
        ]
    )
    db_session.flush()

    plan = db_session.query(IncomePlan).filter(IncomePlan.owner_id == owner_id).one()
    rent = db_session.query(Obligation).filter(Obligation.owner_id == owner_id).one()
    card = db_session.query(Debt).filter(Debt.owner_id == owner_id).one()

    db_session.add_all(
        [
            IncomePlanAllocation(
                owner_id=owner_id,
                income_plan_id=plan.id,
                label="Rent required",
                allocation_type="obligation_payment",
                amount=500,
                sort_order=1,
                linked_type="obligation",
                linked_id=rent.id,
            ),
            IncomePlanAllocation(
                owner_id=owner_id,
                income_plan_id=plan.id,
                label="Card extra",
                allocation_type="debt_payment",
                amount=160,
                sort_order=2,
                linked_type="debt",
                linked_id=card.id,
            ),
            IncomePlanAllocation(
                owner_id=owner_id,
                income_plan_id=plan.id,
                label="Buffer top-up",
                allocation_type="buffer",
                amount=40,
                sort_order=3,
            ),
        ]
    )
    db_session.commit()

    snapshot = DecisionEngineService(db_session, owner_id).build()

    assert snapshot.free_now.amount == 970
    assert snapshot.free_after_planned_income.amount == 1450
    assert snapshot.free_now.breakdown.obligations_due_within_horizon == 500
    assert snapshot.free_now.breakdown.debt_minimums_due_within_horizon == 80
    assert snapshot.free_after_planned_income.breakdown.reliable_income_within_horizon == 600
    assert snapshot.free_after_planned_income.breakdown.extra_allocations_within_horizon == 120


def test_decision_snapshot_prioritizes_overdue_obligation_and_reports_progress_direction(db_session) -> None:
    owner_id = "owner-2"
    today = date.today()

    db_session.add_all(
        [
            Account(owner_id=owner_id, name="Checking", type="checking", balance=900),
            AppSetting(owner_id=owner_id, key="protected_cash_buffer", value="100"),
            Obligation(owner_id=owner_id, name="Utilities", amount=220, due_on=today - timedelta(days=2), is_paid=False),
            Debt(owner_id=owner_id, name="Capital One", balance=700, minimum_payment=40, due_on=today + timedelta(days=5), status="active"),
            RoadmapGoal(
                owner_id=owner_id,
                title="Erase card pressure",
                status="active",
                priority="high",
                metric_kind="debt_balance",
                metric_start_value=900,
                metric_current_value=700,
                metric_target_value=0,
            ),
            RoadmapStep(
                owner_id=owner_id,
                goal_id="goal-placeholder",
                title="Make the next payment",
                status="blocked",
                sort_order=1,
            ),
            ActionItem(
                owner_id=owner_id,
                title="Called utility company",
                status="done",
                lane="this_week",
                source="manual",
                completed_at=_dt(2),
            ),
            ProgressSnapshot(
                owner_id=owner_id,
                snapshot_date=today - timedelta(days=7),
                free_now=120,
                free_after_planned_income=250,
                total_debt=900,
                overdue_count=2,
                completed_actions=0,
                goal_completion_rate=10,
            ),
            ProgressSnapshot(
                owner_id=owner_id,
                snapshot_date=today - timedelta(days=30),
                free_now=50,
                free_after_planned_income=140,
                total_debt=1100,
                overdue_count=3,
                completed_actions=0,
                goal_completion_rate=0,
            ),
        ]
    )
    db_session.flush()

    goal = db_session.query(RoadmapGoal).filter(RoadmapGoal.owner_id == owner_id).one()
    step = db_session.query(RoadmapStep).filter(RoadmapStep.owner_id == owner_id).one()
    step.goal_id = goal.id
    db_session.commit()

    snapshot = DecisionEngineService(db_session, owner_id).build()

    assert snapshot.focus.primary_action.title == "Pay Utilities"
    assert snapshot.focus.primary_action.linked_type == "obligation"
    assert snapshot.progress_summary.seven_day.direction == "forward"
    assert snapshot.progress_summary.seven_day.total_debt_delta == -200
    assert snapshot.progress_summary.seven_day.overdue_delta == -1
    assert snapshot.progress_summary.seven_day.completed_actions_delta == 1


def test_decision_snapshot_pushes_done_skipped_and_blocked_actions_to_the_end(db_session) -> None:
    owner_id = "owner-actions-order"
    today = date.today()

    db_session.add_all(
        [
            Account(owner_id=owner_id, name="Checking", type="checking", balance=900),
            ActionItem(owner_id=owner_id, title="Done item", status="done", lane="do_now", source="manual", due_on=today),
            ActionItem(owner_id=owner_id, title="Blocked item", status="blocked", lane="this_week", source="manual", due_on=today),
            ActionItem(owner_id=owner_id, title="Skipped item", status="skipped", lane="manual", source="manual", due_on=today),
            ActionItem(owner_id=owner_id, title="Live item", status="todo", lane="this_week", source="manual", due_on=today),
            ActionItem(owner_id=owner_id, title="Started item", status="in_progress", lane="do_now", source="manual", due_on=today),
        ]
    )
    db_session.commit()

    snapshot = DecisionEngineService(db_session, owner_id).build()

    assert snapshot.focus.primary_action.title == "Started item"
    assert [item.title for item in snapshot.ordered_action_queue[:2]] == ["Started item", "Live item"]
    assert [item.status for item in snapshot.ordered_action_queue[-3:]] == ["done", "blocked", "skipped"]


def test_decision_snapshot_archives_system_actions_for_closed_underlying_items(db_session) -> None:
    owner_id = "owner-system-cleanup"
    today = date.today()

    db_session.add_all(
        [
            Account(owner_id=owner_id, name="Checking", type="checking", balance=900),
            Obligation(owner_id=owner_id, name="Rent", amount=700, due_on=today, is_paid=True),
            Debt(owner_id=owner_id, name="Card", balance=0, minimum_payment=40, due_on=today, status="paid_off"),
        ]
    )
    db_session.flush()
    rent = db_session.query(Obligation).filter(Obligation.owner_id == owner_id).one()
    card = db_session.query(Debt).filter(Debt.owner_id == owner_id).one()
    db_session.add_all(
        [
            ActionItem(owner_id=owner_id, title="Pay Rent", status="todo", lane="do_now", source="system", linked_type="obligation", linked_id=rent.id),
            ActionItem(owner_id=owner_id, title="Pay Card minimum", status="todo", lane="this_week", source="system", linked_type="debt", linked_id=card.id),
        ]
    )
    db_session.commit()

    snapshot = DecisionEngineService(db_session, owner_id).build()

    assert snapshot.ordered_action_queue == []
    archived_actions = db_session.query(ActionItem).filter(ActionItem.owner_id == owner_id).order_by(ActionItem.created_at.asc()).all()
    assert all(action.is_archived for action in archived_actions)


def test_decision_snapshot_derives_live_action_lanes_from_current_date(db_session) -> None:
    owner_id = "owner-action-lanes"
    today = date.today()

    db_session.add_all(
        [
            Account(owner_id=owner_id, name="Checking", type="checking", balance=900),
            ActionItem(owner_id=owner_id, title="Due today", status="todo", lane="this_week", source="manual", due_on=today),
            ActionItem(owner_id=owner_id, title="Due soon", status="todo", lane="manual", source="manual", due_on=today + timedelta(days=3)),
            ActionItem(owner_id=owner_id, title="Later this month", status="todo", lane="this_week", source="manual", due_on=today + timedelta(days=14)),
            ActionItem(owner_id=owner_id, title="Paycheck step", status="todo", lane="when_income_lands", source="manual", due_on=today + timedelta(days=2)),
        ]
    )
    db_session.commit()

    snapshot = DecisionEngineService(db_session, owner_id).build()
    lanes = {item.title: item.lane for item in snapshot.ordered_action_queue}

    assert lanes["Due today"] == "do_now"
    assert lanes["Due soon"] == "this_week"
    assert lanes["Later this month"] == "manual"
    assert lanes["Paycheck step"] == "when_income_lands"


def test_decision_snapshot_uses_transactions_for_cashflow_and_recent_updates(db_session) -> None:
    owner_id = "owner-3"
    today = date.today()

    db_session.add_all(
        [
            Account(owner_id=owner_id, name="Checking", type="checking", balance=600),
            Transaction(owner_id=owner_id, kind=TransactionKind.income, amount=950, occurred_on=today - timedelta(days=4)),
            Transaction(owner_id=owner_id, kind=TransactionKind.expense, amount=180, occurred_on=today - timedelta(days=2)),
            IncomeEntry(owner_id=owner_id, source_name="Contract work", amount=420, status="expected", expected_on=today + timedelta(days=3)),
        ]
    )
    db_session.commit()

    snapshot = DecisionEngineService(db_session, owner_id).build()

    assert snapshot.cashflow_glance.trailing_30_inflow == 950
    assert snapshot.cashflow_glance.trailing_30_outflow == 180
    assert snapshot.cashflow_glance.trailing_30_net == 770
    assert snapshot.cashflow_glance.next_14_planned_inflow == 420
    assert snapshot.recent_updates[0].event_type in {"transaction_income", "transaction_expense", "expected_income"}


def test_decision_snapshot_uses_effective_cash_counts_expected_income_and_keeps_overdue_debt_minimums_in_pressure(db_session) -> None:
    owner_id = "owner-free-cash-accuracy"
    today = date.today()

    checking = Account(owner_id=owner_id, name="Checking", type="checking", balance=100)
    db_session.add_all(
        [
            checking,
            Obligation(owner_id=owner_id, name="Internet", amount=20, due_on=today + timedelta(days=2), is_paid=False),
            Debt(owner_id=owner_id, name="Card", balance=800, minimum_payment=75, due_on=today - timedelta(days=1), status="active"),
            IncomeEntry(owner_id=owner_id, source_name="Payroll", amount=200, status="expected", expected_on=today + timedelta(days=3)),
        ]
    )
    db_session.flush()
    db_session.add_all(
        [
            Transaction(
                owner_id=owner_id,
                account_id=checking.id,
                kind=TransactionKind.income,
                amount=400,
                occurred_on=today - timedelta(days=2),
            ),
            Transaction(
                owner_id=owner_id,
                account_id=checking.id,
                kind=TransactionKind.expense,
                amount=50,
                occurred_on=today - timedelta(days=1),
            ),
        ]
    )
    db_session.commit()

    snapshot = DecisionEngineService(db_session, owner_id).build()

    assert snapshot.free_now.amount == 355
    assert snapshot.free_now.breakdown.liquid_cash == 450
    assert snapshot.free_now.breakdown.debt_minimums_due_within_horizon == 75
    assert snapshot.free_after_planned_income.amount == 555
    assert snapshot.free_after_planned_income.breakdown.expected_income_within_horizon == 200


def test_decision_snapshot_subtracts_next_income_obligation_allocations_not_already_in_current_pressure(db_session) -> None:
    owner_id = "owner-next-income-obligation"
    today = date.today()

    db_session.add_all(
        [
            Account(owner_id=owner_id, name="Checking", type="checking", balance=1000),
            Obligation(owner_id=owner_id, name="Insurance", amount=300, due_on=today + timedelta(days=10), is_paid=False),
            IncomePlan(
                owner_id=owner_id,
                label="Paycheck",
                amount=500,
                expected_on=today + timedelta(days=3),
                is_reliable=True,
                status="planned",
            ),
        ]
    )
    db_session.flush()

    plan = db_session.query(IncomePlan).filter(IncomePlan.owner_id == owner_id).one()
    obligation = db_session.query(Obligation).filter(Obligation.owner_id == owner_id).one()
    db_session.add(
        IncomePlanAllocation(
            owner_id=owner_id,
            income_plan_id=plan.id,
            label="Insurance payment",
            allocation_type="obligation_payment",
            amount=300,
            sort_order=1,
            linked_type="obligation",
            linked_id=obligation.id,
        )
    )
    db_session.commit()

    snapshot = DecisionEngineService(db_session, owner_id).build()

    assert snapshot.free_now.amount == 1000
    assert snapshot.free_after_planned_income.amount == 1200
    assert snapshot.free_after_planned_income.breakdown.extra_allocations_within_horizon == 300


def test_decision_snapshot_dedupes_income_plan_when_linked_to_expected_income_entry(db_session) -> None:
    owner_id = "owner-linked-income-dedupe"
    today = date.today()

    db_session.add(Account(owner_id=owner_id, name="Checking", type="checking", balance=100))
    db_session.flush()
    income_entry = IncomeEntry(
        owner_id=owner_id,
        source_name="Payroll",
        amount=500,
        status="expected",
        expected_on=today + timedelta(days=3),
    )
    db_session.add(income_entry)
    db_session.flush()
    db_session.add(
        IncomePlan(
            owner_id=owner_id,
            label="Payroll plan",
            amount=500,
            expected_on=today + timedelta(days=3),
            is_reliable=True,
            status="planned",
            source_income_entry_id=income_entry.id,
        )
    )
    db_session.commit()

    snapshot = DecisionEngineService(db_session, owner_id).build()

    assert snapshot.free_now.amount == 100
    assert snapshot.free_after_planned_income.amount == 600
    assert snapshot.free_after_planned_income.breakdown.reliable_income_within_horizon == 500
    assert snapshot.free_after_planned_income.breakdown.expected_income_within_horizon == 0


def test_decision_snapshot_uses_multiple_incomes_before_next_pressure_for_free_after(db_session) -> None:
    owner_id = "owner-multi-income-window"
    today = date.today()

    db_session.add_all(
        [
            Account(owner_id=owner_id, name="Checking", type="checking", balance=100),
            Obligation(owner_id=owner_id, name="Insurance", amount=700, due_on=today + timedelta(days=10), is_paid=False),
            IncomePlan(
                owner_id=owner_id,
                label="Part one",
                amount=300,
                expected_on=today + timedelta(days=3),
                is_reliable=True,
                status="planned",
            ),
            IncomePlan(
                owner_id=owner_id,
                label="Part two",
                amount=400,
                expected_on=today + timedelta(days=7),
                is_reliable=True,
                status="planned",
            ),
        ]
    )
    db_session.flush()

    plans = db_session.query(IncomePlan).filter(IncomePlan.owner_id == owner_id).order_by(IncomePlan.expected_on.asc()).all()
    obligation = db_session.query(Obligation).filter(Obligation.owner_id == owner_id).one()
    db_session.add_all(
        [
            IncomePlanAllocation(
                owner_id=owner_id,
                income_plan_id=plans[0].id,
                label="Insurance part one",
                allocation_type="obligation_payment",
                amount=300,
                sort_order=1,
                linked_type="obligation",
                linked_id=obligation.id,
            ),
            IncomePlanAllocation(
                owner_id=owner_id,
                income_plan_id=plans[1].id,
                label="Insurance part two",
                allocation_type="obligation_payment",
                amount=400,
                sort_order=1,
                linked_type="obligation",
                linked_id=obligation.id,
            ),
        ]
    )
    db_session.commit()

    snapshot = DecisionEngineService(db_session, owner_id).build()

    assert snapshot.free_now.amount == 100
    assert snapshot.free_now.breakdown.reliable_income_within_horizon == 0
    assert snapshot.free_now.breakdown.obligations_due_within_horizon == 0
    assert snapshot.free_after_planned_income.amount == 100
    assert snapshot.free_after_planned_income.breakdown.reliable_income_within_horizon == 700
    assert snapshot.free_after_planned_income.breakdown.obligations_due_within_horizon == 700
    assert snapshot.free_after_planned_income.breakdown.extra_allocations_within_horizon == 0


def test_decision_snapshot_falls_back_when_new_planning_tables_are_missing(db_session, monkeypatch) -> None:
    owner_id = "owner-legacy-schema"
    today = date.today()
    db_session.add_all(
        [
            Account(owner_id=owner_id, name="Checking", type="checking", balance=600),
            AppSetting(owner_id=owner_id, key="protected_cash_buffer", value="100"),
            IncomeEntry(owner_id=owner_id, source_name="Contract work", amount=420, status="expected", expected_on=today + timedelta(days=3)),
            Transaction(owner_id=owner_id, kind=TransactionKind.income, amount=950, occurred_on=today - timedelta(days=4)),
            Obligation(owner_id=owner_id, name="Rent", amount=800, due_on=today + timedelta(days=2), is_paid=False),
        ]
    )
    db_session.commit()

    original_query = db_session.query
    missing_models = {ActionItem, ActivityEvent, IncomePlan, IncomePlanAllocation, ProgressSnapshot, RoadmapGoal, RoadmapStep}

    def guarded_query(model, *args, **kwargs):
        if model in missing_models:
            raise ProgrammingError(
                f"SELECT * FROM {model.__tablename__}",
                {},
                Exception(f'relation "{model.__tablename__}" does not exist'),
            )
        return original_query(model, *args, **kwargs)

    monkeypatch.setattr(db_session, "query", guarded_query)

    snapshot = DecisionEngineService(db_session, owner_id).build()

    assert snapshot.cashflow_glance.trailing_30_inflow == 950
    assert snapshot.cashflow_glance.next_14_planned_inflow == 420
    assert snapshot.roadmap_summary.goals == []
    assert snapshot.roadmap_summary.plans == []
    assert snapshot.ordered_action_queue == []
