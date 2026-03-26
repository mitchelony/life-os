from datetime import date, datetime, timezone

from app.models.domain import (
    Account,
    ActionItem,
    ActivityEvent,
    Debt,
    IncomeEntry,
    IncomePlan,
    IncomePlanAllocation,
    Obligation,
    Reserve,
    RoadmapGoal,
    RoadmapStep,
)
from app.schemas.domain import RoadmapImportV2Payload
from app.services.roadmap_import import RoadmapImportService


def test_roadmap_import_v2_resolves_temp_ids_and_persists_extended_fields(db_session) -> None:
    owner_id = "owner-import-v2"
    today = date.today()
    checking = Account(owner_id=owner_id, name="Checking", type="checking", balance=1200)
    legacy_goal = RoadmapGoal(owner_id=owner_id, title="Legacy goal", status="active", priority="medium")
    db_session.add_all([checking, legacy_goal])
    db_session.commit()

    payload = RoadmapImportV2Payload.model_validate(
        {
            "version": 2,
            "reset_planning_first": True,
            "goals": [
                {
                    "temp_id": "goal_taxes",
                    "title": "Fund taxes",
                    "description": "Set aside tax cash before anything discretionary.",
                    "category": "finances",
                    "status": "active",
                    "priority": "critical",
                    "target_date": today.isoformat(),
                    "target_amount": 400,
                    "current_amount": 113,
                    "blocked_reason": None,
                    "recommended_next_step": "Reserve the next $63",
                    "sort_order": 0,
                    "depends_on_goal_temp_ids": [],
                    "linked_type": "manual",
                    "linked_id": None,
                    "notes": "Primary pressure.",
                    "steps": [
                        {
                            "temp_id": "step_one",
                            "title": "Reserve the next $63",
                            "status": "todo",
                            "due_on": today.isoformat(),
                            "sort_order": 0,
                            "amount": 63,
                            "recommended_action": "Move cash into reserve",
                            "depends_on_step_temp_ids": [],
                            "is_financial_step": True,
                            "linked_type": "manual",
                            "linked_id": None,
                            "notes": "Do this first.",
                            "completed_at": None,
                        }
                    ],
                },
                {
                    "temp_id": "goal_buffer",
                    "title": "Rebuild buffer",
                    "description": "Get the emergency buffer back up.",
                    "category": "finances",
                    "status": "planned",
                    "priority": "high",
                    "target_date": None,
                    "target_amount": 500,
                    "current_amount": 39.43,
                    "blocked_reason": None,
                    "recommended_next_step": None,
                    "sort_order": 1,
                    "depends_on_goal_temp_ids": ["goal_taxes"],
                    "linked_type": "account",
                    "linked_id": checking.id,
                    "notes": None,
                    "steps": [
                        {
                            "temp_id": "step_two",
                            "title": "Top up buffer",
                            "status": "blocked",
                            "due_on": None,
                            "sort_order": 0,
                            "amount": 100,
                            "recommended_action": None,
                            "depends_on_step_temp_ids": ["step_one"],
                            "is_financial_step": True,
                            "linked_type": "account",
                            "linked_id": checking.id,
                            "notes": None,
                            "completed_at": None,
                        }
                    ],
                },
            ],
            "income_plans": [
                {
                    "temp_id": "plan_main",
                    "label": "Next paycheck",
                    "amount": 900,
                    "expected_on": today.isoformat(),
                    "is_reliable": True,
                    "status": "planned",
                    "priority": "critical",
                    "rolls_up_to_goal_temp_id": "goal_taxes",
                    "recommended_step": "Cover taxes and utilities first",
                    "remaining_unallocated_amount": 0,
                    "is_partial": False,
                    "parent_income_plan_temp_id": None,
                    "source_income_entry_id": None,
                    "notes": "Main check",
                    "allocations": [
                        {
                            "temp_id": "alloc_one",
                            "label": "Taxes reserve",
                            "allocation_type": "manual",
                            "amount": 63,
                            "percent_of_income": 0.07,
                            "sort_order": 0,
                            "is_required": True,
                            "goal_temp_id": "goal_taxes",
                            "linked_type": "manual",
                            "linked_id": None,
                            "account_source_id": checking.id,
                            "account_destination_id": checking.id,
                            "status": "reserved",
                            "executed_amount": 63,
                            "executed_on": datetime.now(timezone.utc).isoformat(),
                            "notes": "Reserve this immediately",
                        }
                    ],
                },
                {
                    "temp_id": "plan_partial",
                    "label": "Split paycheck",
                    "amount": 200,
                    "expected_on": today.isoformat(),
                    "is_reliable": True,
                    "status": "planned",
                    "priority": "high",
                    "rolls_up_to_goal_temp_id": "goal_buffer",
                    "recommended_step": None,
                    "remaining_unallocated_amount": 50,
                    "is_partial": True,
                    "parent_income_plan_temp_id": "plan_main",
                    "source_income_entry_id": None,
                    "notes": None,
                    "allocations": [],
                },
            ],
            "cash_reserves": [
                {
                    "temp_id": "reserve_tax",
                    "label": "Taxes bucket",
                    "amount": 113,
                    "purpose_type": "taxes",
                    "linked_type": "manual",
                    "linked_id": None,
                    "account_id": checking.id,
                    "created_on": today.isoformat(),
                    "notes": "Already earmarked",
                }
            ],
            "expected_income_entries": [
                {
                    "source_name": "Payroll",
                    "amount": 900,
                    "status": "expected",
                    "expected_on": today.isoformat(),
                    "received_on": None,
                    "account_id": checking.id,
                    "is_reliable": True,
                    "category": "paycheck",
                    "linked_obligation_id": None,
                    "linked_debt_id": None,
                    "is_partial": False,
                    "parent_income_entry_id": None,
                    "notes": "Primary job",
                }
            ],
            "obligations": [
                {
                    "name": "Utilities",
                    "amount": 180,
                    "due_on": today.isoformat(),
                    "frequency": "monthly",
                    "is_paid": False,
                    "is_recurring": True,
                    "is_externally_covered": False,
                    "coverage_source_label": None,
                    "minimum_due": 90,
                    "past_due_amount": 45,
                    "target_payoff_date": None,
                    "notes": "Past due pressure",
                }
            ],
            "debts": [
                {
                    "name": "Capital One",
                    "balance": 600,
                    "minimum_payment": 40,
                    "due_on": today.isoformat(),
                    "status": "active",
                    "apr": 29.99,
                    "statement_balance": 580,
                    "minimum_met": False,
                    "minimum_met_on": None,
                    "available_credit": 120,
                    "no_new_spend_mode": True,
                    "notes": "Do not add spend",
                }
            ],
            "actions": [
                {
                    "title": "Call utility company",
                    "detail": "Ask for arrangement",
                    "status": "todo",
                    "lane": "do_now",
                    "source": "manual",
                    "due_on": today.isoformat(),
                    "linked_type": "manual",
                    "linked_id": None,
                }
            ],
            "allowed_values": {
                "goal_categories": ["finances", "school", "career", "admin", "health", "personal"],
                "goal_statuses": ["active", "planned", "blocked", "completed"],
                "goal_priorities": ["low", "medium", "high", "critical"],
                "step_statuses": ["todo", "in_progress", "blocked", "done"],
                "linked_types": ["obligation", "debt", "income", "manual", "account"],
                "income_plan_statuses": ["planned", "cancelled", "received"],
                "income_allocation_types": ["obligation_payment", "debt_payment", "buffer", "essentials", "manual"],
                "allocation_statuses": ["planned", "reserved", "paid", "skipped", "changed"],
                "cash_reserve_purpose_types": ["taxes", "buffer", "debt", "utilities", "essentials", "custom"],
                "income_statuses": ["expected", "received", "missed"],
                "income_categories": ["paycheck", "side_gig", "refund", "family_support", "scholarship", "other"],
                "obligation_frequencies": ["one_time", "weekly", "biweekly", "monthly", "yearly"],
                "debt_statuses": ["active", "paused", "paid_off"],
                "action_statuses": ["todo", "in_progress", "blocked", "done", "skipped"],
                "action_lanes": ["do_now", "this_week", "when_income_lands", "manual"],
                "action_sources": ["system", "manual", "goal"],
            },
        }
    )

    result = RoadmapImportService(db_session, owner_id).import_v2(payload)

    assert result.goals_created == 2
    assert result.steps_created == 2
    assert result.income_plans_created == 2
    assert result.allocations_created == 1
    assert result.cash_reserves_created == 1
    assert result.expected_income_entries_created == 1
    assert result.obligations_created == 1
    assert result.debts_created == 1
    assert result.actions_created == 1

    assert db_session.query(Account).filter(Account.owner_id == owner_id).count() == 1
    assert db_session.query(RoadmapGoal).filter(RoadmapGoal.owner_id == owner_id).count() == 2
    assert db_session.query(RoadmapStep).filter(RoadmapStep.owner_id == owner_id).count() == 2
    assert db_session.query(IncomePlan).filter(IncomePlan.owner_id == owner_id).count() == 2
    assert db_session.query(IncomePlanAllocation).filter(IncomePlanAllocation.owner_id == owner_id).count() == 1
    assert db_session.query(Reserve).filter(Reserve.owner_id == owner_id).count() == 1
    assert db_session.query(IncomeEntry).filter(IncomeEntry.owner_id == owner_id).count() == 1
    assert db_session.query(Obligation).filter(Obligation.owner_id == owner_id).count() == 1
    assert db_session.query(Debt).filter(Debt.owner_id == owner_id).count() == 1
    assert db_session.query(ActionItem).filter(ActionItem.owner_id == owner_id).count() == 1

    taxes_goal = db_session.query(RoadmapGoal).filter(RoadmapGoal.owner_id == owner_id, RoadmapGoal.title == "Fund taxes").one()
    buffer_goal = db_session.query(RoadmapGoal).filter(RoadmapGoal.owner_id == owner_id, RoadmapGoal.title == "Rebuild buffer").one()
    assert taxes_goal.target_amount == 400
    assert buffer_goal.depends_on_goal_ids == [taxes_goal.id]

    top_up_step = db_session.query(RoadmapStep).filter(RoadmapStep.owner_id == owner_id, RoadmapStep.title == "Top up buffer").one()
    reserve_step = db_session.query(RoadmapStep).filter(RoadmapStep.owner_id == owner_id, RoadmapStep.title == "Reserve the next $63").one()
    assert top_up_step.depends_on_step_ids == [reserve_step.id]
    assert top_up_step.amount == 100

    main_plan = db_session.query(IncomePlan).filter(IncomePlan.owner_id == owner_id, IncomePlan.label == "Next paycheck").one()
    partial_plan = db_session.query(IncomePlan).filter(IncomePlan.owner_id == owner_id, IncomePlan.label == "Split paycheck").one()
    assert main_plan.rolls_up_to_goal_id == taxes_goal.id
    assert partial_plan.parent_income_plan_id == main_plan.id
    assert partial_plan.is_partial is True

    allocation = db_session.query(IncomePlanAllocation).filter(IncomePlanAllocation.owner_id == owner_id).one()
    assert allocation.goal_id == taxes_goal.id
    assert allocation.status == "reserved"
    assert allocation.executed_amount == 63

    reserve = db_session.query(Reserve).filter(Reserve.owner_id == owner_id).one()
    assert reserve.purpose_type == "taxes"
    assert reserve.account_id == checking.id

    income_entry = db_session.query(IncomeEntry).filter(IncomeEntry.owner_id == owner_id).one()
    assert income_entry.category == "paycheck"
    assert income_entry.is_reliable is True

    obligation = db_session.query(Obligation).filter(Obligation.owner_id == owner_id).one()
    assert obligation.minimum_due == 90
    assert obligation.past_due_amount == 45

    debt = db_session.query(Debt).filter(Debt.owner_id == owner_id).one()
    assert float(debt.apr) == 29.99
    assert debt.no_new_spend_mode is True

    event = db_session.query(ActivityEvent).filter(ActivityEvent.owner_id == owner_id).one()
    assert event.event_type == "roadmap_imported"


def test_roadmap_import_v2_resolves_top_level_temp_ids_for_debts_obligations_and_income_entries(db_session) -> None:
    owner_id = "owner-import-links"
    today = date.today()
    checking = Account(owner_id=owner_id, name="Checking", type="checking", balance=500)
    db_session.add(checking)
    db_session.commit()

    payload = RoadmapImportV2Payload.model_validate(
        {
            "version": 2,
            "reset_planning_first": True,
            "goals": [
                {
                    "temp_id": "goal-rent",
                    "title": "Cover rent",
                    "description": "Wait for support and apply it.",
                    "category": "finances",
                    "status": "planned",
                    "priority": "medium",
                    "linked_type": "income",
                    "linked_id": "income-rent-support",
                    "steps": [],
                }
            ],
            "income_plans": [
                {
                    "temp_id": "plan-rent-support",
                    "label": "Rent support",
                    "amount": 600,
                    "expected_on": today.isoformat(),
                    "is_reliable": True,
                    "status": "planned",
                    "priority": "medium",
                    "source_income_entry_id": "income-rent-support",
                    "allocations": [
                        {
                            "temp_id": "alloc-rent",
                            "label": "Rent",
                            "allocation_type": "obligation_payment",
                            "amount": 600,
                            "linked_type": "obligation",
                            "linked_id": "obligation-rent",
                        }
                    ],
                }
            ],
            "cash_reserves": [],
            "expected_income_entries": [
                {
                    "temp_id": "income-rent-support",
                    "source_name": "Family rent support",
                    "amount": 600,
                    "status": "expected",
                    "expected_on": today.isoformat(),
                    "account_id": checking.id,
                    "is_reliable": True,
                    "category": "family_support",
                    "linked_obligation_id": "obligation-rent",
                    "linked_debt_id": "debt-card",
                    "is_partial": True,
                    "parent_income_entry_id": None,
                },
                {
                    "temp_id": "income-rent-support-2",
                    "source_name": "Family rent support part 2",
                    "amount": 100,
                    "status": "expected",
                    "expected_on": today.isoformat(),
                    "account_id": checking.id,
                    "is_reliable": True,
                    "category": "family_support",
                    "linked_obligation_id": "obligation-rent",
                    "linked_debt_id": None,
                    "is_partial": True,
                    "parent_income_entry_id": "income-rent-support",
                },
            ],
            "obligations": [
                {
                    "temp_id": "obligation-rent",
                    "name": "Rent",
                    "amount": 600,
                    "due_on": today.isoformat(),
                    "frequency": "monthly",
                    "is_paid": False,
                    "is_recurring": True,
                    "is_externally_covered": True,
                    "coverage_source_label": "Family rent support",
                }
            ],
            "debts": [
                {
                    "temp_id": "debt-card",
                    "name": "Capital One",
                    "balance": 300,
                    "minimum_payment": 25,
                    "due_on": today.isoformat(),
                    "status": "active",
                }
            ],
            "actions": [
                {
                    "title": "Use support for rent",
                    "status": "todo",
                    "lane": "when_income_lands",
                    "source": "goal",
                    "due_on": today.isoformat(),
                    "linked_type": "obligation",
                    "linked_id": "obligation-rent",
                }
            ],
        }
    )

    RoadmapImportService(db_session, owner_id).import_v2(payload)

    obligation = db_session.query(Obligation).one()
    debt = db_session.query(Debt).one()
    income_entries = db_session.query(IncomeEntry).order_by(IncomeEntry.created_at.asc()).all()
    goal = db_session.query(RoadmapGoal).one()
    plan = db_session.query(IncomePlan).one()
    allocation = db_session.query(IncomePlanAllocation).one()
    action = db_session.query(ActionItem).one()

    assert goal.linked_id == income_entries[0].id
    assert plan.source_income_entry_id == income_entries[0].id
    assert allocation.linked_id == obligation.id
    assert action.linked_id == obligation.id
    assert income_entries[0].linked_obligation_id == obligation.id
    assert income_entries[0].linked_debt_id == debt.id
    assert income_entries[1].parent_income_entry_id == income_entries[0].id
