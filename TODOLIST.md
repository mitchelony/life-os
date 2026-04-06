# TODOLIST.md

Use this file for deferred work discovered during implementation or validation.

## Open Items

### Safe To Implement Now

- Default `ALLOW_DEV_LOGIN` to `false` in [`/Users/MAC/Projects/life-os/apps/api/app/core/config.py`](/Users/MAC/Projects/life-os/apps/api/app/core/config.py) and add a regression test for the missing-env case so `/api/auth/dev-login` cannot come up accidentally during LAN-accessible development runs. (Added By Project Maintenance Agent)
- Stop using `NEXT_PUBLIC_ONBOARDING_KEY` as completion truth in [`/Users/MAC/Projects/life-os/apps/web/components/home-gate.tsx`](/Users/MAC/Projects/life-os/apps/web/components/home-gate.tsx) and [`/Users/MAC/Projects/life-os/apps/web/app/(app)/settings/page.tsx`](/Users/MAC/Projects/life-os/apps/web/app/(app)/settings/page.tsx); rely on `/api/onboarding/start` for routing and section defaults, then add a regression test for the signed-in recovery path. (Added By Project Maintenance Agent)

### Blocked

- None currently recorded.

### Needs Product Decision

- None currently recorded.
