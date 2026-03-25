import { describe, expect, it } from "vitest";
import { sampleDashboard } from "@/lib/sample-data";
import { getDashboardWeekSignals } from "@/lib/dashboard-view";

describe("getDashboardWeekSignals", () => {
  it("prioritizes the most urgent bill, next income, and roadmap focus", () => {
    const snapshot = {
      ...sampleDashboard,
      obligations: [
        {
          ...sampleDashboard.obligations[0],
          id: "utilities",
          name: "Utilities",
          status: "overdue" as const,
          dueDate: "2026-03-22",
          amount: 442.7,
        },
      ],
      upcomingIncome: [
        {
          ...sampleDashboard.upcomingIncome[0],
          id: "income-1",
          source: "Tutoring paycheck",
          dueDate: "2026-03-27",
          amount: 390,
        },
      ],
      roadmap: {
        ...sampleDashboard.roadmap,
        focus: {
          item: null,
          nextStep: {
            itemId: "goal-1",
            title: "Send first utilities payment",
            reason: "Utilities are overdue.",
          },
          whyNow: "Utilities are overdue.",
        },
      },
    };

    const signals = getDashboardWeekSignals(snapshot);

    expect(signals).toHaveLength(3);
    expect(signals[0]).toMatchObject({
      label: "Overdue",
      title: "Utilities",
    });
    expect(signals[1]).toMatchObject({
      label: "Next income",
      title: "Tutoring paycheck",
    });
    expect(signals[2]).toMatchObject({
      label: "Roadmap",
      title: "Send first utilities payment",
    });
  });

  it("falls back to the top priority when there is no roadmap step", () => {
    const snapshot = {
      ...sampleDashboard,
      roadmap: {
        ...sampleDashboard.roadmap,
        focus: {
          item: null,
          nextStep: null,
          whyNow: "No roadmap step yet.",
        },
      },
    };

    const signals = getDashboardWeekSignals(snapshot);

    expect(signals.at(-1)).toMatchObject({
      label: "This week",
      title: sampleDashboard.topPriorities[0]?.title,
    });
  });
});
