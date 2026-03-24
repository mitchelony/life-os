from dataclasses import dataclass
from datetime import date

from app.models.enums import IncomeStatus, TransactionKind
from app.schemas.domain import (
    AccountSnapshot,
    DashboardDataSnapshot,
    DashboardItem,
    DashboardResponse,
    DashboardSnapshot,
    DashboardSummary,
    DashboardTransactionRead,
)
from app.services.available_spend import AvailableSpendInput, compute_available_spend


def _title_from_notes(notes: str | None, fallback: str) -> str:
    if not notes:
        return fallback
    first_line = notes.splitlines()[0].strip()
    return first_line or fallback


@dataclass(slots=True)
class DashboardService:
    snapshot: DashboardSnapshot

    def _effective_account_balances(self) -> dict[str, float]:
        balances = {account.id: float(account.balance) for account in self.snapshot.accounts}
        for transaction in self.snapshot.transactions:
            if not transaction.account_id or transaction.account_id not in balances:
                continue
            if transaction.kind == TransactionKind.income:
                balances[transaction.account_id] += float(transaction.amount)
            elif transaction.kind == TransactionKind.expense:
                balances[transaction.account_id] -= float(transaction.amount)
        return balances

    def _effective_accounts(self):
        balances = self._effective_account_balances()
        return [account.model_copy(update={"balance": balances.get(account.id, float(account.balance))}) for account in self.snapshot.accounts]

    def _sorted_items(self) -> list[DashboardItem]:
        items: list[DashboardItem] = []

        for obligation in self.snapshot.obligations:
            items.append(
                DashboardItem(
                    label=obligation.name,
                    detail="Obligation due",
                    due_on=obligation.due_on,
                    amount=float(obligation.amount),
                    kind="obligation",
                )
            )

        for debt in self.snapshot.debts:
            items.append(
                DashboardItem(
                    label=debt.name,
                    detail="Debt payment due",
                    due_on=debt.due_on,
                    amount=float(debt.minimum_payment),
                    kind="debt",
                )
            )

        for task in self.snapshot.tasks:
            items.append(
                DashboardItem(
                    label=task.title,
                    detail="Task to complete",
                    due_on=task.due_on,
                    kind="task",
                )
            )

        for income in self.snapshot.income_entries:
            if income.status == IncomeStatus.expected:
                items.append(
                    DashboardItem(
                        label=income.source_name,
                        detail="Expected income",
                        due_on=income.expected_on,
                        amount=float(income.amount),
                        kind="income",
                    )
                )

        def sort_key(item: DashboardItem) -> tuple[int, date]:
            return (0 if item.due_on and item.due_on <= date.today() else 1, item.due_on or date.max)

        return sorted(items, key=sort_key)

    def _account_snapshot(self, effective_accounts) -> AccountSnapshot:
        total_cash = 0.0
        checking = 0.0
        savings = 0.0
        credit_card = 0.0

        for account in effective_accounts:
            balance = float(account.balance)
            if account.type.value == "checking":
                checking += balance
                total_cash += balance
            elif account.type.value == "savings":
                savings += balance
                total_cash += balance
            elif account.type.value == "cash":
                total_cash += balance
            elif account.type.value == "credit_card":
                credit_card += balance

        overdue_obligations = sum(float(item.amount) for item in self.snapshot.obligations if item.due_on < date.today() and not item.is_paid)
        upcoming_income = sum(float(entry.amount) for entry in self.snapshot.income_entries if entry.status == IncomeStatus.expected)

        return AccountSnapshot(
            total_cash_available=total_cash,
            checking_balance=checking,
            savings_balance=savings,
            credit_card_balance=credit_card,
            overdue_obligations=overdue_obligations,
            upcoming_income=upcoming_income,
        )

    def _transaction_snapshot(self) -> list[DashboardTransactionRead]:
        account_names = {account.id: account.name for account in self.snapshot.accounts}
        category_names = {category.id: category.name for category in self.snapshot.categories}
        merchant_names = {merchant.id: merchant.name for merchant in self.snapshot.merchants}
        income_source_names = {source.id: source.name for source in self.snapshot.income_sources}

        transactions = sorted(self.snapshot.transactions, key=lambda item: (item.occurred_on, item.created_at), reverse=True)
        rows: list[DashboardTransactionRead] = []
        for item in transactions:
            counterparty = None
            if item.kind == TransactionKind.expense:
                counterparty = merchant_names.get(item.merchant_id)
            elif item.kind == TransactionKind.income:
                counterparty = income_source_names.get(item.income_source_id)
            fallback = counterparty or category_names.get(item.category_id) or item.kind.value.replace("_", " ").title()
            rows.append(
                DashboardTransactionRead(
                    id=item.id,
                    kind=item.kind,
                    amount=float(item.amount),
                    occurred_on=item.occurred_on,
                    account_name=account_names.get(item.account_id),
                    category_name=category_names.get(item.category_id),
                    counterparty_name=counterparty,
                    title=_title_from_notes(item.notes, fallback),
                    notes=item.notes,
                )
            )
        return rows

    def build(self) -> DashboardResponse:
        sorted_items = self._sorted_items()
        whats_next = sorted_items[0] if sorted_items else None
        whats_after_that = sorted_items[1] if len(sorted_items) > 1 else None
        expected_income_dates = [entry.expected_on for entry in self.snapshot.income_entries if entry.status == IncomeStatus.expected and entry.expected_on]
        next_income_date = min(expected_income_dates) if expected_income_dates else date.max
        effective_accounts = self._effective_accounts()

        available_spend = compute_available_spend(
            AvailableSpendInput(
                liquid_cash=sum(float(account.balance) for account in effective_accounts if account.type.value in {"checking", "savings", "cash"}),
                protected_cash_buffer=self.snapshot.protected_cash_buffer,
                manual_reserves=sum(float(reserve.amount) for reserve in self.snapshot.reserves if reserve.is_active),
                obligations_due_before_next_income=sum(
                    float(item.amount)
                    for item in self.snapshot.obligations
                    if not item.is_paid and item.due_on <= next_income_date
                ),
                minimum_debt_payments_due_before_next_income=sum(
                    float(item.minimum_payment)
                    for item in self.snapshot.debts
                    if item.status.value == "active" and (item.due_on is None or item.due_on <= next_income_date)
                ),
                essential_spend_target_remaining_until_next_income=self.snapshot.essential_spend_target,
                notes=[
                    "Computed from cash-like accounts, liabilities, reserves, and your protected buffer.",
                    f"Next expected income date: {next_income_date.isoformat() if next_income_date != date.max else 'not scheduled'}.",
                ],
            )
        )

        priorities = sorted_items[:4]
        return DashboardResponse(
            summary=DashboardSummary(
                whats_next=whats_next,
                whats_after_that=whats_after_that,
                available_spend=available_spend.breakdown,
                account_snapshot=self._account_snapshot(effective_accounts),
                top_priorities=priorities,
            ),
            snapshot=DashboardDataSnapshot(
                accounts=self.snapshot.accounts,
                obligations=self.snapshot.obligations,
                debts=self.snapshot.debts,
                income_entries=self.snapshot.income_entries,
                transactions=self._transaction_snapshot(),
                settings=self.snapshot.settings,
            ),
        )
