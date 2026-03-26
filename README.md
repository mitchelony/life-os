# Life OS

Life OS is a private, single-user life management app designed to make money and responsibilities easier to see and act on.

The product is built around a small set of questions:

- What needs attention next?
- What comes after that?
- How much can I safely spend before the next income arrives?
- What debt, bill, or task needs action this week?

This repository contains the full MVP codebase: a Next.js web app, a FastAPI backend, Supabase database assets, and product documentation.

## Project Status

Life OS is currently in MVP development.

- Manual entry is the source of truth.
- The backend and web app now prefer API-backed persistence for the core MVP flows.
- Supabase Postgres and Supabase Auth are now the live persistence and auth path.
- The product is intentionally owner-only. There is no team or multi-user model.

## Repository Structure

```text
apps/
  api/        FastAPI backend
  web/        Next.js App Router frontend
docs/         Product and architecture documents
supabase/     Migrations, hosted setup reference, and optional local Supabase assets
```

Key references:

- [Product requirements](/Users/MAC/GitHub/life-os/docs/PRD.md)
- [Architecture notes](/Users/MAC/GitHub/life-os/docs/ARCHITECTURE.md)
- [Current working state](/Users/MAC/GitHub/life-os/docs/WORKING_STATE.md)
- [Contributor contract](/Users/MAC/GitHub/life-os/AGENTS.md)

## Tech Stack

- Frontend: Next.js App Router, React, TypeScript, Tailwind CSS, Framer Motion
- Backend: FastAPI, Pydantic, SQLAlchemy
- Database: Supabase Postgres
- Auth: Supabase email/password and Google OAuth

## Prerequisites

Install the following before working in the repo:

- Node.js 20+
- Python 3.11+
- npm
- `nvm` for Node version management
- a local Python virtual environment

Optional:

- Supabase CLI if you want to run a local Supabase stack later

## Quick Start

### 1. Clone and enter the repo

```bash
git clone https://github.com/mitchelony/life-os.git
cd life-os
```

### 2. Use Node 20

```bash
source ~/.nvm/nvm.sh
nvm install 20
nvm use 20
node -v
npm -v
```

### 3. Create the Python environment

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -U pip
pip install -r apps/api/requirements-dev.txt
```

### 4. Create local environment config

```bash
cp .env.example .env
```

Fill `.env` with your hosted Supabase values:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
- `SUPABASE_DB_URL`

Important:

- if you use the Supabase pooler, the Postgres username must be `postgres.<project_ref>`
- keep `AUTH_STRATEGY=supabase`
- keep `ALLOW_DEV_LOGIN=false` unless you are intentionally debugging the local fallback
- `SUPABASE_URL`, `DATABASE_URL`, and `SUPABASE_DB_URL` must all point at the same hosted Supabase project
- the API now fails fast at startup if auth and database env vars point at different Supabase project refs

### 5. Create frontend env config

```bash
cp apps/web/.env.example apps/web/.env.local
```

Set these to the same hosted project:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_API_BASE_URL`

### 6. Create the owner account in Supabase

In the hosted Supabase dashboard:

- enable Email provider
- enable Google provider if you want Google sign-in
- add redirect URLs:
  - `http://localhost:3000/auth/callback`
  - `http://localhost:3001/auth/callback`
- use `http://localhost:3000` or `http://localhost:3001` for browser validation, not `http://127.0.0.1:3000`, unless you also change API CORS config
- create the owner user through Auth or sign up through the app

### 7. Install frontend dependencies

```bash
npm install
```

### 8. Start the apps

In one terminal:

```bash
cd /Users/MAC/GitHub/life-os
source .venv/bin/activate
npm run dev:api
```

`dev:api` now binds to `0.0.0.0:8000` by default so phones on your LAN can reach the backend during mobile auth and onboarding checks.

In another terminal:

```bash
cd /Users/MAC/GitHub/life-os
source ~/.nvm/nvm.sh
nvm use 20
npm run dev:web
```

## Local Development Workflow

### Frontend

- Dev server: `npm run dev:web`
- Build: `npm run build:web`
- Lint: `npm run lint:web`
- Tests:

```bash
npm --workspace apps/web run test
```

### Backend

- Dev server:

```bash
source .venv/bin/activate
npm run dev:api
```

- default bind address for the dev API is now `0.0.0.0:8000`
- override with exported shell vars if needed:

```bash
API_HOST=127.0.0.1 API_PORT=8010 npm run dev:api
```

- Tests:

```bash
cd apps/api
source ../../.venv/bin/activate
python3 -m pytest
```

## Auth and Onboarding

The app is now owner-authenticated through Supabase.

Current auth behavior:

- sign in with email/password or Google
- first successful sign-in routes through the onboarding decision path
- incomplete onboarding goes to `Settings`
- completed onboarding goes to `Dashboard`
- logout returns directly to `/login`
- onboarding/profile bootstrap is defensive against duplicate historical owner rows instead of crashing with `500`

## Deployment

Production deployment uses:

- Vercel for `apps/web`
- Render for `apps/api`
- hosted Supabase for Postgres and Auth

Use the runbook in [docs/DEPLOYMENT.md](/Users/MAC/Github/life-os/docs/DEPLOYMENT.md).

## Database and Supabase

Hosted Supabase is the normal path right now.

Use [supabase/README.md](/Users/MAC/GitHub/life-os/supabase/README.md) for:

- hosted project setup
- schema application
- optional local Supabase workflow

Current verification note:

- the active hosted `life-os` Supabase schema is in the expected owner-scoped shape
- the main setup risk is local env drift between Supabase auth config and database URLs

## Security Notes

This app handles sensitive financial information. Keep the following in mind:

- Do not expose the development API outside your local machine.
- Keep `.env`, `.venv`, Supabase local data, and generated build output out of cloud-sync tools when possible.
- The browser should not be treated as a secure storage boundary.
- Supabase owner auth is the normal path. The dev-token fallback is local-only and should stay disabled unless you explicitly need it.

## Product Principles

- Single user only
- Calm and high-signal dashboard
- Explainable available-spend math
- Mobile-first interaction
- Manual entry before automation

## Contribution Guidance

Before making major changes, read:

- [AGENTS.md](/Users/MAC/GitHub/life-os/AGENTS.md)
- [docs/PRD.md](/Users/MAC/GitHub/life-os/docs/PRD.md)
- [docs/ARCHITECTURE.md](/Users/MAC/GitHub/life-os/docs/ARCHITECTURE.md)

These documents define the product scope, architecture, and UX constraints for the MVP.
