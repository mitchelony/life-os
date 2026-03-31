import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { RoadmapCopilotPanelView } from "@/components/roadmap-copilot-panel";
import type { BackendRoadmapCopilotDraftResponse } from "@/lib/api";

const sampleDraft: BackendRoadmapCopilotDraftResponse = {
  draft_id: "draft-1",
  status: "draft",
  summary: "Refocus the roadmap around rent and the next paycheck.",
  rationale: "Rent is due soon and one paycheck is still expected.",
  warnings: ["Available now is below zero at $40.00."],
  preview: {
    goals: [
      { title: "Stabilize the next required bills", priority: "critical", step_count: 2 },
      { title: "Keep debt minimums current", priority: "high", step_count: 1 },
    ],
    income_plans: [{ label: "Next income from Payroll", amount: 1200, allocation_count: 3 }],
    actions: [
      { title: "Pay Rent", lane: "do_now" },
      { title: "Pay Capital One minimum", lane: "this_week" },
    ],
    preserved_income_entries: 1,
  },
  payload: {
    version: 2,
    reset_planning_first: true,
    goals: [],
    income_plans: [],
    cash_reserves: [],
    expected_income_entries: [],
    obligations: [],
    debts: [],
    actions: [],
  },
  message: "Focus on rent first.",
  planner_source: "copilot",
};

describe("RoadmapCopilotPanelView", () => {
  it("renders the empty composer state when no active draft exists", () => {
    const html = renderToStaticMarkup(
      <RoadmapCopilotPanelView
        draft={null}
        prompt="I need a better plan."
        revisionNote=""
        error={null}
        feedback={null}
        pending={false}
        adjustmentOpen={false}
        emergencyOpen={false}
        emergencyDraft={{
          message: "",
          amount: "",
          title: "",
          merchant_or_source: "",
          category: "",
          account: "",
          date: "2026-03-26",
          notes: "",
        }}
        accounts={[]}
        categories={[]}
      />,
    );

    expect(html).toContain("Tell the copilot what changed");
    expect(html).toContain("Draft plan");
    expect(html).toContain("Record emergency expense");
    expect(html).toContain("The copilot can reshape the plan");
  });

  it("renders the active draft review state with preview content", () => {
    const html = renderToStaticMarkup(
      <RoadmapCopilotPanelView
        draft={sampleDraft}
        prompt=""
        revisionNote=""
        error={null}
        feedback={null}
        pending={false}
        adjustmentOpen={false}
        emergencyOpen={false}
        emergencyDraft={{
          message: "",
          amount: "",
          title: "",
          merchant_or_source: "",
          category: "",
          account: "",
          date: "2026-03-26",
          notes: "",
        }}
        accounts={[]}
        categories={[]}
      />,
    );

    expect(html).toContain(sampleDraft.summary);
    expect(html).toContain("Approve");
    expect(html).toContain("Adjust");
    expect(html).toContain("Deny");
    expect(html).toContain("Stabilize the next required bills");
    expect(html).toContain("Next income from Payroll");
    expect(html).toContain("Pay Rent");
    expect(html).toContain("Preserving 1 expected income entr");
    expect(html).toContain("what actually happened");
  });

  it("renders the adjustment and emergency forms when those controls are open", () => {
    const html = renderToStaticMarkup(
      <RoadmapCopilotPanelView
        draft={sampleDraft}
        prompt=""
        revisionNote="Put utilities first."
        error="Draft failed."
        feedback="Emergency expense recorded."
        pending={false}
        adjustmentOpen
        emergencyOpen
        emergencyDraft={{
          message: "Car repair came in.",
          amount: "275",
          title: "Emergency car repair",
          merchant_or_source: "City Garage",
          category: "Auto",
          account: "Checking",
          date: "2026-03-26",
          notes: "Paid immediately.",
        }}
        accounts={[{ id: "account-1", name: "Checking" }]}
        categories={["Auto", "Utilities"]}
      />,
    );

    expect(html).toContain("Adjust the draft");
    expect(html).toContain("Put utilities first.");
    expect(html).toContain("Record emergency expense and replan");
    expect(html).toContain("Emergency car repair");
    expect(html).toContain("Draft failed.");
    expect(html).toContain("Emergency expense recorded.");
  });
});
