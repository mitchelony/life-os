from datetime import date

from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.models.domain import Account, AppSetting, Debt, IncomeEntry, Obligation, Reserve, RoadmapItem, StrategyDocument
from app.models.enums import DebtStatus, IncomeStatus, ObligationFrequency, ReserveKind
from app.schemas.domain import SettingsBootstrapPayload
from app.services.onboarding import complete_onboarding, ensure_owner_profile


def _normalize_name(value: str) -> str:
    return value.strip().lower()


def _upsert_setting(db: Session, owner_id: str, key: str, value: str) -> None:
    setting = db.query(AppSetting).filter(AppSetting.owner_id == owner_id, AppSetting.key == key).one_or_none()
    if setting is None:
        setting = AppSetting(owner_id=owner_id, key=key, value=value)
        db.add(setting)
    else:
        setting.value = value
    db.flush()


def _parse_amount(value: str) -> float:
    try:
        return float(value or 0)
    except ValueError:
        return 0.0


def _parse_date(value: str) -> date:
    return date.fromisoformat(value)


def _to_frequency(value: str) -> ObligationFrequency:
    mapping = {
        "one-time": ObligationFrequency.one_time,
        "weekly": ObligationFrequency.weekly,
        "biweekly": ObligationFrequency.biweekly,
        "monthly": ObligationFrequency.monthly,
    }
    return mapping.get(value, ObligationFrequency.one_time)


class SettingsBootstrapService:
    def __init__(self, db: Session, owner_id: str):
        self.db = db
        self.owner_id = owner_id

    def read(self) -> SettingsBootstrapPayload:
        ensure_owner_profile(self.db, self.owner_id)
        profile = ensure_owner_profile(self.db, self.owner_id)
        settings_rows = self.db.query(AppSetting).filter(AppSetting.owner_id == self.owner_id).all()
        settings = {row.key: row.value for row in settings_rows}
        accounts = self.db.query(Account).filter(Account.owner_id == self.owner_id, Account.is_active.is_(True)).all()
        obligations = self.db.query(Obligation).filter(Obligation.owner_id == self.owner_id).all()
        debts = self.db.query(Debt).filter(Debt.owner_id == self.owner_id).all()
        income_entries = self.db.query(IncomeEntry).filter(IncomeEntry.owner_id == self.owner_id, IncomeEntry.status == IncomeStatus.expected).all()
        roadmap_items = self.db.query(RoadmapItem).filter(RoadmapItem.owner_id == self.owner_id).all()
        strategy_document = (
            self.db.query(StrategyDocument)
            .filter(StrategyDocument.owner_id == self.owner_id, StrategyDocument.is_active.is_(True))
            .order_by(StrategyDocument.updated_at.desc())
            .one_or_none()
        )
        checking_name = next((account.name for account in accounts if account.type == "checking"), None)
        reserve = (
            self.db.query(Reserve)
            .filter(Reserve.owner_id == self.owner_id, Reserve.kind == ReserveKind.manual, Reserve.is_active.is_(True))
            .order_by(Reserve.created_at.desc())
            .one_or_none()
        )

        return SettingsBootstrapPayload(
            display_name=profile.display_name or "Life owner",
            protected_buffer=settings.get("protected_cash_buffer", "0"),
            essential_target=settings.get("essential_spend_target", "0"),
            savings_floor=settings.get("savings_floor", str(float(reserve.amount)) if reserve else "0"),
            notes=settings.get("owner_notes", ""),
            accounts=[
                {
                    "name": item.name,
                    "institution": item.institution or "",
                    "type": item.type,
                    "balance": f"{float(item.balance):.2f}",
                }
                for item in accounts
            ],
            obligations=[
                {
                    "name": item.name,
                    "amount": f"{float(item.amount):.2f}",
                    "due_date": item.due_on.isoformat(),
                    "recurrence": str(getattr(item.frequency, "value", item.frequency)).replace("_", "-"),
                    "linked_account": checking_name,
                }
                for item in obligations
            ],
            debts=[
                {
                    "name": item.name,
                    "balance": f"{float(item.balance):.2f}",
                    "minimum": f"{float(item.minimum_payment):.2f}",
                    "due_date": (item.due_on or date.today()).isoformat(),
                }
                for item in debts
            ],
            income=[
                {
                    "source": item.source_name,
                    "expected_amount": f"{float(item.amount):.2f}",
                    "due_date": (item.expected_on or date.today()).isoformat(),
                    "recurrence": "one-time",
                    "linked_account": next((account.name for account in accounts if account.id == item.account_id), checking_name),
                }
                for item in income_entries
            ],
            roadmap_items=[
                {
                    "id": item.id,
                    "title": item.title,
                    "description": item.description,
                    "category": item.category,
                    "status": item.status,
                    "priority": item.priority,
                    "target_date": item.target_date.isoformat() if item.target_date else None,
                    "timeframe_label": item.timeframe_label,
                    "progress_mode": item.progress_mode,
                    "progress_value": float(item.progress_value),
                    "steps": item.steps or [],
                    "notes": item.notes,
                    "dependency_ids": item.dependency_ids or [],
                    "linked_strategy_goal_id": item.linked_strategy_goal_id,
                    "strategy_backed": item.strategy_backed,
                }
                for item in roadmap_items
            ],
            strategy_document=strategy_document.document if strategy_document else None,
        )

    def replace(self, payload: SettingsBootstrapPayload) -> SettingsBootstrapPayload:
        profile = ensure_owner_profile(self.db, self.owner_id, payload.display_name.strip() or None)
        profile.display_name = payload.display_name.strip() or None

        _upsert_setting(self.db, self.owner_id, "protected_cash_buffer", payload.protected_buffer)
        _upsert_setting(self.db, self.owner_id, "essential_spend_target", payload.essential_target)
        _upsert_setting(self.db, self.owner_id, "savings_floor", payload.savings_floor)
        _upsert_setting(self.db, self.owner_id, "owner_notes", payload.notes)

        existing_accounts = { _normalize_name(item.name): item for item in self.db.query(Account).filter(Account.owner_id == self.owner_id).all() }
        seen_accounts: set[str] = set()
        for item in payload.accounts:
            key = _normalize_name(item.name)
            if not key:
                continue
            seen_accounts.add(key)
            account = existing_accounts.get(key)
            if account is None:
                account = Account(owner_id=self.owner_id, name=item.name.strip())
                self.db.add(account)
            account.name = item.name.strip()
            account.institution = item.institution.strip() or None
            account.type = item.type
            account.balance = _parse_amount(item.balance)
            account.is_active = True
        for key, account in existing_accounts.items():
            if key not in seen_accounts:
                account.is_active = False

        self.db.execute(delete(Obligation).where(Obligation.owner_id == self.owner_id))
        self.db.execute(delete(Debt).where(Debt.owner_id == self.owner_id))
        self.db.execute(delete(IncomeEntry).where(IncomeEntry.owner_id == self.owner_id, IncomeEntry.status == IncomeStatus.expected))
        self.db.execute(delete(Reserve).where(Reserve.owner_id == self.owner_id, Reserve.kind == ReserveKind.manual))
        self.db.execute(delete(RoadmapItem).where(RoadmapItem.owner_id == self.owner_id))
        self.db.execute(delete(StrategyDocument).where(StrategyDocument.owner_id == self.owner_id))
        self.db.flush()

        for item in payload.obligations:
            if not item.name.strip():
                continue
            self.db.add(
                Obligation(
                    owner_id=self.owner_id,
                    name=item.name.strip(),
                    amount=_parse_amount(item.amount),
                    due_on=_parse_date(item.due_date),
                    frequency=_to_frequency(item.recurrence),
                    is_paid=False,
                    is_recurring=item.recurrence != "one-time",
                )
            )

        for item in payload.debts:
            if not item.name.strip():
                continue
            self.db.add(
                Debt(
                    owner_id=self.owner_id,
                    name=item.name.strip(),
                    balance=_parse_amount(item.balance),
                    minimum_payment=_parse_amount(item.minimum),
                    due_on=_parse_date(item.due_date),
                    status=DebtStatus.active,
                )
            )

        accounts = { _normalize_name(item.name): item for item in self.db.query(Account).filter(Account.owner_id == self.owner_id, Account.is_active.is_(True)).all() }
        for item in payload.income:
            if not item.source.strip():
                continue
            linked_account = accounts.get(_normalize_name(item.linked_account or ""))
            self.db.add(
                IncomeEntry(
                    owner_id=self.owner_id,
                    source_name=item.source.strip(),
                    amount=_parse_amount(item.expected_amount),
                    status=IncomeStatus.expected,
                    expected_on=_parse_date(item.due_date),
                    account_id=linked_account.id if linked_account else None,
                )
            )

        self.db.add(
            Reserve(
                owner_id=self.owner_id,
                name="Savings floor",
                amount=_parse_amount(payload.savings_floor),
                kind=ReserveKind.manual,
                is_active=True,
                notes="Set from Settings.",
            )
        )

        for item in payload.roadmap_items:
            if not item.title.strip():
                continue
            self.db.add(
                RoadmapItem(
                    id=item.id,
                    owner_id=self.owner_id,
                    title=item.title.strip(),
                    description=item.description.strip(),
                    category=item.category,
                    status=item.status,
                    priority=item.priority,
                    target_date=_parse_date(item.target_date) if item.target_date else None,
                    timeframe_label=item.timeframe_label.strip() if item.timeframe_label else None,
                    progress_mode=item.progress_mode,
                    progress_value=item.progress_value,
                    steps=[step.model_dump() for step in item.steps],
                    dependency_ids=item.dependency_ids,
                    notes=item.notes.strip() if item.notes else None,
                    linked_strategy_goal_id=item.linked_strategy_goal_id,
                    strategy_backed=item.strategy_backed,
                )
            )

        if payload.strategy_document:
            self.db.add(
                StrategyDocument(
                    owner_id=self.owner_id,
                    version=int(payload.strategy_document.get("version", 1)),
                    name=str(payload.strategy_document.get("name", "Strategy")),
                    is_active=True,
                    document=payload.strategy_document,
                )
            )

        self.db.commit()
        complete_onboarding(self.db, self.owner_id)
        return self.read()
