import type { LucideIcon } from "lucide-react";
import { BadgeDollarSign, Banknote, BellRing, CalendarCheck2, LayoutDashboard, Map, Settings2, SquarePen } from "lucide-react";

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
  { href: "/tasks", label: "Tasks", mobileLabel: "Tasks", icon: BellRing },
  { href: "/settings", label: "Settings", mobileLabel: "Settings", icon: Settings2 },
];

export function getActiveNavItem(pathname: string, items = navItems) {
  const activePath = pathname === "/" ? "/dashboard" : pathname;
  return items.find((item) => item.href === activePath) ?? items[0];
}

export function chunkMobileNavItems(items: AppNavItem[], rowSize = 4) {
  const rows: AppNavItem[][] = [];
  for (let index = 0; index < items.length; index += rowSize) {
    rows.push(items.slice(index, index + rowSize));
  }
  return rows;
}
