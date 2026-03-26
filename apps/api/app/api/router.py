from fastapi import APIRouter

from app.api.routes.actions import router as actions_router
from app.api.routes.activity import router as activity_router
from app.api.routes.accounts import router as accounts_router
from app.api.routes.auth import router as auth_router
from app.api.routes.available_spend import router as available_spend_router
from app.api.routes.categories import router as categories_router
from app.api.routes.dashboard import router as dashboard_router
from app.api.routes.income_plans import allocations_router as income_plan_allocations_router
from app.api.routes.income_plans import router as income_plans_router
from app.api.routes.debts import router as debts_router
from app.api.routes.income_entries import router as income_entries_router
from app.api.routes.income_sources import router as income_sources_router
from app.api.routes.merchants import router as merchants_router
from app.api.routes.obligations import router as obligations_router
from app.api.routes.onboarding import router as onboarding_router
from app.api.routes.planning import router as planning_router
from app.api.routes.progress import router as progress_router
from app.api.routes.quick_add import router as quick_add_router
from app.api.routes.roadmap import goals_router as roadmap_goals_router
from app.api.routes.roadmap import router as roadmap_router
from app.api.routes.roadmap import steps_router as roadmap_steps_router
from app.api.routes.reserves import router as reserves_router
from app.api.routes.settings import router as settings_router
from app.api.routes.suggestions import router as suggestions_router
from app.api.routes.tasks import router as tasks_router
from app.api.routes.transactions import router as transactions_router

api_router = APIRouter(prefix="/api")
api_router.include_router(auth_router)
api_router.include_router(dashboard_router)
api_router.include_router(actions_router)
api_router.include_router(activity_router)
api_router.include_router(onboarding_router)
api_router.include_router(planning_router)
api_router.include_router(progress_router)
api_router.include_router(quick_add_router)
api_router.include_router(roadmap_router)
api_router.include_router(roadmap_goals_router)
api_router.include_router(roadmap_steps_router)
api_router.include_router(accounts_router)
api_router.include_router(categories_router)
api_router.include_router(income_plans_router)
api_router.include_router(income_plan_allocations_router)
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
