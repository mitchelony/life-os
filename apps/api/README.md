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
- Supabase bearer auth is the main auth path

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

## Setup

From the repository root:

```bash
cd /Users/MAC/GitHub/life-os
python3 -m venv .venv
source .venv/bin/activate
pip install -U pip
pip install -r apps/api/requirements-dev.txt
cp .env.example .env
```

Fill the repo-level `.env` with your hosted Supabase values before starting the API.

Required fields:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
- `SUPABASE_DB_URL`
- `AUTH_STRATEGY=supabase`
- `ALLOW_DEV_LOGIN=false`

If you use the Supabase pooler, the Postgres username must be `postgres.<project_ref>`.
`SUPABASE_URL`, `DATABASE_URL`, and `SUPABASE_DB_URL` must all reference the same hosted Supabase project.

## Run the API

The normal development path now uses the hosted Supabase project. Start the API from the repository root:

```bash
cd /Users/MAC/GitHub/life-os
source .venv/bin/activate
npm run dev:api
```

Default bind and local addresses:

- `http://0.0.0.0:8000`
- `http://127.0.0.1:8000`
- `http://<your-mac-lan-ip>:8000`

Why this matters:

- mobile auth and onboarding checks hit the API through your LAN IP when the web app is opened on a phone
- if the API only binds to `127.0.0.1`, the phone cannot reach `/api/onboarding/start` after Google auth

Startup guardrails:

- the API now raises a startup error if `SUPABASE_URL` and `DATABASE_URL` resolve to different Supabase project refs
- this is intentional and should be fixed by correcting env vars, not bypassed in code

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
- `SUPABASE_DB_URL`
- `AUTH_STRATEGY`
- `ALLOW_DEV_LOGIN`
- `CORS_ALLOWED_ORIGINS`
- `ALLOWED_ORIGIN` - optional legacy single-origin fallback, still honored for local LAN testing

Notes:

- local development should normally use `AUTH_STRATEGY=supabase`
- `DATABASE_URL` should point at hosted or local Supabase Postgres
- `DEV_OWNER_TOKEN` is now optional local fallback only
- `ALLOW_DEV_LOGIN` should stay `false` unless you explicitly need the fallback
- browser requests should come from `http://localhost:3000` or `http://localhost:3001` unless you also update `CORS_ALLOWED_ORIGINS`
- the API also honors legacy `ALLOWED_ORIGIN` so an existing root `.env` can open CORS for a single LAN origin like `http://192.168.1.162:3000`

## Tests

Run all backend tests:

```bash
cd /Users/MAC/GitHub/life-os/apps/api
source ../../.venv/bin/activate
python3 -m pytest
```

Run targeted tests:

```bash
python3 -m pytest tests/test_auth.py tests/test_available_spend.py tests/test_dashboard.py
```

Focused regression coverage added for the hosted-auth path:

```bash
python3 -m pytest tests/test_config.py tests/test_onboarding.py tests/test_settings_bootstrap.py
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
- Treat the current dev-token fallback as a local-only escape hatch, not the normal auth path
- Onboarding/profile bootstrap should remain tolerant of duplicate historical owner rows until all environments are confirmed clean
