from datetime import date

from sqlalchemy.orm import Session

from app.models.domain import Account, Category, IncomeEntry, IncomeSource, Merchant, Obligation, Transaction
from app.models.enums import IncomeStatus, ObligationFrequency, TransactionKind
from app.schemas.domain import QuickAddRequest, QuickAddResponse


def _normalize_name(value: str) -> str:
    return value.strip().lower()


def _find_account(db: Session, owner_id: str, name: str) -> Account | None:
    if not name.strip():
        return None
    accounts = db.query(Account).filter(Account.owner_id == owner_id).all()
    lookup = _normalize_name(name)
    for account in accounts:
        if _normalize_name(account.name) == lookup:
            return account
    return None


def _find_or_create_category(db: Session, owner_id: str, name: str) -> Category | None:
    cleaned = name.strip()
    if not cleaned:
        return None
    existing = db.query(Category).filter(Category.owner_id == owner_id, Category.name == cleaned).one_or_none()
    if existing is not None:
        return existing
    created = Category(owner_id=owner_id, name=cleaned)
    db.add(created)
    db.flush()
    return created


def _find_or_create_merchant(db: Session, owner_id: str, name: str) -> Merchant | None:
    cleaned = name.strip()
    if not cleaned:
        return None
    existing = db.query(Merchant).filter(Merchant.owner_id == owner_id, Merchant.name == cleaned).one_or_none()
    if existing is not None:
        return existing
    created = Merchant(owner_id=owner_id, name=cleaned)
    db.add(created)
    db.flush()
    return created


def _find_or_create_income_source(db: Session, owner_id: str, name: str) -> IncomeSource | None:
    cleaned = name.strip()
    if not cleaned:
        return None
    existing = db.query(IncomeSource).filter(IncomeSource.owner_id == owner_id, IncomeSource.name == cleaned).one_or_none()
    if existing is not None:
        return existing
    created = IncomeSource(owner_id=owner_id, name=cleaned)
    db.add(created)
    db.flush()
    return created


def _transaction_notes(title: str, notes: str) -> str | None:
    cleaned_title = title.strip()
    cleaned_notes = notes.strip()
    if cleaned_title and cleaned_notes:
        return f"{cleaned_title}\n\n{cleaned_notes}"
    return cleaned_title or cleaned_notes or None


def _to_frequency(value: str) -> ObligationFrequency:
    mapping = {
        "one-time": ObligationFrequency.one_time,
        "weekly": ObligationFrequency.weekly,
        "biweekly": ObligationFrequency.biweekly,
        "monthly": ObligationFrequency.monthly,
    }
    return mapping.get(value, ObligationFrequency.one_time)


class QuickAddService:
    def __init__(self, db: Session, owner_id: str):
        self.db = db
        self.owner_id = owner_id

    def submit(self, payload: QuickAddRequest) -> QuickAddResponse:
        account = _find_account(self.db, self.owner_id, payload.account)
        account_id = account.id if account else None

        if payload.kind == "expense":
            category = _find_or_create_category(self.db, self.owner_id, payload.category)
            merchant = _find_or_create_merchant(
                self.db,
                self.owner_id,
                payload.merchant_or_source.strip() or payload.title.strip() or "Manual entry",
            )
            transaction = Transaction(
                owner_id=self.owner_id,
                kind=TransactionKind.expense,
                amount=payload.amount,
                account_id=account_id,
                category_id=category.id if category else None,
                merchant_id=merchant.id if merchant else None,
                occurred_on=payload.date,
                notes=_transaction_notes(payload.title, payload.notes),
                is_planned=False,
                is_cleared=True,
            )
            self.db.add(transaction)
            self.db.flush()

            obligation_id = None
            if payload.save_as_obligation or payload.recurrence != "one-time":
                obligation = Obligation(
                    owner_id=self.owner_id,
                    name=payload.title.strip() or payload.merchant_or_source.strip() or "Upcoming expense",
                    amount=payload.amount,
                    due_on=payload.obligation_due_date or payload.date,
                    frequency=_to_frequency(payload.recurrence),
                    is_paid=False,
                    is_recurring=payload.recurrence != "one-time",
                    notes=payload.notes.strip() or None,
                )
                self.db.add(obligation)
                self.db.flush()
                obligation_id = obligation.id

            self.db.commit()
            return QuickAddResponse(ok=True, transaction_id=transaction.id, obligation_id=obligation_id)

        if payload.status == "expected":
            income_entry = IncomeEntry(
                owner_id=self.owner_id,
                source_name=payload.merchant_or_source.strip() or payload.title.strip() or "Expected income",
                amount=payload.amount,
                status=IncomeStatus.expected,
                expected_on=payload.date,
                account_id=account_id,
                notes=payload.notes.strip() or None,
            )
            self.db.add(income_entry)
            self.db.commit()
            self.db.refresh(income_entry)
            return QuickAddResponse(ok=True, income_entry_id=income_entry.id)

        category = _find_or_create_category(self.db, self.owner_id, payload.category)
        source = _find_or_create_income_source(
            self.db,
            self.owner_id,
            payload.merchant_or_source.strip() or payload.title.strip() or "Manual income",
        )
        transaction = Transaction(
            owner_id=self.owner_id,
            kind=TransactionKind.income,
            amount=payload.amount,
            account_id=account_id,
            category_id=category.id if category else None,
            income_source_id=source.id if source else None,
            occurred_on=payload.date,
            notes=_transaction_notes(payload.title, payload.notes),
            is_planned=False,
            is_cleared=True,
        )
        self.db.add(transaction)
        self.db.flush()

        income_entry_id = None
        if payload.recurrence != "one-time":
            recurring_income = IncomeEntry(
                owner_id=self.owner_id,
                source_name=payload.merchant_or_source.strip() or payload.title.strip() or "Recurring income",
                amount=payload.amount,
                status=IncomeStatus.expected,
                expected_on=payload.date,
                account_id=account_id,
                notes=payload.notes.strip() or None,
            )
            self.db.add(recurring_income)
            self.db.flush()
            income_entry_id = recurring_income.id

        self.db.commit()
        return QuickAddResponse(ok=True, transaction_id=transaction.id, income_entry_id=income_entry_id)
