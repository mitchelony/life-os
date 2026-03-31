import { describe, expect, it } from "vitest";
import { getDefaultSettingsSection, getSettingsSections } from "@/lib/settings-view";

describe("getSettingsSections", () => {
  it("keeps roadmap setup first and exposes the three settings areas", () => {
    const sections = getSettingsSections();

    expect(sections.map((section) => section.id)).toEqual(["roadmap_setup", "onboarding", "utilities"]);
    expect(sections[0]?.title).toBe("Planning tools");
    expect(sections[1]?.title).toBe("Onboarding");
    expect(sections[2]?.title).toBe("Useful settings");
  });

  it("defaults incomplete onboarding to the onboarding section", () => {
    expect(getDefaultSettingsSection(false)).toBe("onboarding");
  });

  it("defaults completed onboarding to roadmap setup", () => {
    expect(getDefaultSettingsSection(true)).toBe("roadmap_setup");
  });
});
