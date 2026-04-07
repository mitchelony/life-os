import type { BackendOnboardingStartResponse } from "@/lib/api";

export function getInitialAppRoute({
  hasAuthSession,
  isOnboardingComplete,
}: Readonly<{
  hasAuthSession: boolean;
  isOnboardingComplete: boolean;
}>) {
  if (!hasAuthSession) return "/login";
  return isOnboardingComplete ? "/dashboard" : "/settings";
}

export function isOnboardingCompleteFromStart(onboarding: BackendOnboardingStartResponse | null | undefined) {
  return onboarding?.state.is_complete ?? false;
}

export function getInitialAppRouteFromOnboardingStart({
  hasAuthSession,
  onboarding,
}: Readonly<{
  hasAuthSession: boolean;
  onboarding: BackendOnboardingStartResponse | null | undefined;
}>) {
  return getInitialAppRoute({
    hasAuthSession,
    isOnboardingComplete: isOnboardingCompleteFromStart(onboarding),
  });
}
