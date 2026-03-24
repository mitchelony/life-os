# Architecture Notes

This document captures the current MVP architecture for Life OS.

It is meant to stay practical and current. If the implementation changes in a meaningful way, this file should be updated with it.

## Repository Layout

```text
apps/
  api/        FastAPI backend
  web/        Next.js App Router frontend
docs/         Product and engineering docs
supabase/     Migrations, seed data, and local database setup
```

## Product Boundaries

- single-user only
- private app, not a public SaaS product
- manual entry is still the primary source of truth
- dashboard and roadmap are the main decision surfaces

## Domain Model

### Financial Truth

- `transactions`
  - actual money movement
  - source of truth for what really happened
- `income_entries`
  - expected or planned income
  - may later result in transactions
- `accounts`
  - current balance snapshot by account
- `obligations`
  - recurring or one-time required payments
- `debts`
  - balances and minimum payments
- `reserves`
  - protected or manually reserved money
- `app_settings`
  - user-level inputs that shape spendability

### Planning and Guidance

- `tasks`
  - short-horizon follow-up actions
- `roadmapItems`
  - larger goals or milestones
- `strategyDocument`
  - advisory planning layer used by the roadmap workspace
  - includes goal guidance, expected income, and next-income payment plans

## System Responsibilities

### Frontend

The frontend is responsible for:

- rendering the app shell and route screens
- local-first interaction flows
- mobile-first UX
- roadmap and strategy workspace
- temporary browser persistence for local MVP state
- consuming stable API responses when backend data is available

Important note:

- browser state is still used for parts of the MVP
- that state is convenient, but it should not be treated as a strong security boundary

### Backend

The backend is responsible for:

- stable API response shapes
- deterministic business logic
- explainable available-spend calculations
- owner-scoped CRUD operations
- dashboard aggregation

Business logic should live in service modules, not in route handlers and not in SQL triggers.

### Database

The database layer is responsible for:

- owner-scoped persistence
- readable additive migrations
- clear distinction between actual records and planning records

Supabase is the long-term data platform, but local SQLite is still used for lightweight backend development.

## API Shape

Current important API surfaces include:

- `GET /api/dashboard`
- `GET /api/available-spend/explain`
- `POST /api/available-spend/explain`
- `GET /api/auth/whoami`
- `POST /api/auth/dev-login`
- CRUD routes for:
  - accounts
  - categories
  - merchants
  - income sources
  - transactions
  - income entries
  - obligations
  - debts
  - tasks
  - reserves
  - settings

## Available Spend Model

The conservative base calculation is:

```text
liquid_cash
- protected_cash_buffer
- manual_reserves
- obligations_due_before_next_income
- debt_minimums_due_before_next_income
- essential_spend_target_remaining_until_next_income
```

The UI now distinguishes:

- `Available Now`
- `Available Through Next Income`

The second number may include expected, reliable income before the current planning horizon.

## Roadmap and Strategy Architecture

Roadmap is not just a task list.

It is the planning layer that connects:

- debt reduction
- obligations
- expected income
- goals
- next actions

The current strategy model is:

- local and advisory
- JSON-based
- used to guide payment order and focus
- not allowed to silently mutate the financial ledger

This means:

- site truth is still the saved financial records
- strategy truth is the recommended way to handle them

## Auth Model

Current MVP auth posture:

- owner-only
- lightweight local development flow
- dev token stays server-side
- browser should not ship the owner token

The local dev path is intentionally temporary. Production should move to a stronger owner-only auth flow.

## UX Architecture

### Primary Surfaces

- `Dashboard`
  - operational snapshot
- `Quick Add`
  - amount-first money entry
- `Roadmap`
  - cash-flow-first planning and strategy
- `Tasks`
  - short follow-up actions, not a duplicate roadmap
- `Settings`
  - preferences and initial setup

### Mobile Direction

- mobile-first
- touch-first
- calm, high-signal layout
- avoid shrinking desktop layouts onto phones

## Implementation Rules

- keep API logic deterministic and testable
- keep the dashboard explainable
- keep frontend labels simple and readable
- avoid over-abstracting the MVP
- avoid mixing sample data into real persisted flows

## Known MVP Tradeoffs

- some state still lives in the browser
- local dev auth is not production auth
- strategy guidance is advisory rather than authoritative
- SQLite and Supabase development paths both currently exist during the transition period
