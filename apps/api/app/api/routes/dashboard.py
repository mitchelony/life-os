from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_owner_id
from app.models.domain import Account, AppSetting, Category, Debt, IncomeEntry, IncomeSource, Merchant, Obligation, Reserve, Task, Transaction
from app.schemas.domain import DashboardResponse, DashboardSnapshot
from app.services.dashboard import DashboardService

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("", response_model=DashboardResponse)
def get_dashboard(db: Session = Depends(get_db), owner_id: str = Depends(get_owner_id)) -> DashboardResponse:
    settings_rows = db.query(AppSetting).filter(AppSetting.owner_id == owner_id).all()
    settings = {row.key: row.value for row in settings_rows}
    snapshot = DashboardSnapshot(
        accounts=db.query(Account).filter(Account.owner_id == owner_id).all(),
        obligations=db.query(Obligation).filter(Obligation.owner_id == owner_id).all(),
        debts=db.query(Debt).filter(Debt.owner_id == owner_id).all(),
        tasks=db.query(Task).filter(Task.owner_id == owner_id).all(),
        income_entries=db.query(IncomeEntry).filter(IncomeEntry.owner_id == owner_id).all(),
        transactions=db.query(Transaction).filter(Transaction.owner_id == owner_id).all(),
        categories=db.query(Category).filter(Category.owner_id == owner_id).all(),
        merchants=db.query(Merchant).filter(Merchant.owner_id == owner_id).all(),
        income_sources=db.query(IncomeSource).filter(IncomeSource.owner_id == owner_id).all(),
        reserves=db.query(Reserve).filter(Reserve.owner_id == owner_id).all(),
        settings=settings,
        protected_cash_buffer=float(settings.get("protected_cash_buffer", "0") or 0),
        essential_spend_target=float(settings.get("essential_spend_target", "0") or 0),
    )
    return DashboardService(snapshot).build()
