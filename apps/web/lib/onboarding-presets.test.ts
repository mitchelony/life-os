import { describe, expect, it } from "vitest";
import { createOnboardingSetupPreset, onboardingPresetOptions } from "@/lib/onboarding-presets";

describe("onboarding presets", () => {
  it("offers a student demo preset alongside a blank start", () => {
    expect(onboardingPresetOptions.map((option) => option.id)).toEqual(["blank", "student-demo"]);
    expect(onboardingPresetOptions.find((option) => option.id === "student-demo")?.recommended).toBe(true);
  });

  it("builds an empty setup for blank onboarding", () => {
    const setup = createOnboardingSetupPreset("blank", new Date("2026-04-01T09:00:00-05:00"));

    expect(setup.displayName).toBe("");
    expect(setup.accounts).toEqual([]);
    expect(setup.obligations).toEqual([]);
    expect(setup.debts).toEqual([]);
    expect(setup.income).toEqual([]);
    expect(setup.roadmapItems).toEqual([]);
    expect(setup.strategyDocument).toBeNull();
  });

  it("builds a student-ready demo setup with irregular income and a roadmap plan", () => {
    const setup = createOnboardingSetupPreset("student-demo", new Date("2026-04-01T09:00:00-05:00"));

    expect(setup.displayName).toBe("Maya Carter");
    expect(setup.income.map((item) => item.source)).toEqual(
      expect.arrayContaining(["Campus library shift", "Parent transfer", "Refund check"]),
    );
    expect(setup.roadmapItems[0]).toMatchObject({
      title: "Stabilize April cash flow",
      category: "finances",
      status: "active",
      strategyBacked: true,
    });
    expect(setup.strategyDocument).toMatchObject({
      name: "Student cash flow plan",
      strategyMode: "cash_flow_first",
    });
    expect(setup.strategyDocument?.nextIncomePlans?.[0]).toMatchObject({
      label: "Friday income plan",
      recommendedStep: "Cover groceries, phone, and the card minimum before any discretionary spend.",
    });
  });
});
