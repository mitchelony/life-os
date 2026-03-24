from app.models.domain import Account, AppSetting, Debt, IncomeEntry, Obligation, Profile, Reserve, RoadmapItem, StrategyDocument
from app.models.enums import AccountType, DebtStatus, IncomeStatus, ObligationFrequency, ReserveKind
from app.schemas.domain import SettingsBootstrapPayload
from app.services.settings_bootstrap import SettingsBootstrapService


def test_settings_bootstrap_service_replaces_baseline_and_returns_round_trip_payload(db_session) -> None:
    service = SettingsBootstrapService(db_session, "owner")
    payload = SettingsBootstrapPayload(
        display_name="Mitchel",
        protected_buffer="100",
        essential_target="25",
        savings_floor="300",
        notes="Keep it simple.",
        accounts=[
            {
                "name": "Checking",
                "institution": "Bank",
                "type": "checking",
                "balance": "1200.00",
            }
        ],
        obligations=[
            {
                "name": "Rent",
                "amount": "800.00",
                "due_date": "2026-03-28",
                "recurrence": "monthly",
                "linked_account": "Checking",
            }
        ],
        debts=[
            {
                "name": "Capital One",
                "balance": "498.28",
                "minimum": "10.00",
                "due_date": "2026-03-29",
            }
        ],
        income=[
            {
                "source": "Payroll",
                "expected_amount": "2000.00",
                "due_date": "2026-03-31",
                "recurrence": "biweekly",
                "linked_account": "Checking",
            }
        ],
        roadmap_items=[
            {
                "id": "roadmap-1",
                "title": "Catch up on utilities",
                "description": "Use the next check to start cutting the overdue balance.",
                "category": "finances",
                "status": "active",
                "priority": "critical",
                "target_date": "2026-03-31",
                "timeframe_label": "This week",
                "progress_mode": "steps",
                "progress_value": 0,
                "steps": [
                    {
                        "id": "step-1",
                        "title": "Send first payment",
                        "completed": False,
                    }
                ],
                "notes": "Start here before extra card payments.",
                "dependency_ids": [],
                "linked_strategy_goal_id": "goal-utilities-catchup",
                "strategy_backed": True,
            }
        ],
        strategy_document={
            "version": 2,
            "name": "Next paycheck plan",
            "summary": "Pay the most important things first.",
            "effectiveDate": "2026-03-24",
            "currency": "USD",
            "planningHorizonDays": 30,
            "strategyMode": "cash_flow_first",
            "goals": [],
            "cashFlowPlan": {
                "defaultFlowOrder": ["minimum_required_payments", "protected_buffer"],
                "weeklyEssentialsCap": 25,
                "noNewCreditCardSpending": True,
                "bufferTarget": 100,
            },
            "expectedIncome": [],
            "nextIncomePlans": [],
            "debtPlan": [],
            "obligationPlan": [],
            "guidance": {
                "focusOrder": ["next_income_plan", "buffer"],
                "recommendedStepStyle": "next_planned_allocation",
                "primaryUXMode": "next_payments_to_make",
            },
        },
    )

    result = service.replace(payload)

    assert db_session.query(Profile).one().display_name == "Mitchel"
    settings = {item.key: item.value for item in db_session.query(AppSetting).all()}
    assert settings["protected_cash_buffer"] == "100"
    assert settings["essential_spend_target"] == "25"
    assert settings["savings_floor"] == "300"
    assert settings["owner_notes"] == "Keep it simple."

    account = db_session.query(Account).one()
    assert account.name == "Checking"
    assert account.type == AccountType.checking
    assert float(account.balance) == 1200

    obligation = db_session.query(Obligation).one()
    assert obligation.name == "Rent"
    assert obligation.frequency == ObligationFrequency.monthly

    debt = db_session.query(Debt).one()
    assert debt.name == "Capital One"
    assert debt.status == DebtStatus.active

    income_entry = db_session.query(IncomeEntry).one()
    assert income_entry.source_name == "Payroll"
    assert income_entry.status == IncomeStatus.expected

    reserve = db_session.query(Reserve).one()
    assert reserve.kind == ReserveKind.manual
    assert float(reserve.amount) == 300
    roadmap_item = db_session.query(RoadmapItem).one()
    assert roadmap_item.title == "Catch up on utilities"
    assert roadmap_item.linked_strategy_goal_id == "goal-utilities-catchup"
    strategy_document = db_session.query(StrategyDocument).one()
    assert strategy_document.name == "Next paycheck plan"
    assert strategy_document.is_active is True

    assert result.display_name == "Mitchel"
    assert result.accounts[0].name == "Checking"
    assert result.obligations[0].name == "Rent"
    assert result.debts[0].name == "Capital One"
    assert result.income[0].source == "Payroll"
    assert result.roadmap_items[0].title == "Catch up on utilities"
    assert result.strategy_document is not None
    assert result.strategy_document["name"] == "Next paycheck plan"
