import type { DashboardSnapshot } from "@/lib/types";
import { compareDateValues, formatDateValue } from "@/lib/dates";
import { formatMoney } from "@/lib/finance";

export type DashboardWeekSignal = {
  id: string;
  label: string;
  title: string;
  detail: string;
};

function shortDate(value: string) {
  return formatDateValue(value, {
    month: "short",
    day: "numeric",
  });
}

export function getDashboardWeekSignals(snapshot: DashboardSnapshot): DashboardWeekSignal[] {
  const signals: DashboardWeekSignal[] = [];

  const urgentObligation =
    snapshot.obligations.find((item) => item.status === "overdue") ??
    snapshot.obligations
      .filter((item) => item.status === "due_soon" || item.status === "scheduled")
      .sort((left, right) => compareDateValues(left.dueDate, right.dueDate))[0];

  if (urgentObligation) {
    signals.push({
      id: `obligation-${urgentObligation.id}`,
      label: urgentObligation.status === "overdue" ? "Overdue" : "Bill coming up",
      title: urgentObligation.name,
      detail: `${shortDate(urgentObligation.dueDate)} • ${formatMoney(urgentObligation.amount)}`,
    });
  }

  const nextIncome = snapshot.upcomingIncome
    .filter((item) => item.status === "expected")
    .sort((left, right) => compareDateValues(left.dueDate, right.dueDate))[0];

  if (nextIncome) {
    signals.push({
      id: `income-${nextIncome.id}`,
      label: "Next income",
      title: nextIncome.source,
      detail: `${shortDate(nextIncome.dueDate)} • ${formatMoney(nextIncome.amount)}`,
    });
  }

  const roadmapStep = snapshot.roadmap.focus.nextStep;
  if (roadmapStep) {
    signals.push({
      id: `roadmap-${roadmapStep.itemId}`,
      label: "Roadmap",
      title: roadmapStep.title,
      detail: snapshot.roadmap.focus.whyNow,
    });
  } else if (snapshot.topPriorities[0]) {
    signals.push({
      id: `task-${snapshot.topPriorities[0].id}`,
      label: "This week",
      title: snapshot.topPriorities[0].title,
      detail: shortDate(snapshot.topPriorities[0].dueDate),
    });
  }

  return signals.slice(0, 3);
}
