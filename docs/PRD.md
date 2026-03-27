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

- initial setup flow in Settings
- dashboard
- accounts
- expense entry
- income entry
- expected income management and confirmation
- merchant/source reuse
- bills and obligations
- debt tracking
- available-spend calculation
- roadmap and payment-order planning
- actions and reminders
- settings and app preferences

### Explicitly Deferred

- bank syncing
- attachment storage
- OCR and receipt scanning
- multi-user collaboration
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
- `Available Now`
- `Available Through Next Income`
- a compact weekly action strip
- clear access to overdue items and spend breakdown without turning the page into a report
- closed work should not keep competing with live priorities

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

### Initial Setup

First launch should gather the baseline financial picture:

- accounts and balances
- debt balances and minimums
- recurring bills
- expected income sources
- savings goal
- essential weekly spending target
- protected minimum cash buffer

The initial setup flow should leave the dashboard immediately useful.

First successful sign-in should automatically route through the onboarding decision path.

### Roadmap

Roadmap should act as a cash-flow-first planning layer, not a generic goal tracker.

It should answer:

- When the next paycheck hits, what gets paid first?
- Which debts or obligations matter most right now?
- What goal is active, blocked, overdue, or complete?
- What is the next best step?

Roadmap should support:

- major goals
- status and priority
- step-level progress
- strategy-backed guidance
- next-income payment plans
- focus mode with one clear next move
- one-shot import through roadmap schema `v2`
- expected income, cash reserves, obligations, debts, and actions in the same planning import

### Income

Income should have its own control surface outside onboarding.

It should support:

- viewing expected income
- editing expected income
- deleting expected income
- confirming expected income into real income history
- keeping future income visible without forcing the user back through setup

## 7. Available Spend Logic

### Core Formula

`available_spend = liquid_cash - protected_cash_buffer - manual_reserves - required_obligations_due_before_next_income - minimum_debt_payments_due_before_next_income - essential_spend_target_remaining_until_next_income`

### Display Model

The product should show two related numbers:

- `Available Now`
- `Available Through Next Income`

The second number may include expected, reliable income before the current planning horizon.

### Why This Formula

- aligns with the user's core question
- stays conservative
- is easy to inspect and debug
- avoids pretending to be a full budgeting engine

### Display Requirements

- prominent primary number on the dashboard
- clear distinction between current cash safety and next-income planning
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
- should not simply repeat roadmap strategy items in different words
- should focus on short-horizon follow-up actions
- closed actions should fall out of the main decision path once they are done, skipped, or blocked

### Settings

- protected cash buffer
- essential weekly target
- savings floor
- dashboard preferences
- initial setup state
- GPT context export
- roadmap import schema `v2` as a manual fallback
- planning relaunch

### Roadmap Strategy

The roadmap strategy layer should:

- accept a strict JSON planning schema
- prefer roadmap import schema `v2` for bulk setup
- use an approval-first copilot flow on the Roadmap page as the primary drafting path
- guide payment order and debt/obligation handling
- influence guidance across the dashboard, debts, obligations, and tasks
- stay advisory only during MVP
- not silently rewrite the ledger or account balances
- accept richer advisory fields than the current UI may show, while letting the backend importer remain the contract boundary

## 9. Technical Direction

- Frontend: Next.js, React, TypeScript, Tailwind CSS
- Backend: FastAPI, Pydantic, SQLAlchemy
- Database: Supabase Postgres
- Auth: owner-only Supabase auth with email/password and Google

## 10. Security Expectations

- the app is private and single-user
- Supabase bearer auth is the primary path
- local development auth fallback must stay local-only and disabled by default
- browser-visible configuration must not contain owner secrets
- financial logic should remain explainable and easy to audit
- local browser storage is acceptable for MVP convenience, but should be treated as sensitive

## 11. Success Criteria

The MVP is successful if:

- initial setup can be completed in one sitting
- the dashboard becomes immediately meaningful afterward
- expense logging is fast enough to feel low-friction on mobile
- the user trusts the available-spend number
- top priorities surface without digging through screens
- roadmap makes the next paycheck plan obvious without feeling like a budgeting spreadsheet

## 12. Tradeoffs

- Manual entry increases reliability but requires discipline
- Owner-only auth keeps the system simple but would need refactor before any broader multi-user launch
- Available-spend logic is intentionally conservative and may feel restrictive at times
- The MVP favors clarity over exhaustive financial modeling
- Roadmap strategy is advisory in MVP, so it guides action without mutating stored financial truth

## 13. Initial Delivery Phases

1. docs and monorepo scaffold
2. schema and seed data
3. backend domain foundations
4. frontend shell, onboarding, and quick add
5. dashboard and financial explanation
6. roadmap strategy and mobile refinement
7. tests, browser validation, polish
