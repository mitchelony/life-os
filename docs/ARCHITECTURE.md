# Architecture Notes

## Repo Layout

- `apps/web`: Next.js App Router frontend
- `apps/api`: FastAPI backend
- `supabase`: SQL migrations and local setup
- `docs`: PRD and build guidance

## Domain Shape

- `transactions` are actual money movement
- `income_entries` are forecast/planning records
- `obligations` and `debts` drive urgency and reserve calculations
- `tasks` capture operational actions outside raw finances
- `app_settings` and `reserves` shape spendability

## API Shape

- `GET /dashboard`
- `GET /available-spend/explain`
- `POST /onboarding/complete`
- CRUD routes for core entities

## Implementation Notes

- Keep the API the source of business truth.
- Keep the frontend optimized for clarity and speed.
- Keep the database additive and readable.

