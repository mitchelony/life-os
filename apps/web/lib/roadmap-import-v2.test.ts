import { describe, expect, it } from "vitest";
import { parseRoadmapImportV2, roadmapImportV2Template } from "@/lib/roadmap-import-v2";

describe("parseRoadmapImportV2", () => {
  it("parses GPT-style smart quotes into valid v2 payloads", () => {
    const parsed = parseRoadmapImportV2(`{
      “version”: 2,
      “reset_planning_first”: true,
      “goals”: [],
      “income_plans”: [],
      “cash_reserves”: [],
      “expected_income_entries”: [],
      “obligations”: [],
      “debts”: [],
      “actions”: []
    }`);

    expect(parsed.version).toBe(2);
    expect(parsed.reset_planning_first).toBe(true);
  });

  it("rejects payloads that are not roadmap import v2", () => {
    expect(() => parseRoadmapImportV2(`{"version":1}`)).toThrow("Roadmap import must use version 2");
  });

  it("ships a copyable template with the expected top-level sections", () => {
    const parsed = parseRoadmapImportV2(roadmapImportV2Template);

    expect(parsed.version).toBe(2);
    expect(parsed.goals).toEqual(expect.any(Array));
    expect(parsed.income_plans).toEqual(expect.any(Array));
    expect(parsed.cash_reserves).toEqual(expect.any(Array));
    expect(parsed.expected_income_entries).toEqual(expect.any(Array));
    expect(parsed.obligations).toEqual(expect.any(Array));
    expect(parsed.debts).toEqual(expect.any(Array));
    expect(parsed.actions).toEqual(expect.any(Array));
  });
});
