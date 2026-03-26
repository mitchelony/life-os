import { describe, expect, it } from "vitest";
import { normalizeDecisionSnapshot, shouldResetAuthSession } from "@/lib/decision";

describe("normalizeDecisionSnapshot", () => {
  it("keeps new dashboard payloads stable for the UI", () => {
    const snapshot = normalizeDecisionSnapshot({
      generated_at: "2026-03-26T12:00:00Z",
      focus: {
        primary_action: { id: "a1", title: "Pay rent", status: "todo", lane: "do_now", source: "system" },
        secondary_action: null,
        why_now: "Rent is due first.",
      },
      ordered_action_queue: [{ id: "a1", title: "Pay rent", status: "todo", lane: "do_now", source: "system" }],
      roadmap_summary: { goals: [], plans: [] },
      cashflow_glance: {
        trailing_30_inflow: 0,
        trailing_30_outflow: 0,
        trailing_30_net: 0,
        next_14_planned_inflow: 500,
        next_14_required_outflow: 300,
        next_income_date: null,
        next_pressure_point: null,
      },
      recent_updates: [],
      progress_summary: {
        free_now: 200,
        free_after_planned_income: 500,
        total_debt: 1000,
        overdue_count: 1,
        completed_actions_7d: 2,
        goal_completion_rate: 25,
        seven_day: {
          direction: "forward",
          free_now_delta: 20,
          free_after_planned_income_delta: 10,
          total_debt_delta: -50,
          overdue_delta: -1,
          completed_actions_delta: 1,
        },
        thirty_day: {
          direction: "steady",
          free_now_delta: 0,
          free_after_planned_income_delta: 0,
          total_debt_delta: 0,
          overdue_delta: 0,
          completed_actions_delta: 0,
        },
      },
      free_now: {
        amount: 200,
        breakdown: {
          liquid_cash: 1000,
          protected_buffer: 200,
          active_reserves: 100,
          overdue_obligations: 50,
          obligations_due_within_horizon: 200,
          debt_minimums_due_within_horizon: 150,
          essentials_reserve_within_horizon: 100,
          reliable_income_within_horizon: 0,
          extra_allocations_within_horizon: 0,
        },
      },
      free_after_planned_income: {
        amount: 500,
        breakdown: {
          liquid_cash: 1000,
          protected_buffer: 200,
          active_reserves: 100,
          overdue_obligations: 50,
          obligations_due_within_horizon: 200,
          debt_minimums_due_within_horizon: 150,
          essentials_reserve_within_horizon: 100,
          reliable_income_within_horizon: 400,
          extra_allocations_within_horizon: 100,
        },
      },
    });

    expect(snapshot.focus.primaryAction?.title).toBe("Pay rent");
    expect(snapshot.freeNow.amount).toBe(200);
    expect(snapshot.freeAfterPlannedIncome.amount).toBe(500);
    expect(snapshot.progress.sevenDay.direction).toBe("forward");
  });
});

describe("shouldResetAuthSession", () => {
  it("treats 401 request failures as stale auth", () => {
    expect(shouldResetAuthSession(new Error("Request failed with 401"))).toBe(true);
    expect(shouldResetAuthSession(new Error("Request failed with 500"))).toBe(false);
  });
});
