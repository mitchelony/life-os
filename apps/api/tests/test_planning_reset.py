from datetime import date, timedelta

from app.models.domain import (
    Account,
    ActionItem,
    Debt,
    IncomeEntry,
    IncomeSource,
    Merchant,
    Obligation,
    ProgressSnapshot,
    Reserve,
    RoadmapGoal,
    RoadmapItem,
    StrategyDocument,
    Task,
    Transaction,
)
from app.services.planning_reset import PlanningResetService


def test_relaunch_preserves_accounts_debts_and_obligations_but_resets_planning_layers(db_session) -> None:
    owner_id = "owner-reset"
    today = date.today()

    account = Account(owner_id=owner_id, name="Checking", type="checking", balance=1000)
    debt = Debt(owner_id=owner_id, name="Card", balance=500, minimum_payment=45, due_on=today + timedelta(days=4), status="active")
    obligation = Obligation(owner_id=owner_id, name="Rent", amount=800, due_on=today + timedelta(days=2), is_paid=False)

    db_session.add_all(
        [
            account,
            debt,
            obligation,
            Task(owner_id=owner_id, title="Old task"),
            RoadmapItem(owner_id=owner_id, title="Old roadmap item"),
            StrategyDocument(owner_id=owner_id, name="Old strategy", document={"version": 1}, is_active=True),
            Transaction(owner_id=owner_id, kind="expense", amount=50, occurred_on=today),
            IncomeEntry(owner_id=owner_id, source_name="Old paycheck", amount=300, status="expected", expected_on=today + timedelta(days=1)),
            Merchant(owner_id=owner_id, name="Old merchant"),
            IncomeSource(owner_id=owner_id, name="Old source"),
            Reserve(owner_id=owner_id, name="Old reserve", amount=100, kind="manual", is_active=True),
            ActionItem(owner_id=owner_id, title="Old action", status="todo", lane="do_now", source="manual"),
            RoadmapGoal(owner_id=owner_id, title="Old goal", status="active", priority="medium"),
            ProgressSnapshot(owner_id=owner_id, snapshot_date=today - timedelta(days=1), free_now=25, free_after_planned_income=50, total_debt=500, overdue_count=1, completed_actions=0, goal_completion_rate=0),
        ]
    )
    db_session.commit()

    PlanningResetService(db_session, owner_id).relaunch()

    assert db_session.query(Account).filter(Account.owner_id == owner_id).count() == 1
    assert db_session.query(Debt).filter(Debt.owner_id == owner_id).count() == 1
    assert db_session.query(Obligation).filter(Obligation.owner_id == owner_id).count() == 1

    assert db_session.query(Task).filter(Task.owner_id == owner_id).count() == 0
    assert db_session.query(RoadmapItem).filter(RoadmapItem.owner_id == owner_id).count() == 0
    assert db_session.query(StrategyDocument).filter(StrategyDocument.owner_id == owner_id).count() == 0
    assert db_session.query(Transaction).filter(Transaction.owner_id == owner_id).count() == 0
    assert db_session.query(IncomeEntry).filter(IncomeEntry.owner_id == owner_id).count() == 0
    assert db_session.query(Merchant).filter(Merchant.owner_id == owner_id).count() == 0
    assert db_session.query(IncomeSource).filter(IncomeSource.owner_id == owner_id).count() == 0
    assert db_session.query(Reserve).filter(Reserve.owner_id == owner_id).count() == 0
    assert db_session.query(RoadmapGoal).filter(RoadmapGoal.owner_id == owner_id).count() == 0

    actions = db_session.query(ActionItem).filter(ActionItem.owner_id == owner_id).all()
    assert {action.title for action in actions} == {"Pay Rent", "Pay Card minimum"}

    snapshots = db_session.query(ProgressSnapshot).filter(ProgressSnapshot.owner_id == owner_id).all()
    assert len(snapshots) == 1
    assert snapshots[0].total_debt == 500
