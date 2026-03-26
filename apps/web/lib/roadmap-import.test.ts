import { describe, expect, it } from "vitest";
import { parseRoadmapImportPayload } from "@/lib/roadmap-import";

describe("parseRoadmapImportPayload", () => {
  it("parses a valid import payload and normalizes missing collections", () => {
    const payload = parseRoadmapImportPayload(`{
      "version": 1,
      "reset_planning_first": true,
      "goals": [
        {
          "title": "Get utilities current",
          "priority": "critical",
          "steps": [
            {
              "title": "Call utility company"
            }
          ]
        }
      ],
      "income_plans": [
        {
          "label": "Next paycheck",
          "amount": 900
        }
      ]
    }`);

    expect(payload.reset_planning_first).toBe(true);
    expect(payload.goals).toHaveLength(1);
    expect(payload.goals?.[0]?.steps).toHaveLength(1);
    expect(payload.income_plans).toHaveLength(1);
    expect(payload.income_plans?.[0]?.allocations).toEqual([]);
  });

  it("rejects invalid json", () => {
    expect(() => parseRoadmapImportPayload("{")).toThrow("Import JSON is not valid.");
  });

  it("rejects goals without titles", () => {
    expect(() => parseRoadmapImportPayload(`{ "goals": [{ "title": "" }] }`)).toThrow(
      "Goal 1 needs a title.",
    );
  });
});
