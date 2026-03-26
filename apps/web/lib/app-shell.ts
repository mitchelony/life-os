import type { LucideIcon } from "lucide-react";
import { BadgeDollarSign, Banknote, BellRing, CalendarCheck2, Coins, LayoutDashboard, Map, Settings2, SquarePen } from "lucide-react";

export type AppNavItem = {
  href: string;
  label: string;
  mobileLabel: string;
  icon: LucideIcon;
};

export const navItems: AppNavItem[] = [
  { href: "/dashboard", label: "Dashboard", mobileLabel: "Dashboard", icon: LayoutDashboard },
  { href: "/quick-add", label: "Quick add", mobileLabel: "Quick add", icon: SquarePen },
  { href: "/accounts", label: "Accounts", mobileLabel: "Accounts", icon: Banknote },
  { href: "/obligations", label: "Obligations", mobileLabel: "Bills", icon: CalendarCheck2 },
  { href: "/debts", label: "Debts", mobileLabel: "Debts", icon: BadgeDollarSign },
  { href: "/roadmap", label: "Roadmap", mobileLabel: "Roadmap", icon: Map },
  { href: "/income", label: "Income", mobileLabel: "Income", icon: Coins },
  { href: "/tasks", label: "Actions", mobileLabel: "Actions", icon: BellRing },
  { href: "/settings", label: "Settings", mobileLabel: "Settings", icon: Settings2 },
];

export const mobilePrimaryNavHrefs = ["/dashboard", "/quick-add", "/roadmap", "/tasks"] as const;
export const pullToRefreshThreshold = 88;
export const pullToRefreshMaxDistance = 132;

export function getMobilePrimaryNavItems(items = navItems) {
  return items.filter((item) => mobilePrimaryNavHrefs.includes(item.href as (typeof mobilePrimaryNavHrefs)[number]));
}

export function getMobileSecondaryNavItems(items = navItems) {
  return items.filter((item) => !mobilePrimaryNavHrefs.includes(item.href as (typeof mobilePrimaryNavHrefs)[number]));
}

export function getMobileMenuNavItems(items = navItems) {
  return [...items];
}

export function isMobileSecondaryRoute(pathname: string, items = navItems) {
  const activeItem = getActiveNavItem(pathname, items);
  return !mobilePrimaryNavHrefs.includes(activeItem.href as (typeof mobilePrimaryNavHrefs)[number]);
}

export function getActiveNavItem(pathname: string, items = navItems) {
  const activePath = pathname === "/" ? "/dashboard" : pathname;
  return items.find((item) => item.href === activePath) ?? items[0];
}

export function getPullToRefreshDistance(startY: number, currentY: number, maxDistance = pullToRefreshMaxDistance) {
  return Math.max(0, Math.min(maxDistance, currentY - startY));
}

export function getPullToRefreshProgress(distance: number, threshold = pullToRefreshThreshold) {
  return Math.max(0, Math.min(1, distance / threshold));
}

export function shouldTriggerPullToRefresh(distance: number, threshold = pullToRefreshThreshold) {
  return distance >= threshold;
}

export function chunkMobileNavItems(items: AppNavItem[], rowSize = 4) {
  const rows: AppNavItem[][] = [];
  for (let index = 0; index < items.length; index += rowSize) {
    rows.push(items.slice(index, index + rowSize));
  }
  return rows;
}
