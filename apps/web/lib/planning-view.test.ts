import { describe, expect, it } from "vitest";
import {
  findLinkedAction,
  getGoalOpenStepCount,
  getGoalSections,
  getPlanAllocatedAmount,
  getPlanRemainingAmount,
} from "./planning-view";

describe("findLinkedAction", () => {
  it("prefers the highest-priority open action for a linked entity", () => {
    const action = findLinkedAction(
      [
        { id: "a3", linkedType: "debt", linkedId: "debt-1", lane: "this_week", status: "todo" },
        { id: "a2", linkedType: "debt", linkedId: "debt-1", lane: "do_now", status: "done" },
        { id: "a1", linkedType: "debt", linkedId: "debt-1", lane: "do_now", status: "todo" },
      ],
      "debt",
      "debt-1",
    );

    expect(action?.id).toBe("a1");
  });

  it("returns undefined when nothing is linked to the entity", () => {
    expect(findLinkedAction([{ id: "a1", linkedType: "debt", linkedId: "debt-1", lane: "do_now", status: "todo" }], "obligation", "obl-1")).toBeUndefined();
  });
});

describe("plan allocation helpers", () => {
  const plan = {
    id: "plan-1",
    label: "Friday paycheck",
    amount: 500,
    expectedOn: "2026-03-27",
    isReliable: true,
    status: "planned",
    allocations: [
      { id: "x", label: "Rent", allocationType: "obligation_payment", amount: 300 },
      { id: "y", label: "Card", allocationType: "debt_payment", amount: 120 },
    ],
  };

  it("sums allocations", () => {
    expect(getPlanAllocatedAmount(plan)).toBe(420);
  });

  it("computes remaining unallocated plan amount", () => {
    expect(getPlanRemainingAmount(plan)).toBe(80);
  });
});

describe("getGoalOpenStepCount", () => {
  it("counts steps that are not done", () => {
    expect(
      getGoalOpenStepCount({
        id: "goal-1",
        title: "Goal",
        description: "",
        status: "active",
        priority: "high",
        progress: 50,
        steps: [
          { id: "s1", title: "One", lane: "goal_step", source: "goal", status: "todo" },
          { id: "s2", title: "Two", lane: "goal_step", source: "goal", status: "done" },
          { id: "s3", title: "Three", lane: "goal_step", source: "goal", status: "blocked" },
        ],
      }),
    ).toBe(2);
  });
});

describe("getGoalSections", () => {
  it("keeps active work first, planned work second, and completed work last", () => {
    const sections = getGoalSections([
      {
        id: "goal-1",
        title: "Catch up utilities",
        description: "",
        status: "planned",
        priority: "high",
        progress: 0,
        steps: [],
      },
      {
        id: "goal-2",
        title: "Pay rent first",
        description: "",
        status: "active",
        priority: "critical",
        progress: 40,
        steps: [],
      },
      {
        id: "goal-3",
        title: "Clean up card",
        description: "",
        status: "blocked",
        priority: "medium",
        progress: 35,
        steps: [],
      },
      {
        id: "goal-4",
        title: "Build starter buffer",
        description: "",
        status: "completed",
        priority: "medium",
        progress: 100,
        steps: [],
      },
    ]);

    expect(sections.map((section) => ({ key: section.key, ids: section.goals.map((goal) => goal.id) }))).toEqual([
      { key: "active", ids: ["goal-2", "goal-3"] },
      { key: "planned", ids: ["goal-1"] },
      { key: "completed", ids: ["goal-4"] },
    ]);
  });

  it("omits empty sections", () => {
    const sections = getGoalSections([
      {
        id: "goal-1",
        title: "Pay rent first",
        description: "",
        status: "active",
        priority: "critical",
        progress: 40,
        steps: [],
      },
    ]);

    expect(sections.map((section) => section.key)).toEqual(["active"]);
  });
});
