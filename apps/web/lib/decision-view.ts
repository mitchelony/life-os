export type DecisionActionLike = {
  id: string;
  title: string;
  lane: string;
  status: string;
  source: string;
};

export function groupActionsByLane<T extends DecisionActionLike>(actions: T[]) {
  return {
    doNow: actions.filter((item) => item.lane === "do_now"),
    thisWeek: actions.filter((item) => item.lane === "this_week"),
    whenIncomeLands: actions.filter((item) => item.lane === "when_income_lands"),
    manual: actions.filter((item) => item.lane === "manual"),
  };
}

export function describeTrend(direction: "forward" | "backward" | "steady") {
  if (direction === "forward") return "Moving forward";
  if (direction === "backward") return "Moving backward";
  return "Holding steady";
}
