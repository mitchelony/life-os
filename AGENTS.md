# AGENTS.md

This file is the build contract for Codex agents and human contributors working on Life OS.

## Product Rules

- This is a private, single-user app.
- Do not introduce team, org, workspace, invite, or multi-tenant abstractions.
- `user_id` exists for clean ownership boundaries and future-proofing, not for SaaS complexity.
- The dashboard must stay calm and high-signal.
- The app should prioritize situational awareness over reporting depth.
- Manual entry is the MVP source of truth.
- Roadmap is a planning layer, not a generic productivity board.
- The product should help answer: "When the next paycheck hits, what gets paid first?"

## Architectural Rules

- Keep the repo split into `apps/web`, `apps/api`, `supabase`, and `docs`.
- `transactions` are the source of truth for actual money movement.
- `income_entries` model expected income planning and may later result in transactions.
- `roadmapItems` and `strategyDocument` are advisory planning inputs, not ledger truth.
- Business logic belongs in the API service layer, not in SQL triggers and not spread across UI components.
- The frontend should consume stable API shapes and avoid direct coupling to table structure.
- Use UUIDs for persisted entities.
- Keep auth owner-only and lightweight.
- Owner secrets must stay server-side. Do not move development auth tokens into browser-visible config.

## UX Rules

- The dashboard must answer:
  - what is next
  - what comes after that
  - what is safe to spend now
  - what is safe to spend until next income
  - what is overdue
  - what actions matter this week
- The roadmap must answer:
  - what goal is active
  - what payment comes first when income lands
  - what the next best step is
- Avoid dense data tables on primary surfaces.
- Avoid generic card mosaics.
- Large numbers and decisive hierarchy are preferred over decorative UI.
- Quick add must be amount-first.
- Tasks should not simply restate roadmap strategy in different words.
- Every new screen should justify its inclusion in MVP.

## Available Spend Rules

- The formula must remain explainable.
- Inputs:
  - liquid cash
  - protected cash buffer
  - manual reserves
  - obligations due before next income
  - debt minimums due before next income
  - essential spend target remaining until next income
- The API must expose both the final number and an explanation payload.
- The product should distinguish between `Available Now` and `Available Through Next Income` where appropriate.
- The UI must show the number prominently and allow a one-tap breakdown.

## Backend Rules

- Use FastAPI routers + service modules + schema modules.
- Validate request/response payloads with Pydantic.
- Keep date-sensitive business logic deterministic and testable.
- Use dependency injection for DB session access.
- Prefer explicit service methods over fat route handlers.
- Development auth routes must be clearly gated to local development only.
- Unsupported auth strategies should fail closed, not silently fall open.

## Frontend Rules

- Use Next.js App Router.
- Follow the `frontend-skill` guidance for layout, motion, and restraint.
- Prefer a mobile-first responsive PWA.
- Use a small number of reusable primitives and consistent visual tokens.
- Keep sample/mock data isolated so it can be replaced by API data cleanly.
- Do not ship owner auth tokens or other sensitive secrets in `NEXT_PUBLIC_*` variables.
- Treat browser storage as sensitive but non-secure during MVP.

## Database Rules

- Use owner-only RLS policies.
- Distinguish cash-like accounts from credit/debt accounts.
- Merchant/source reuse must be first-class.
- Keep migrations readable and additive.
- Seed data should help local development without pretending to be production data.

## Testing Rules

- Add unit tests for core financial logic before expanding features.
- Add API tests for permission boundaries and core response shapes.
- Add frontend tests for primary flows and failure states where practical.
- Use Playwright CLI for browser validation of UI flows after major frontend slices.
- If strategy or roadmap logic changes, update tests for payment-order guidance and next-step prioritization.

## Sub-Agent Ownership Guidance

- `supabase/`: schema, policies, seed data, local setup docs
- `apps/api/`: backend code, tests, env handling, services, routers
- `apps/web/`: UI, client data layer, design system, route screens
- Shared docs and top-level repo files should be coordinated carefully to avoid conflicts.

## What To Avoid

- Premature bank syncing
- Overbuilt auth
- Background job infrastructure before it is needed
- Fancy analytics before the dashboard feels trustworthy
- Splitting logic across too many abstractions for an MVP
- Letting roadmap strategy silently mutate saved financial truth
