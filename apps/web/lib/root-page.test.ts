import { describe, expect, it } from "vitest";
import { getRootPageMode } from "@/lib/root-page";

describe("getRootPageMode", () => {
  it("shows the public landing page when there is no auth session", () => {
    expect(getRootPageMode(false)).toBe("landing");
  });

  it("sends signed-in users through the app gate", () => {
    expect(getRootPageMode(true)).toBe("app_gate");
  });
});
