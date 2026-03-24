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
- The web app is usable before full backend integration.
- The backend and database foundations exist, but Supabase production auth and data wiring are still being completed.
- The product is intentionally owner-only. There is no team or multi-user model.

## Repository Structure

```text
apps/
  api/        FastAPI backend
  web/        Next.js App Router frontend
docs/         Product and architecture documents
supabase/     Migrations, seed data, and local Supabase setup
```

Key references:

- [Product requirements](/Users/MAC/Documents/GitHub/life-os/docs/PRD.md)
- [Architecture notes](/Users/MAC/Documents/GitHub/life-os/docs/ARCHITECTURE.md)
- [Contributor contract](/Users/MAC/Documents/GitHub/life-os/AGENTS.md)

## Tech Stack

- Frontend: Next.js App Router, React, TypeScript, Tailwind CSS, Framer Motion
- Backend: FastAPI, Pydantic, SQLAlchemy
- Database: Supabase Postgres
- Local development: SQLite is still used for lightweight API development

## Prerequisites

Install the following before working in the repo:

- Node.js 20+
- Python 3.11+
- npm
- Supabase CLI

Optional but recommended:

- `nvm` for Node version management
- a local Python virtual environment

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

### 5. Install frontend dependencies

```bash
npm install
```

### 6. Start the apps

In one terminal:

```bash
cd /Users/MAC/Documents/GitHub/life-os
source .venv/bin/activate
npm run dev:api
```

In another terminal:

```bash
cd /Users/MAC/Documents/GitHub/life-os
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

- Tests:

```bash
cd apps/api
source ../../.venv/bin/activate
python3 -m pytest
```

## Database and Supabase

The repo includes Supabase migrations and seed data for the long-term production direction.

For local database work:

- see [supabase/README.md](/Users/MAC/Documents/GitHub/life-os/supabase/README.md)
- use `supabase start` for a local stack
- use `supabase db reset` to apply migrations and seed data

The current backend can still run locally with SQLite for lightweight development.

## Security Notes

This app handles sensitive financial information. Keep the following in mind:

- Do not expose the development API outside your local machine.
- Keep `.env`, `.venv`, SQLite files, and generated build output out of cloud-sync tools when possible.
- The browser should not be treated as a secure storage boundary.
- Production auth is intended to move to owner-only Supabase auth. The current dev auth path is for local development only.

## Product Principles

- Single user only
- Calm and high-signal dashboard
- Explainable available-spend math
- Mobile-first interaction
- Manual entry before automation

## Contribution Guidance

Before making major changes, read:

- [AGENTS.md](/Users/MAC/Documents/GitHub/life-os/AGENTS.md)
- [docs/PRD.md](/Users/MAC/Documents/GitHub/life-os/docs/PRD.md)
- [docs/ARCHITECTURE.md](/Users/MAC/Documents/GitHub/life-os/docs/ARCHITECTURE.md)

These documents define the product scope, architecture, and UX constraints for the MVP.
