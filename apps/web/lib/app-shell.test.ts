import { describe, expect, it } from "vitest";
import {
  getPullToRefreshDistance,
  getPullToRefreshProgress,
  getActiveNavItem,
  getMobileMenuNavItems,
  getMobilePrimaryNavItems,
  getMobileSecondaryNavItems,
  isMobileSecondaryRoute,
  navItems,
  shouldTriggerPullToRefresh,
} from "./app-shell";

describe("app-shell mobile helpers", () => {
  it("maps the root path to dashboard", () => {
    expect(getActiveNavItem("/", navItems)?.href).toBe("/dashboard");
  });

  it("keeps mobile navigation focused on four primary destinations", () => {
    const primary = getMobilePrimaryNavItems(navItems);
    expect(primary.map((item) => item.href)).toEqual(["/dashboard", "/quick-add", "/roadmap", "/tasks"]);
  });

  it("moves secondary destinations into the browse sheet", () => {
    const secondary = getMobileSecondaryNavItems(navItems);
    expect(secondary.map((item) => item.href)).toEqual(["/accounts", "/obligations", "/debts", "/settings"]);
    expect(isMobileSecondaryRoute("/debts", navItems)).toBe(true);
  });

  it("keeps every desktop destination reachable from the mobile menu", () => {
    const mobileMenuItems = getMobileMenuNavItems(navItems);
    expect(mobileMenuItems.map((item) => item.href)).toEqual(navItems.map((item) => item.href));
  });

  it("clamps pull-to-refresh drag distance to a positive range", () => {
    expect(getPullToRefreshDistance(100, 80)).toBe(0);
    expect(getPullToRefreshDistance(100, 160)).toBe(60);
    expect(getPullToRefreshDistance(100, 400)).toBe(132);
  });

  it("turns pull distance into a capped progress value", () => {
    expect(getPullToRefreshProgress(0)).toBe(0);
    expect(getPullToRefreshProgress(44)).toBe(0.5);
    expect(getPullToRefreshProgress(88)).toBe(1);
    expect(getPullToRefreshProgress(120)).toBe(1);
  });

  it("only triggers refresh once the drag passes the threshold", () => {
    expect(shouldTriggerPullToRefresh(60)).toBe(false);
    expect(shouldTriggerPullToRefresh(88)).toBe(true);
    expect(shouldTriggerPullToRefresh(132)).toBe(true);
  });
});
