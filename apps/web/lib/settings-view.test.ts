import { describe, expect, it } from "vitest";
import { getSettingsSections } from "@/lib/settings-view";

describe("getSettingsSections", () => {
  it("keeps roadmap setup first and exposes the three settings areas", () => {
    const sections = getSettingsSections();

    expect(sections.map((section) => section.id)).toEqual(["roadmap_setup", "onboarding", "utilities"]);
    expect(sections[0]?.title).toBe("Roadmap setup");
    expect(sections[1]?.title).toBe("Onboarding");
    expect(sections[2]?.title).toBe("Useful settings");
  });
});
