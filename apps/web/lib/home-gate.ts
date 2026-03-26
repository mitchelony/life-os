export type HomeGateActionId = "retry" | "logout" | "setup" | "dashboard";

export function getHomeGateActionIds(hasRouteError: boolean): HomeGateActionId[] {
  return hasRouteError ? ["retry", "logout"] : ["setup", "dashboard"];
}
