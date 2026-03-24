# Life OS Supabase

This directory contains the database assets for Life OS.

It is the long-term data layer for the product and includes:

- SQL migrations
- local seed data
- Supabase project configuration

The current app is still in an MVP transition phase, so some local backend flows can run without full Supabase wiring. This folder documents the intended database path.

## Directory Contents

```text
config.toml      Supabase local project config
migrations/      schema changes
seed.sql         local development seed data
```

## Database Design Principles

- every row is owner-scoped
- `transactions` are the source of truth for real money movement
- `income_entries` represent expected or planned income
- obligations and debts drive urgency and spendability logic
- migrations should be additive and readable

## Local Supabase Setup

Prerequisite:

- install the Supabase CLI

From the repository root:

```bash
cd /Users/MAC/Documents/GitHub/life-os
supabase start
supabase db reset
```

What this does:

- starts the local Supabase services
- applies the migrations in `supabase/migrations`
- runs `supabase/seed.sql`

## Remote Supabase Setup

Link a hosted project:

```bash
supabase link --project-ref <project-ref>
```

Push migrations:

```bash
supabase db push
```

Use caution with seed data on hosted environments. `seed.sql` is meant for local development unless you intentionally want starter data in a remote project.

## Seed Data and Owner UUID

The seed file uses a fixed owner UUID to keep local development predictable.

If you want local seed data to match a real authenticated owner, update the UUID in `seed.sql` before running `supabase db reset`.

Why this matters:

- row-level security depends on the authenticated owner id
- seed data will not line up with auth unless the UUIDs match
- keeping one explicit owner id makes local setup easier to reason about

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

- [root README](/Users/MAC/Documents/GitHub/life-os/README.md) explains the full repo setup
- [apps/api/README.md](/Users/MAC/Documents/GitHub/life-os/apps/api/README.md) covers backend development
- [docs/ARCHITECTURE.md](/Users/MAC/Documents/GitHub/life-os/docs/ARCHITECTURE.md) captures the domain model and API direction
