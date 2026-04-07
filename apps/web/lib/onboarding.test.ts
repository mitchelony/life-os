import { describe, expect, it } from "vitest";
import { getInitialAppRoute, getInitialAppRouteFromOnboardingStart } from "@/lib/onboarding";

describe("getInitialAppRoute", () => {
  it("sends signed-out users to login", () => {
    expect(getInitialAppRoute({ hasAuthSession: false, isOnboardingComplete: false })).toBe("/login");
  });

  it("sends first-time signed-in users to settings onboarding", () => {
    expect(getInitialAppRoute({ hasAuthSession: true, isOnboardingComplete: false })).toBe("/settings");
  });

  it("sends onboarded signed-in users to dashboard", () => {
    expect(getInitialAppRoute({ hasAuthSession: true, isOnboardingComplete: true })).toBe("/dashboard");
  });

  it("keeps signed-in recovery on settings when onboarding start state is missing", () => {
    expect(getInitialAppRouteFromOnboardingStart({ hasAuthSession: true, onboarding: null })).toBe("/settings");
  });
});
