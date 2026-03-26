import { describe, expect, it } from "vitest";
import { getHomeGateActionIds } from "./home-gate";

describe("home-gate actions", () => {
  it("keeps a logout path available when onboarding verification fails", () => {
    expect(getHomeGateActionIds(true)).toEqual(["retry", "logout"]);
  });

  it("shows the normal setup and dashboard actions when there is no route error", () => {
    expect(getHomeGateActionIds(false)).toEqual(["setup", "dashboard"]);
  });
});
