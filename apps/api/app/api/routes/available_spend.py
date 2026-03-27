from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_owner_id
from app.models.domain import Account, AppSetting, Debt, IncomeEntry, IncomePlan, Obligation, Reserve, Transaction
from app.schemas.domain import AvailableSpendExplainResponse
from app.services.available_spend import AvailableSpendInput, build_available_spend_input, compute_available_spend

router = APIRouter(prefix="/available-spend", tags=["available-spend"])


@router.get("/explain", response_model=AvailableSpendExplainResponse)
def explain_available_spend_from_data(
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_owner_id),
) -> AvailableSpendExplainResponse:
    settings_rows = db.query(AppSetting).filter(AppSetting.owner_id == owner_id).all()
    settings = {row.key: row.value for row in settings_rows}
    payload = build_available_spend_input(
        accounts=db.query(Account).filter(Account.owner_id == owner_id).all(),
        obligations=db.query(Obligation).filter(Obligation.owner_id == owner_id).all(),
        debts=db.query(Debt).filter(Debt.owner_id == owner_id).all(),
        reserves=db.query(Reserve).filter(Reserve.owner_id == owner_id).all(),
        income_entries=db.query(IncomeEntry).filter(IncomeEntry.owner_id == owner_id).all(),
        income_plans=db.query(IncomePlan).filter(IncomePlan.owner_id == owner_id).all(),
        transactions=db.query(Transaction).filter(Transaction.owner_id == owner_id).all(),
        settings=settings,
    )
    return compute_available_spend(payload)


@router.post("/explain", response_model=AvailableSpendExplainResponse)
def explain_available_spend(
    payload: AvailableSpendInput,
    _: str = Depends(get_owner_id),
) -> AvailableSpendExplainResponse:
    return compute_available_spend(payload)
