import { describe, expect, it } from "vitest";
import { getAuthCallbackRecoveryAction } from "@/lib/auth-callback";

describe("auth callback recovery action", () => {
  it("sends users with a stored session back into the app", () => {
    expect(getAuthCallbackRecoveryAction(true)).toEqual({
      href: "/",
      label: "Back to app",
    });
  });

  it("sends users without a stored session back to login", () => {
    expect(getAuthCallbackRecoveryAction(false)).toEqual({
      href: "/login",
      label: "Back to login",
    });
  });
});
