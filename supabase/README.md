# Supabase

This folder contains the database foundation for the Life OS app.

## Contents

- `migrations/20260323000100_initial_schema.sql`: enums, tables, indexes, triggers, and RLS policies.
- `seed.sql`: single-owner starter data for local development.

## Local setup

1. Install the Supabase CLI if you do not already have it.
2. The repo already includes `supabase/config.toml`, so you can start the local stack directly.
3. From the repo root, start the local stack:

```bash
supabase start
```

4. Load the schema and seed data into the local database:

```bash
supabase db reset
```

`db reset` applies the migration and then runs `supabase/seed.sql`.

## Remote setup

1. Link the project to your hosted Supabase instance:

```bash
supabase link --project-ref <your-project-ref>
```

2. Push migrations to the remote database:

```bash
supabase db push
```

3. Apply any sample data manually if you want demo rows in production. Keep `seed.sql` local unless you explicitly want seeded demo content on the remote instance.

## Owner UUID

The seed file uses a fixed owner UUID:

```text
11111111-1111-1111-1111-111111111111
```

Update that UUID in `seed.sql` if you want the starter data to attach to a different owner record.

Why this matters:

- every row in this schema is owner-scoped
- seed data must match the auth user id if you want RLS to line up with a real login
- keeping one UUID makes the local dev story simple and explicit

## Important conventions

- `transactions` are the source of truth for actual financial movement.
- `accounts.current_balance` is a live snapshot field, not a separate ledger.
- credit card balances are stored as the amount owed.
- archive data instead of deleting it where possible; `is_active` flags are preferred over hard deletes.
- if you change the schema, add a new migration instead of editing an applied one.

## What you need to do manually

- If you want the seed data to match your real Supabase Auth user, replace the owner UUID in `seed.sql` with that user id before running `supabase db reset`.
- If you create a new Supabase project, run `supabase link` before `supabase db push`.
- If you need a fresh local database after schema changes, run `supabase db reset`.
- If you want the seeded `profiles` row to match a real authenticated owner, create that owner in Supabase Auth first and then replace the UUID in `seed.sql`. Why: RLS policies key off the auth user id.
