# Architecture Notes

This document captures the current MVP architecture for Life OS.

It is meant to stay practical and current. If the implementation changes in a meaningful way, this file should be updated with it.

## Repository Layout

```text
apps/
  api/        FastAPI backend
  web/        Next.js App Router frontend
docs/         Product and engineering docs
supabase/     Migrations, hosted setup reference, and optional local database setup
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

- `action_items`
  - persisted next-step actions used by dashboard and the `Actions` route
- `roadmapItems`
  - larger goals or milestones
- `strategyDocument`
  - advisory planning layer used by the roadmap workspace
  - includes goal guidance, expected income, and next-income payment plans
- `roadmap_goals`, `roadmap_steps`, `income_plans`, and `income_plan_allocations`
  - normalized planning entities used by the decision engine
- `reserves`
  - actual earmarked cash state, including manual reserve intent
- `activity_events`
  - recent update feed and notable state changes
- `progress_snapshots`
  - time-based planning health snapshots
- `planner_drafts`
  - future-facing planning workspace memory

## System Responsibilities

### Frontend

The frontend is responsible for:

- rendering the app shell and route screens
- owner sign-in, sign-up, Google OAuth, and session restore through Supabase auth
- mobile-first UX
- roadmap and strategy workspace
- consuming stable API responses as the primary persistence path
- keeping a local mirror only for transient fallback and resilience

Important note:

- browser state still exists for convenience, but it is not the source of truth
- browser storage should still be treated as sensitive but non-secure

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

Supabase Postgres is now the intended local and hosted database path.

## API Shape

Current important API surfaces include:

- `GET /api/dashboard`
- `POST /api/roadmap/import`
- `GET /api/planning/context-export`
- `POST /api/planning/relaunch`
- `POST /api/income-entries/{id}/confirm`
- `GET /api/available-spend/explain`
- `POST /api/available-spend/explain`
- `GET /api/auth/whoami`
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

- API-backed and advisory
- JSON-based
- used to guide payment order and focus
- not allowed to silently mutate the financial ledger
- surfaced through explicit roadmap modes:
  - `Focus`
  - `Goals`
  - `Strategy`

This means:

- site truth is still the saved financial records
- strategy truth is the recommended way to handle them
- roadmap import schema `v2` is the preferred bulk planning contract for GPT-assisted setup
- temp ids exist for import dependency resolution only; persisted records still use real ids
- temp-id resolution currently stops at:
  - goals
  - steps
  - income plans
- top-level debts, obligations, and expected income entries can also resolve temp ids when provided explicitly

## Decision Engine Behavior

The planning snapshot is backend-owned.

Important current rules:

- dashboard, roadmap, debts, obligations, and actions consume the same server snapshot
- roadmap copilot drafts are backend-owned and approval-gated before import
- inactive items should stop feeding live priority
- inactive actions are:
  - `done`
  - `skipped`
  - `blocked`
- inactive actions should move to the bottom of the action list
- action lanes are derived from dates rather than trusting stale saved grouping
- expected income confirmation converts planned money into real transaction history
- planning relaunch clears planning layers and transaction history while preserving accounts, debts, obligations, expected income entries, and income sources

## Auth Model

Current auth posture:

- owner-only
- Supabase email/password and Google OAuth are the normal paths
- the backend verifies Supabase bearer tokens and derives `owner_id` from the session
- the browser should not ship any owner secret
- local dev-token fallback is optional and should stay disabled unless explicitly needed

The current frontend still uses a lightweight client-side session store instead of a full cookie/middleware Supabase SSR flow.

## UX Architecture

### Primary Surfaces

- `Dashboard`
  - operational snapshot centered on what matters right now
- `Quick Add`
  - amount-first money entry
- `Roadmap`
  - cash-flow-first planning and strategy, including the primary copilot draft/review flow
- `Income`
  - expected income management and confirmation
- `Actions`
  - short follow-up actions, not a duplicate roadmap
- `Settings`
  - preferences, onboarding edits, manual GPT context export/import fallback, and relaunch

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

- some state is mirrored in the browser for convenience
- strategy guidance is advisory rather than authoritative
- the frontend still uses lightweight client-side session handling instead of a full cookie/middleware Supabase SSR flow
- the hosted Supabase project is the active integration target; local Supabase is optional, not the default path
- roadmap import `v2` is richer than the currently resolved linker model; some advisory fields are accepted even when not all cross-entity placeholder ids resolve automatically
