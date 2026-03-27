type LinkedAction = {
  id: string;
  linkedType?: string;
  linkedId?: string;
  lane: string;
  status: string;
};

type GoalLike = {
  id?: string;
  title?: string;
  status?: string;
  steps: Array<{
    status: string;
  }>;
};

type PlanLike = {
  amount: number;
  allocations: Array<{
    amount: number;
  }>;
};

const lanePriority: Record<string, number> = {
  do_now: 0,
  this_week: 1,
  when_income_lands: 2,
  manual: 3,
};

export function findLinkedAction<T extends LinkedAction>(actions: T[], linkedType: string, linkedId: string) {
  return actions
    .filter((action) => action.linkedType === linkedType && action.linkedId === linkedId)
    .sort((left, right) => {
      const leftDone = left.status === "done" ? 1 : 0;
      const rightDone = right.status === "done" ? 1 : 0;
      if (leftDone !== rightDone) return leftDone - rightDone;
      return (lanePriority[left.lane] ?? 99) - (lanePriority[right.lane] ?? 99);
    })[0];
}

export function getPlanAllocatedAmount<T extends PlanLike>(plan: T) {
  return plan.allocations.reduce((total, item) => total + item.amount, 0);
}

export function getPlanRemainingAmount<T extends PlanLike>(plan: T) {
  return plan.amount - getPlanAllocatedAmount(plan);
}

export function getGoalOpenStepCount<T extends GoalLike>(goal: T) {
  return goal.steps.filter((step) => step.status !== "done").length;
}

export function getGoalSections<T extends GoalLike>(goals: T[]) {
  const sections = [
    {
      key: "active",
      goals: goals.filter((goal) => goal.status === "active" || goal.status === "blocked"),
    },
    {
      key: "planned",
      goals: goals.filter((goal) => goal.status === "planned"),
    },
    {
      key: "completed",
      goals: goals.filter((goal) => goal.status === "completed"),
    },
  ] as const;

  return sections.filter((section) => section.goals.length);
}
