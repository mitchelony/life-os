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
