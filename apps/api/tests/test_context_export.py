from datetime import date, timedelta

from sqlalchemy.exc import ProgrammingError

from app.models.domain import (
    Account,
    ActionItem,
    IncomePlan,
    IncomePlanAllocation,
    AppSetting,
    Debt,
    IncomeEntry,
    Obligation,
    RoadmapGoal,
    RoadmapStep,
    Transaction,
)
from app.services.context_export import ContextExportService


def test_context_export_includes_current_ids_and_allowed_values(db_session) -> None:
    owner_id = "owner-export"
    today = date.today()
    account = Account(owner_id=owner_id, name="Checking", type="checking", balance=1200)
    debt = Debt(owner_id=owner_id, name="Capital One", balance=500, minimum_payment=45, due_on=today + timedelta(days=3), status="active")
    obligation = Obligation(owner_id=owner_id, name="Rent", amount=800, due_on=today + timedelta(days=2), is_paid=False)
    expected_income = IncomeEntry(
        owner_id=owner_id,
        source_name="Payroll",
        amount=900,
        status="expected",
        expected_on=today + timedelta(days=1),
        account_id=None,
    )
    expense = Transaction(
        owner_id=owner_id,
        kind="expense",
        amount=54,
        occurred_on=today - timedelta(days=1),
        account_id=None,
        notes="Groceries",
    )
    action = ActionItem(owner_id=owner_id, title="Pay rent", status="todo", lane="do_now", source="system", linked_type="obligation")
    setting = AppSetting(owner_id=owner_id, key="protected_cash_buffer", value="200")
    db_session.add_all([account, debt, obligation, expected_income, expense, action, setting])
    db_session.commit()

    payload = ContextExportService(db_session, owner_id).build()

    assert payload.owner_id == owner_id
    assert payload.accounts[0].id == account.id
    assert payload.debts[0].id == debt.id
    assert payload.obligations[0].id == obligation.id
    assert payload.expected_income_entries[0].id == expected_income.id
    assert payload.expense_transactions[0].id == expense.id
    assert payload.actions[0].id == action.id
    assert payload.settings["protected_cash_buffer"] == "200"
    assert "received" in payload.allowed_values.income_statuses
    assert "manual" in payload.allowed_values.action_lanes


def test_context_export_falls_back_to_empty_planning_sections_when_new_tables_are_missing(db_session, monkeypatch) -> None:
    owner_id = "owner-export-legacy"
    today = date.today()
    account = Account(owner_id=owner_id, name="Checking", type="checking", balance=1200)
    expected_income = IncomeEntry(
        owner_id=owner_id,
        source_name="Payroll",
        amount=900,
        status="expected",
        expected_on=today + timedelta(days=1),
        account_id=None,
    )
    db_session.add_all([account, expected_income])
    db_session.commit()

    original_query = db_session.query
    missing_models = {ActionItem, IncomePlan, IncomePlanAllocation, RoadmapGoal, RoadmapStep}

    def guarded_query(model, *args, **kwargs):
        if model in missing_models:
            raise ProgrammingError(
                f"SELECT * FROM {model.__tablename__}",
                {},
                Exception(f'relation "{model.__tablename__}" does not exist'),
            )
        return original_query(model, *args, **kwargs)

    monkeypatch.setattr(db_session, "query", guarded_query)

    payload = ContextExportService(db_session, owner_id).build()

    assert payload.owner_id == owner_id
    assert payload.expected_income_entries[0].source_name == "Payroll"
    assert payload.actions == []
    assert payload.roadmap_goals == []
    assert payload.roadmap_steps == []
    assert payload.income_plans == []
    assert payload.income_plan_allocations == []
