# Life OS API

The API provides the backend foundation for the Life OS MVP.

It is built as a small, owner-only FastAPI service that handles:

- dashboard data
- explainable available-spend calculations
- onboarding state
- CRUD operations for accounts, transactions, income, obligations, debts, tasks, reserves, and settings

This service is intentionally simple. It is not a public multi-tenant API.

## Stack

- FastAPI
- Pydantic
- SQLAlchemy
- Python 3.11+

## Current Role in the Product

The API is responsible for business logic and stable response shapes.

Important product rules:

- `transactions` are the source of truth for actual money movement
- `income_entries` represent planned or expected income
- available-spend math must stay conservative and explainable
- auth is owner-only and lightweight during MVP
- Supabase email/password is the main auth path

## Project Layout

```text
app/
  api/        routers
  core/       config, database, shared dependencies
  models/     SQLAlchemy models and enums
  schemas/    Pydantic request/response schemas
  services/   business logic
tests/        API and service tests
```

## Local Setup

From the repository root:

```bash
cd /Users/MAC/GitHub/life-os
python3 -m venv .venv
source .venv/bin/activate
pip install -U pip
pip install -r apps/api/requirements-dev.txt
cp .env.example .env
```

## Run the API

Before starting the API, start local Supabase and reset the database:

```bash
cd /Users/MAC/GitHub/life-os
supabase start
supabase db reset
```

Then run the API from the repository root:

```bash
cd /Users/MAC/GitHub/life-os
source .venv/bin/activate
npm run dev:api
```

Default local address:

- `http://127.0.0.1:8000`

Health check:

- `GET /healthz`

## Environment Variables

The API reads settings from the repo-level `.env`.

Common local variables:

- `ENVIRONMENT`
- `DATABASE_URL`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `AUTH_STRATEGY`
- `ALLOW_DEV_LOGIN`

Notes:

- local development should normally use `AUTH_STRATEGY=supabase`
- `DATABASE_URL` should point at the local Supabase Postgres instance
- `DEV_OWNER_TOKEN` is now optional local fallback only
- `ALLOW_DEV_LOGIN` should stay `false` unless you explicitly need the fallback

## Tests

Run all backend tests:

```bash
cd /Users/MAC/Documents/GitHub/life-os/apps/api
source ../../.venv/bin/activate
python3 -m pytest
```

Run targeted tests:

```bash
python3 -m pytest tests/test_auth.py tests/test_available_spend.py tests/test_dashboard.py
```

## Design Guidelines

- Keep route handlers thin
- Put business logic in service modules
- Validate inputs and outputs with Pydantic
- Keep date-sensitive calculations deterministic
- Prefer explicit service methods over implicit model behavior

## Security Notes

This API handles financial data and should be treated as sensitive infrastructure.

- Do not expose local development auth on a public host
- Do not move `DEV_OWNER_TOKEN` into browser-visible config
- Keep docs and OpenAPI disabled outside development
- Treat the current dev auth path as temporary MVP infrastructure, not production auth

## Future Direction

Planned direction for production:

- Supabase-backed Postgres
- owner-only Supabase auth
- cleaner environment separation between local dev and hosted environments

Local owner seed for Supabase auth:

- email: `owner@life-os.local`
- password: `life-os-local-dev`
