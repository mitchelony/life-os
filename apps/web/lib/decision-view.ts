export type DecisionActionLike = {
  id: string;
  title: string;
  lane: string;
  status: string;
  source: string;
};

export function isInactiveActionStatus(status: string) {
  return status === "done" || status === "skipped" || status === "blocked";
}

export function groupActionsByLane<T extends DecisionActionLike>(actions: T[]) {
  const active = actions.filter((item) => !isInactiveActionStatus(item.status));
  const inactive = actions.filter((item) => isInactiveActionStatus(item.status));
  return {
    doNow: active.filter((item) => item.lane === "do_now"),
    thisWeek: active.filter((item) => item.lane === "this_week"),
    whenIncomeLands: active.filter((item) => item.lane === "when_income_lands"),
    manual: active.filter((item) => item.lane === "manual"),
    inactive,
  };
}

export function describeTrend(direction: "forward" | "backward" | "steady") {
  if (direction === "forward") return "Moving forward";
  if (direction === "backward") return "Moving backward";
  return "Holding steady";
}
