# Life OS Product Requirements Document

## 1. Product Interpretation

Life OS is a personal operating system for life management with an immediate emphasis on financial stability and cognitive clarity.

The product is not a general-purpose productivity suite and not a public budgeting tool. It exists to reduce chaos and decision fatigue for one owner by making the most important financial and life responsibilities visible now.

The intended feeling is:

- calm
- elegant
- intentional
- premium
- private
- reassuring

The product should feel like "my life is under control, or at least visible."

## 2. Core Outcome

The home screen must let the user answer, within seconds:

1. What is coming up next?
2. What comes after that?
3. What can I safely spend right now on food and essentials?
4. What debt or bill needs attention?
5. What do my accounts look like at a glance?
6. What actions matter this week?

## 3. Primary User

- Single owner only
- Privacy-conscious
- Easily overwhelmed by dense interfaces
- Wants simple input, clear priorities, and fast daily logging

## 4. MVP Scope

### Included

- onboarding flow
- dashboard
- accounts
- expense entry
- income entry
- merchant/source reuse
- bills and obligations
- debt tracking
- available-spend calculation
- tasks and reminders
- settings and app preferences

### Explicitly Deferred

- bank syncing
- attachment storage
- OCR and receipt scanning
- multi-user collaboration
- public sign-up
- advanced analytics suite
- complex budgeting and forecasting views

## 5. Product Principles

- High signal, low noise
- Manual entry over fragile integrations
- Fewer, better features in MVP
- Explainability over magic
- Calm default state
- Local-dev friendly setup
- Privacy-respecting defaults

## 6. UX Requirements

### Dashboard

Must show:

- `What's Next`
- `What's After That`
- `Available Spend`
- account status snapshot
- upcoming income
- overdue obligations
- top priorities

### Quick Add

Expense and income entry should begin with an amount-first keypad.

Flow:

1. Enter amount on a touch-friendly keypad
2. Confirm whether the entry is an expense or income
3. Fill details:
   - merchant or source
   - category
   - account
   - date
   - expected/received state for income
   - notes

### Merchant Memory

- Store merchants and income sources separately
- Surface them as suggestions and autocomplete options
- Prefer recent and frequent items first

### Onboarding

First launch should gather:

- accounts and balances
- debt balances and minimums
- recurring bills
- expected income sources
- savings goal
- essential weekly spending target
- protected minimum cash buffer

The onboarding flow should leave the dashboard immediately useful.

## 7. Available Spend Logic

### Formula

`available_spend = liquid_cash - protected_cash_buffer - manual_reserves - required_obligations_due_before_next_income - minimum_debt_payments_due_before_next_income - essential_spend_target_remaining_until_next_income`

### Why This Formula

- aligns with the user's core question
- stays conservative
- is easy to inspect and debug
- avoids pretending to be a full budgeting engine

### Display Requirements

- prominent hero number on the dashboard
- explanation breakdown available on demand
- negative value should trigger a warning tone, not panic-heavy styling

## 8. Functional Requirements

### Accounts

- manage checking, savings, cash-like, and credit-card accounts
- store institution, balance, status, and notes

### Transactions

- use a unified ledger for actual money movement
- track type, amount, category, account, merchant/source, date, and notes

### Income Entries

- track planned/expected income separately from received income
- support expected date, received date, and linked account

### Obligations

- support recurring and one-time bills
- due date, amount, urgency, status, notes

### Debts

- store balance, minimum payment, APR optional, due date, and notes

### Tasks

- due date, priority, status, linked financial entity, and notes

### Settings

- protected cash buffer
- essential weekly target
- savings floor
- dashboard preferences

## 9. Technical Direction

- Frontend: Next.js, React, TypeScript, Tailwind CSS
- Backend: FastAPI, Pydantic, SQLAlchemy
- Database: Supabase Postgres
- Auth: Supabase magic link for one owner in production, dev-login locally

## 10. Success Criteria

The MVP is successful if:

- onboarding can be completed in one sitting
- the dashboard becomes immediately meaningful afterward
- expense logging is fast enough to feel low-friction on mobile
- the user trusts the available-spend number
- top priorities surface without digging through screens

## 11. Tradeoffs

- Manual entry increases reliability but requires discipline
- Owner-only auth keeps the system simple but is not designed for future public sign-up without refactor
- Available-spend logic is intentionally conservative and may feel restrictive at times
- The MVP favors clarity over exhaustive financial modeling

## 12. Initial Delivery Phases

1. docs and monorepo scaffold
2. schema and seed data
3. backend domain foundations
4. frontend shell, onboarding, and quick add
5. dashboard and financial explanation
6. tests, browser validation, polish

