from datetime import date, timedelta

from app.models.domain import (
    Account,
    ActionItem,
    ActivityEvent,
    Debt,
    IncomePlan,
    IncomePlanAllocation,
    Obligation,
    PlannerDraft,
    RoadmapGoal,
    RoadmapStep,
)
from app.schemas.domain import RoadmapImportPayload
from app.services.roadmap_import import RoadmapImportService


def test_roadmap_import_creates_nested_goals_steps_and_income_plans(db_session) -> None:
    owner_id = "owner-import"
    today = date.today()
    debt = Debt(owner_id=owner_id, name="Capital One", balance=700, minimum_payment=40, due_on=today + timedelta(days=5), status="active")
    obligation = Obligation(owner_id=owner_id, name="Utilities", amount=220, due_on=today + timedelta(days=2), is_paid=False)
    db_session.add_all([debt, obligation])
    db_session.commit()

    payload = RoadmapImportPayload.model_validate(
        {
            "version": 1,
            "reset_planning_first": False,
            "goals": [
                {
                    "temp_id": "goal_utilities",
                    "title": "Get utilities current",
                    "description": "Stop overdue utility pressure.",
                    "status": "active",
                    "priority": "critical",
                    "target_date": str(today + timedelta(days=21)),
                    "linked_type": "obligation",
                    "linked_id": obligation.id,
                    "steps": [
                        {
                            "title": "Call utility company",
                            "status": "todo",
                            "due_on": str(today + timedelta(days=1)),
                            "sort_order": 0,
                            "linked_type": "obligation",
                            "linked_id": obligation.id,
                            "notes": "Ask for a payment plan.",
                        }
                    ],
                }
            ],
            "income_plans": [
                {
                    "temp_id": "paycheck_1",
                    "label": "Next paycheck",
                    "amount": 900,
                    "expected_on": str(today + timedelta(days=3)),
                    "is_reliable": True,
                    "status": "planned",
                    "notes": "Bills first.",
                    "allocations": [
                        {
                            "label": "Utilities catch-up",
                            "allocation_type": "obligation_payment",
                            "amount": 220,
                            "sort_order": 0,
                            "linked_type": "obligation",
                            "linked_id": obligation.id,
                            "notes": None,
                        },
                        {
                            "label": "Capital One minimum",
                            "allocation_type": "debt_payment",
                            "amount": 40,
                            "sort_order": 1,
                            "linked_type": "debt",
                            "linked_id": debt.id,
                            "notes": None,
                        },
                    ],
                }
            ],
        }
    )

    result = RoadmapImportService(db_session, owner_id).run(payload)

    assert result.goals_created == 1
    assert result.steps_created == 1
    assert result.income_plans_created == 1
    assert result.allocations_created == 2
    assert "goal_utilities" in result.goal_ids
    assert "paycheck_1" in result.income_plan_ids

    goal = db_session.query(RoadmapGoal).filter(RoadmapGoal.owner_id == owner_id).one()
    assert goal.title == "Get utilities current"
    assert goal.linked_id == obligation.id

    step = db_session.query(RoadmapStep).filter(RoadmapStep.owner_id == owner_id).one()
    assert step.goal_id == goal.id
    assert step.linked_id == obligation.id

    plan = db_session.query(IncomePlan).filter(IncomePlan.owner_id == owner_id).one()
    assert plan.label == "Next paycheck"

    allocations = (
        db_session.query(IncomePlanAllocation)
        .filter(IncomePlanAllocation.owner_id == owner_id)
        .order_by(IncomePlanAllocation.sort_order.asc())
        .all()
    )
    assert [item.label for item in allocations] == ["Utilities catch-up", "Capital One minimum"]

    event = db_session.query(ActivityEvent).filter(ActivityEvent.owner_id == owner_id).one()
    assert event.event_type == "roadmap_imported"


def test_roadmap_import_reset_clears_existing_planning_layers_only(db_session) -> None:
    owner_id = "owner-import-reset"
    today = date.today()
    db_session.add_all(
        [
            Account(owner_id=owner_id, name="Checking", type="checking", balance=1000),
            Debt(owner_id=owner_id, name="Card", balance=500, minimum_payment=45, due_on=today + timedelta(days=4), status="active"),
            Obligation(owner_id=owner_id, name="Rent", amount=800, due_on=today + timedelta(days=2), is_paid=False),
            RoadmapGoal(owner_id=owner_id, title="Old goal", status="active", priority="medium"),
            RoadmapStep(owner_id=owner_id, goal_id="temp-goal", title="Old step", status="todo", sort_order=0),
            IncomePlan(owner_id=owner_id, label="Old plan", amount=300, status="planned"),
            PlannerDraft(owner_id=owner_id, name="Old draft", status="draft", draft={}),
            ActionItem(owner_id=owner_id, title="Manual action", status="todo", lane="manual", source="manual"),
        ]
    )
    db_session.flush()
    step = db_session.query(RoadmapStep).filter(RoadmapStep.owner_id == owner_id).one()
    goal = db_session.query(RoadmapGoal).filter(RoadmapGoal.owner_id == owner_id).one()
    step.goal_id = goal.id
    db_session.commit()

    payload = RoadmapImportPayload.model_validate(
        {
            "version": 1,
            "reset_planning_first": True,
            "goals": [],
            "income_plans": [],
        }
    )

    result = RoadmapImportService(db_session, owner_id).run(payload)

    assert result.goals_created == 0
    assert db_session.query(Account).filter(Account.owner_id == owner_id).count() == 1
    assert db_session.query(Debt).filter(Debt.owner_id == owner_id).count() == 1
    assert db_session.query(Obligation).filter(Obligation.owner_id == owner_id).count() == 1
    assert db_session.query(RoadmapGoal).filter(RoadmapGoal.owner_id == owner_id).count() == 0
    assert db_session.query(RoadmapStep).filter(RoadmapStep.owner_id == owner_id).count() == 0
    assert db_session.query(IncomePlan).filter(IncomePlan.owner_id == owner_id).count() == 0
    assert db_session.query(PlannerDraft).filter(PlannerDraft.owner_id == owner_id).count() == 0
    assert db_session.query(ActionItem).filter(ActionItem.owner_id == owner_id).count() == 0
