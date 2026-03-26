from datetime import date, datetime, timedelta, timezone

from app.models.domain import (
    Account,
    ActionItem,
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
