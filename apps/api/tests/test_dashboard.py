from datetime import date, timedelta

from app.models.enums import AccountType, DebtStatus, IncomeStatus, ObligationFrequency, TaskStatus
from app.schemas.domain import AccountRead, DashboardSnapshot, DebtRead, IncomeEntryRead, ObligationRead, ReserveRead, TaskRead, TransactionRead
from app.services.dashboard import DashboardService


def test_dashboard_picks_next_and_after_that() -> None:
    today = date.today()
    snapshot = DashboardSnapshot(
        accounts=[
            AccountRead(
                id="a1",
                owner_id="owner",
                created_at="2026-01-01T00:00:00Z",
                updated_at="2026-01-01T00:00:00Z",
                name="Checking",
                type=AccountType.checking,
                institution="Bank",
                balance=1000,
                is_active=True,
                notes=None,
            )
        ],
        obligations=[
            ObligationRead(
                id="o1",
                owner_id="owner",
                created_at="2026-01-01T00:00:00Z",
                updated_at="2026-01-01T00:00:00Z",
                name="Rent",
                amount=800,
                due_on=today + timedelta(days=2),
                frequency=ObligationFrequency.one_time,
                is_paid=False,
                is_recurring=False,
                notes=None,
            ),
            ObligationRead(
                id="o2",
                owner_id="owner",
                created_at="2026-01-01T00:00:00Z",
                updated_at="2026-01-01T00:00:00Z",
                name="Electric",
                amount=120,
                due_on=today + timedelta(days=4),
                frequency=ObligationFrequency.one_time,
                is_paid=False,
                is_recurring=False,
                notes=None,
            ),
        ],
        debts=[
            DebtRead(
                id="d1",
                owner_id="owner",
                created_at="2026-01-01T00:00:00Z",
                updated_at="2026-01-01T00:00:00Z",
                name="Credit Card",
                balance=500,
                minimum_payment=35,
                due_on=today + timedelta(days=5),
                status=DebtStatus.active,
                notes=None,
            )
        ],
        tasks=[
            TaskRead(
                id="t1",
                owner_id="owner",
                created_at="2026-01-01T00:00:00Z",
                updated_at="2026-01-01T00:00:00Z",
                title="Call landlord",
                status=TaskStatus.todo,
                due_on=today + timedelta(days=1),
                linked_type=None,
                linked_id=None,
                notes=None,
            )
        ],
        income_entries=[
            IncomeEntryRead(
                id="i1",
                owner_id="owner",
                created_at="2026-01-01T00:00:00Z",
                updated_at="2026-01-01T00:00:00Z",
                source_name="Payroll",
                amount=2000,
                status=IncomeStatus.expected,
                expected_on=today + timedelta(days=7),
                received_on=None,
                account_id=None,
                notes=None,
            )
        ],
        transactions=[
            TransactionRead(
                id="tx1",
                owner_id="owner",
                created_at="2026-01-01T00:00:00Z",
                updated_at="2026-01-01T00:00:00Z",
                kind="expense",
                amount=75,
                account_id="a1",
                category_id=None,
                merchant_id=None,
                income_source_id=None,
                occurred_on=today,
                notes="Groceries",
                is_planned=False,
                is_cleared=True,
            )
        ],
        reserves=[
            ReserveRead(
                id="r1",
                owner_id="owner",
                created_at="2026-01-01T00:00:00Z",
                updated_at="2026-01-01T00:00:00Z",
                name="Buffer",
                amount=100,
                kind="manual",
                is_active=True,
                notes=None,
            )
        ],
        protected_cash_buffer=200,
        essential_spend_target=150,
    )

    result = DashboardService(snapshot).build()

    assert result.summary.whats_next is not None
    assert result.summary.whats_next.label == "Call landlord"
    assert result.summary.whats_after_that is not None
    assert result.summary.whats_after_that.label == "Rent"
    assert result.summary.account_snapshot.total_cash_available == 925
    assert result.summary.available_spend.available_spend == -480


def test_dashboard_response_includes_snapshot_details() -> None:
    today = date.today()
    snapshot = DashboardSnapshot(
        accounts=[
            AccountRead(
                id="a1",
                owner_id="owner",
                created_at="2026-01-01T00:00:00Z",
                updated_at="2026-01-01T00:00:00Z",
                name="Checking",
                type=AccountType.checking,
                institution="Bank",
                balance=1000,
                is_active=True,
                notes=None,
            )
        ],
        obligations=[],
        debts=[],
        tasks=[],
        income_entries=[],
        transactions=[],
        reserves=[],
        settings={"protected_cash_buffer": "100"},
        protected_cash_buffer=100,
        essential_spend_target=25,
    )

    result = DashboardService(snapshot).build()

    assert result.snapshot.accounts[0].name == "Checking"
    assert result.snapshot.settings["protected_cash_buffer"] == "100"
    assert result.snapshot.transactions == []
