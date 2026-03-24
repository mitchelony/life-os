# Life OS

Life OS is a private, single-user life management app focused on financial clarity, upcoming responsibilities, quick logging, and calm daily decision-making.

This repository is structured as a monorepo:

- `apps/web`: Next.js PWA client
- `apps/api`: FastAPI backend
- `supabase`: SQL migrations, seed data, and local Supabase guidance
- `docs`: PRD and supporting docs

## Why This App Exists

The app is designed to answer a few questions immediately:

- What is next?
- What comes after that?
- What can I safely spend right now?
- What bills or debts need attention?
- What actions matter this week?

The product is intentionally single-user. It should feel private, calm, elegant, and operational rather than analytical or enterprise-heavy.

## Stack

- Frontend: Next.js, React, TypeScript, Tailwind CSS, Framer Motion
- Backend: FastAPI, Pydantic, SQLAlchemy
- Data: Supabase Postgres, Supabase Auth

## Local Developer Steps

1. Upgrade Node to 20 LTS.
   Why: the web app is scaffolded for a modern Next.js toolchain that does not support Node 16.

   Example with `nvm`:

   ```bash
   nvm install 20
   nvm use 20
   node --version
   ```

2. Create a Python virtual environment.
   Why: the API uses FastAPI and Python dependencies isolated from your global interpreter.

   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -U pip
   pip install -r apps/api/requirements-dev.txt
   ```

3. Copy the environment template.
   Why: both the API and web app expect shared local configuration.

   ```bash
   cp .env.example .env
   ```

4. Start local Supabase and apply schema.
   Why: the app depends on Postgres tables, policies, and seed data.

   See [supabase/README.md](/Users/MAC/Documents/GitHub/life-os/supabase/README.md).

5. Install the web dependencies.
   Why: the frontend source is included in the repo, but packages still need to be installed locally.

   ```bash
   npm install
   ```

6. Run the API and web app in separate terminals.

   API:

   ```bash
   source .venv/bin/activate
   npm run dev:api
   ```

   Web:

   ```bash
   npm run dev:web
   ```

## Notes On Auth

- Production should use owner-only Supabase magic link auth.
- Local development includes a lightweight dev-login path for bootstrapping the single owner account.

## Core Product Documents

- [Product Requirements](/Users/MAC/Documents/GitHub/life-os/docs/PRD.md)
- [Agent Build Contract](/Users/MAC/Documents/GitHub/life-os/AGENTS.md)
