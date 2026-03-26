import { describe, expect, it } from "vitest";
import { describeTrend, groupActionsByLane, type DecisionActionLike } from "@/lib/decision-view";

describe("groupActionsByLane", () => {
  it("groups actions into the four product lanes", () => {
    const actions: DecisionActionLike[] = [
      { id: "1", title: "Pay rent", lane: "do_now", status: "todo", source: "system" },
      { id: "2", title: "Call lender", lane: "this_week", status: "in_progress", source: "manual" },
      { id: "3", title: "Split paycheck", lane: "when_income_lands", status: "todo", source: "plan" },
      { id: "4", title: "Upload form", lane: "manual", status: "blocked", source: "manual" },
    ];

    const grouped = groupActionsByLane(actions);

    expect(grouped.doNow.map((item) => item.id)).toEqual(["1"]);
    expect(grouped.thisWeek.map((item) => item.id)).toEqual(["2"]);
    expect(grouped.whenIncomeLands.map((item) => item.id)).toEqual(["3"]);
    expect(grouped.manual.map((item) => item.id)).toEqual(["4"]);
  });
});

describe("describeTrend", () => {
  it("maps trend direction to the right product language", () => {
    expect(describeTrend("forward")).toBe("Moving forward");
    expect(describeTrend("backward")).toBe("Moving backward");
    expect(describeTrend("steady")).toBe("Holding steady");
  });
});
