# Life OS Web

Frontend app for the single-user Life OS MVP.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Framer Motion
- Lucide icons

## Local Setup

1. Use Node `20 LTS`.
2. Copy `.env.example` to `.env.local` if you want to point at a backend.
3. Install dependencies.
4. Run the app.

```bash
npm install
npm run dev
```

## Environment

- `NEXT_PUBLIC_API_BASE_URL` - optional FastAPI base URL. Use `http://localhost:8000/api` for the local backend.
- `NEXT_PUBLIC_OWNER_TOKEN` - local owner token header used for the dev-only single-user flow.
- `NEXT_PUBLIC_ONBOARDING_KEY` - localStorage key used to track onboarding completion.

## What Is Included

- dashboard
- onboarding wizard
- quick add expense/income flow
- accounts, obligations, debts, tasks, and settings views
- sample data and a minimal API client abstraction

## Notes For Developers

- The UI is built to work before backend integration.
- Keep the dashboard calm and high-signal.
- Prefer the amount-first quick entry pattern for any new money capture flow.
