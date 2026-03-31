export type RootPageMode = "landing" | "app_gate";

export function getRootPageMode(hasAuthSession: boolean): RootPageMode {
  return hasAuthSession ? "app_gate" : "landing";
}
