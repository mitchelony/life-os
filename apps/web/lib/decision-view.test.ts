import { describe, expect, it } from "vitest";
import {
  describeTrend,
  getActionLaneSummary,
  getVisibleActionLanes,
  getAvailableSpendBreakdownRows,
  groupActionsByLane,
  isInactiveActionStatus,
  type DecisionActionLike,
} from "@/lib/decision-view";

describe("groupActionsByLane", () => {
  it("groups actions into the four product lanes", () => {
    const actions: DecisionActionLike[] = [
      { id: "1", title: "Pay rent", lane: "do_now", status: "todo", source: "system" },
      { id: "2", title: "Call lender", lane: "this_week", status: "in_progress", source: "manual" },
      { id: "3", title: "Split paycheck", lane: "when_income_lands", status: "todo", source: "plan" },
      { id: "4", title: "Upload form", lane: "manual", status: "todo", source: "manual" },
    ];

    const grouped = groupActionsByLane(actions);

    expect(grouped.doNow.map((item) => item.id)).toEqual(["1"]);
    expect(grouped.thisWeek.map((item) => item.id)).toEqual(["2"]);
    expect(grouped.whenIncomeLands.map((item) => item.id)).toEqual(["3"]);
    expect(grouped.manual.map((item) => item.id)).toEqual(["4"]);
    expect(grouped.inactive).toEqual([]);
  });

  it("moves done skipped and blocked actions into the inactive group", () => {
    const actions: DecisionActionLike[] = [
      { id: "1", title: "Pay rent", lane: "do_now", status: "todo", source: "system" },
      { id: "2", title: "Call lender", lane: "this_week", status: "blocked", source: "manual" },
      { id: "3", title: "Split paycheck", lane: "when_income_lands", status: "done", source: "plan" },
      { id: "4", title: "Upload form", lane: "manual", status: "skipped", source: "manual" },
    ];

    const grouped = groupActionsByLane(actions);

    expect(grouped.doNow.map((item) => item.id)).toEqual(["1"]);
    expect(grouped.thisWeek).toEqual([]);
    expect(grouped.whenIncomeLands).toEqual([]);
    expect(grouped.manual).toEqual([]);
    expect(grouped.inactive.map((item) => item.id)).toEqual(["2", "3", "4"]);
  });
});

describe("isInactiveActionStatus", () => {
  it("treats done skipped and blocked actions as inactive", () => {
    expect(isInactiveActionStatus("done")).toBe(true);
    expect(isInactiveActionStatus("skipped")).toBe(true);
    expect(isInactiveActionStatus("blocked")).toBe(true);
    expect(isInactiveActionStatus("todo")).toBe(false);
    expect(isInactiveActionStatus("in_progress")).toBe(false);
  });
});

describe("describeTrend", () => {
  it("maps trend direction to the right product language", () => {
    expect(describeTrend("forward")).toBe("Moving forward");
    expect(describeTrend("backward")).toBe("Moving backward");
    expect(describeTrend("steady")).toBe("Holding steady");
  });
});

describe("getActionLaneSummary", () => {
  it("summarizes each lane in product order", () => {
    const summary = getActionLaneSummary([
      { id: "1", title: "Pay rent", lane: "do_now", status: "todo", source: "system" },
      { id: "2", title: "Call lender", lane: "this_week", status: "in_progress", source: "manual" },
      { id: "3", title: "Split paycheck", lane: "when_income_lands", status: "todo", source: "plan" },
      { id: "4", title: "Upload form", lane: "manual", status: "todo", source: "manual" },
      { id: "5", title: "Old item", lane: "manual", status: "done", source: "manual" },
    ]);

    expect(summary).toEqual([
      { key: "do_now", label: "Do now", count: 1, tone: "urgent" },
      { key: "this_week", label: "This week", count: 1, tone: "default" },
      { key: "when_income_lands", label: "When income lands", count: 1, tone: "accent" },
      { key: "manual", label: "Manual", count: 1, tone: "muted" },
      { key: "inactive", label: "Inactive", count: 1, tone: "subtle" },
    ]);
  });
});

describe("getVisibleActionLanes", () => {
  it("only returns lanes that currently have actions", () => {
    const lanes = getVisibleActionLanes([
      { id: "1", title: "Pay rent", lane: "do_now", status: "todo", source: "system" },
      { id: "2", title: "Call lender", lane: "manual", status: "todo", source: "manual" },
      { id: "3", title: "Old item", lane: "manual", status: "done", source: "manual" },
    ]);

    expect(lanes.map((lane) => lane.key)).toEqual(["do_now", "manual", "inactive"]);
    expect(lanes[0]?.actions.map((item) => item.id)).toEqual(["1"]);
    expect(lanes[1]?.actions.map((item) => item.id)).toEqual(["2"]);
    expect(lanes[2]?.actions.map((item) => item.id)).toEqual(["3"]);
  });

  it("returns no sections when the queue is empty", () => {
    expect(getVisibleActionLanes([])).toEqual([]);
  });
});

describe("getAvailableSpendBreakdownRows", () => {
  it("returns the explainable money inputs in a stable order and drops zero rows", () => {
    const rows = getAvailableSpendBreakdownRows({
      liquid_cash: 1380,
      protected_buffer: 300,
      active_reserves: 0,
      overdue_obligations: 125,
      obligations_due_within_horizon: 210,
      debt_minimums_due_within_horizon: 90,
      essentials_reserve_within_horizon: 140,
      reliable_income_within_horizon: 480,
      expected_income_within_horizon: 220,
      extra_allocations_within_horizon: 25,
    });

    expect(rows).toEqual([
      { key: "liquid_cash", label: "Liquid cash", amount: 1380, tone: "positive" },
      { key: "reliable_income_within_horizon", label: "Income plans", amount: 480, tone: "positive" },
      { key: "expected_income_within_horizon", label: "Expected income", amount: 220, tone: "positive" },
      { key: "protected_buffer", label: "Protected buffer", amount: -300, tone: "negative" },
      { key: "overdue_obligations", label: "Overdue obligations", amount: -125, tone: "negative" },
      { key: "obligations_due_within_horizon", label: "Due before next income", amount: -210, tone: "negative" },
      { key: "debt_minimums_due_within_horizon", label: "Debt minimums", amount: -90, tone: "negative" },
      { key: "essentials_reserve_within_horizon", label: "Essentials target", amount: -140, tone: "negative" },
      { key: "extra_allocations_within_horizon", label: "Planned allocations", amount: -25, tone: "negative" },
    ]);
  });
});
