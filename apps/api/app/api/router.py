from fastapi import APIRouter

from app.api.routes.accounts import router as accounts_router
from app.api.routes.auth import router as auth_router
from app.api.routes.available_spend import router as available_spend_router
from app.api.routes.categories import router as categories_router
from app.api.routes.dashboard import router as dashboard_router
from app.api.routes.debts import router as debts_router
from app.api.routes.income_entries import router as income_entries_router
from app.api.routes.income_sources import router as income_sources_router
from app.api.routes.merchants import router as merchants_router
from app.api.routes.obligations import router as obligations_router
from app.api.routes.onboarding import router as onboarding_router
from app.api.routes.reserves import router as reserves_router
from app.api.routes.settings import router as settings_router
from app.api.routes.suggestions import router as suggestions_router
from app.api.routes.tasks import router as tasks_router
from app.api.routes.transactions import router as transactions_router

api_router = APIRouter(prefix="/api")
api_router.include_router(auth_router)
api_router.include_router(dashboard_router)
api_router.include_router(onboarding_router)
api_router.include_router(accounts_router)
api_router.include_router(categories_router)
api_router.include_router(merchants_router)
api_router.include_router(income_sources_router)
api_router.include_router(transactions_router)
api_router.include_router(income_entries_router)
api_router.include_router(obligations_router)
api_router.include_router(debts_router)
api_router.include_router(tasks_router)
api_router.include_router(reserves_router)
api_router.include_router(settings_router)
api_router.include_router(suggestions_router)
api_router.include_router(available_spend_router)
