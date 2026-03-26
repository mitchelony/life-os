# Deployment

This is the current production deployment plan for Life OS.

## Production Stack

- Web: Vercel
- API: Render web service
- Database and auth: hosted Supabase

Why this stack:

- `apps/web` is a Next.js App Router app and fits Vercel cleanly
- `apps/api` is a FastAPI service that fits Render's Python web service model
- Supabase is already the active production database and auth provider

## Service Layout

- `app.<your-domain>` or root domain on Vercel for the web app
- `api.<your-domain>` on Render for the FastAPI backend
- hosted Supabase project for Postgres and Auth

## Web on Vercel

Create a Vercel project from this repo with:

- Framework: Next.js
- Root Directory: `apps/web`

Set these production env vars in Vercel:

- `NEXT_PUBLIC_API_BASE_URL=https://api.<your-domain>/api`
- `NEXT_PUBLIC_APP_ORIGIN=https://app.<your-domain>`
- `NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase-anon-key>`
- `NEXT_PUBLIC_ONBOARDING_KEY=life-os-onboarded`

Notes:

- `apps/web/vercel.json` marks the project as a Next.js app
- the web app should never point at `localhost` in production
- auth callback URLs should come from `NEXT_PUBLIC_APP_ORIGIN` in production, not from a local browser or LAN origin

## API on Render

Use the root [render.yaml](/Users/MAC/Github/life-os/render.yaml) Blueprint.

The Blueprint creates:

- one Python web service named `life-os-api`

Set these env vars in Render before first production deploy:

- `DATABASE_URL=<hosted-supabase-postgres-url>`
- `SUPABASE_DB_URL=<same-hosted-supabase-postgres-url>`
- `SUPABASE_URL=https://<your-project-ref>.supabase.co`
- `SUPABASE_ANON_KEY=<supabase-anon-key>`
- `SUPABASE_SERVICE_ROLE_KEY=<supabase-service-role-key>`
- `CORS_ALLOWED_ORIGINS=https://app.<your-domain>`

Already defined in the Blueprint:

- `ENVIRONMENT=production`
- `DEFAULT_CURRENCY=USD`
- `AUTH_STRATEGY=supabase`
- `ALLOW_DEV_LOGIN=false`
- `SUPABASE_AUTH_USER_PATH=/auth/v1/user`
- `DEV_OWNER_TOKEN=disabled-in-production`

Runtime notes:

- the API must bind to `0.0.0.0`
- health check path is `/healthz`

## Supabase Production Settings

In Supabase Auth URL Configuration:

- Site URL: `https://app.<your-domain>`
- Redirect URL: `https://app.<your-domain>/auth/callback`

If you use a non-`app` subdomain, use the real production web origin everywhere above.

## Go-Live Order

1. Confirm hosted Supabase env values and production auth URLs.
2. Apply the latest Supabase migrations before deploying app code, including additive roadmap import schema `v2` fields.
3. Deploy the API to Render.
4. Verify `https://api.<your-domain>/healthz`.
5. Set Vercel production env vars to the real API and Supabase values.
6. Deploy the web app to Vercel.
7. Test production flows:
   - sign in
   - sign up
   - Google sign-in
   - `/auth/callback`
   - onboarding route decision
   - logout
   - sign back in
   - roadmap save/load
   - roadmap import `v2`

## Production Smoke Test Checklist

- web loads from the production domain
- API responds on `/healthz`
- Google auth returns to `/auth/callback` on the production web domain
- post-auth routing goes to `/settings` or `/dashboard` correctly
- logout returns to `/login`
- dashboard no longer references localhost
- browser network requests target `https://api.<your-domain>/api/...`

## What Not To Do

- do not point production web envs at `localhost`
- do not leave Supabase Site URL on a local or LAN address
- do not enable `ALLOW_DEV_LOGIN` in production
- do not mix one Supabase project's auth URL with another project's Postgres URL
