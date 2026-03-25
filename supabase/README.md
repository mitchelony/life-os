# Life OS Supabase

This directory contains the database assets for Life OS.

It is the canonical database layer for the product and includes:

- SQL migrations
- local seed data for optional local Supabase use
- Supabase project configuration

The active product path is a hosted Supabase project. Local Supabase remains optional for isolated development.

## Directory Contents

```text
config.toml      optional local Supabase config
migrations/      canonical schema changes
seed.sql         optional local development seed data
```

## Database Design Principles

- every row is owner-scoped
- `transactions` are the source of truth for real money movement
- `income_entries` represent expected or planned income
- obligations and debts drive urgency and spendability logic
- migrations should be additive and readable

## Hosted Supabase Setup

The hosted project is the default path right now.

Recommended flow:

1. Create a new hosted Supabase project
2. Run the canonical schema SQL from `supabase/migrations/20260323000100_initial_schema.sql`
3. Enable Email auth
4. Enable Google auth if desired
5. Add redirect URLs:
   - `http://localhost:3000/auth/callback`
   - `http://localhost:3001/auth/callback`
6. Create the owner user through Auth or sign up through the app
7. Point repo `.env` and `apps/web/.env.local` at the same hosted project

Notes:

- the auth trigger creates `profiles`, `onboarding_state`, and default `app_settings` rows for new users
- if you use the Supabase pooler, the database username must be `postgres.<project_ref>`
- hosted SQL should be treated as the real schema path; do not depend on runtime `create_all()`
- repo `.env` and `apps/web/.env.local` must all target the same hosted project; do not mix one project's `SUPABASE_URL` with another project's pooler URL
- local browser validation should use `http://localhost:3000` or `http://localhost:3001` unless API CORS is expanded

## Optional Local Supabase Setup

Prerequisite:

- install the Supabase CLI

From the repository root:

```bash
cd /Users/MAC/GitHub/life-os
supabase start
supabase db reset
```

What this does:

- starts the local Supabase services
- applies the migrations in `supabase/migrations`
- runs `supabase/seed.sql`

## Optional Hosted CLI Workflow

If you want to manage the hosted project through the CLI:

```bash
supabase link --project-ref <project-ref>
```

Push migrations:

```bash
supabase db push
```

Use caution with seed data on hosted environments. `seed.sql` is meant for local development unless you intentionally want starter data in a hosted project.

## Seed Data and Owner UUID

The seed file uses a fixed owner UUID to keep local development predictable.

The current local seed also creates the owner auth account directly in Supabase Auth:

- email: `owner@life-os.local`
- password: `life-os-local-dev`

Why this matters:

- row-level security depends on the authenticated owner id
- the seed keeps the auth user and the seeded financial data aligned
- local sign-in works immediately after `supabase db reset`

## Workflow Guidelines

- add new migrations instead of editing old applied migrations
- keep schema changes easy to review
- prefer explicit ownership rules over hidden database magic
- avoid putting core business logic into triggers when service-layer logic is more appropriate

## Recommended Commands

Start local stack:

```bash
supabase start
```

Reset database:

```bash
supabase db reset
```

Stop local stack:

```bash
supabase stop
```

## Manual Tasks You May Need To Do

- update the owner UUID in `seed.sql` if you want seeded data to match a real auth user
- rerun `supabase db reset` after migration changes when you need a clean local database
- run `supabase link` before `supabase db push` for a new hosted project

## Relationship to the Rest of the Repo

- [root README](/Users/MAC/GitHub/life-os/README.md) explains the full repo setup
- [apps/api/README.md](/Users/MAC/GitHub/life-os/apps/api/README.md) covers backend development
- [docs/ARCHITECTURE.md](/Users/MAC/GitHub/life-os/docs/ARCHITECTURE.md) captures the domain model and API direction
