"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowUpRight, BadgeDollarSign, Banknote, BellRing, CalendarCheck2, LayoutDashboard, Map, Settings2, SquarePen } from "lucide-react";
import type { ReactNode } from "react";
import { cn, Button } from "@/components/ui";
import { formatMoney, formatSignedMoney } from "@/lib/finance";
import { useLifeOsDashboard } from "@/lib/local-state";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/quick-add", label: "Quick add", icon: SquarePen },
  { href: "/accounts", label: "Accounts", icon: Banknote },
  { href: "/obligations", label: "Obligations", icon: CalendarCheck2 },
  { href: "/debts", label: "Debts", icon: BadgeDollarSign },
  { href: "/roadmap", label: "Roadmap", icon: Map },
  { href: "/tasks", label: "Tasks", icon: BellRing },
  { href: "/settings", label: "Settings", icon: Settings2 },
];

export function AppShell({ children }: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const activePath = pathname === "/" ? "/dashboard" : pathname;
  const dashboard = useLifeOsDashboard();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1600px] gap-6 px-3 py-3 md:px-6 md:py-6">
      <aside className="hidden h-[calc(100svh-2rem)] w-[clamp(18rem,22vw,24rem)] shrink-0 self-start rounded-[32px] border border-line bg-surface p-5 shadow-soft backdrop-blur-xl lg:sticky lg:top-4 lg:flex lg:flex-col">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-muted">Life OS</p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight">Personal operating system</h1>
          </div>
          <div className="rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent">Private</div>
        </div>

        <div className="mt-8 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activePath === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center justify-between rounded-2xl border px-4 py-3 text-sm transition duration-200",
                  active
                    ? "border-transparent bg-ink text-bg shadow-[0_12px_24px_rgba(16,32,24,0.18)]"
                    : "border-transparent text-muted hover:border-line hover:bg-white/65 hover:text-ink",
                )}
              >
                <span className="flex items-center gap-3">
                  <Icon className="h-4 w-4" />
                  {item.label}
                </span>
                <ArrowUpRight className="h-4 w-4 opacity-70" />
              </Link>
            );
          })}
        </div>

        <div className="mt-auto rounded-[24px] border border-line bg-white/70 p-4">
          <p className="text-[11px] uppercase tracking-[0.26em] text-muted">Today</p>
          <div className="mt-3 text-3xl font-semibold tracking-tight tabular-nums">
            {formatSignedMoney(dashboard.availableSpend.availableNow)}
          </div>
          <p className="mt-2 text-sm leading-6 text-muted">Safe to spend right now before expected income lands.</p>
          <p className="mt-3 text-xs leading-5 text-muted">
            Through next income: <span className="font-semibold tabular-nums text-ink">{formatMoney(dashboard.availableSpend.availableThroughNextIncome)}</span>
          </p>
          {dashboard.roadmap.focus.nextStep ? (
            <div className="mt-4 rounded-2xl bg-accent-soft p-3">
              <p className="text-[10px] uppercase tracking-[0.24em] text-accent">Roadmap focus</p>
              <p className="mt-1 text-sm font-medium text-ink">{dashboard.roadmap.focus.nextStep.title}</p>
            </div>
          ) : null}
          <Button className="mt-4 w-full" onClick={() => router.refresh()}>
            Refresh snapshot
          </Button>
        </div>
      </aside>

      <div className="flex min-h-0 flex-1 flex-col gap-3 md:gap-4">
        <header className="flex items-center justify-between rounded-[24px] border border-line bg-surface px-4 py-3.5 shadow-soft backdrop-blur-xl md:rounded-[28px] md:px-5">
          <div>
            <p className="text-[10px] uppercase tracking-[0.26em] text-muted md:text-[11px] md:tracking-[0.28em]">Today</p>
            <div className="mt-1 text-base font-semibold tracking-tight">Life OS</div>
          </div>
          <div className="hidden items-center gap-2 md:flex">
            <Link href="/quick-add" className={cn("inline-flex items-center justify-center rounded-full px-4 py-2.5 text-sm font-medium transition duration-200 ease-out bg-accent text-white hover:-translate-y-0.5 hover:bg-[#315a4c]")}>
              Quick add
            </Link>
            <Link href="/settings" className={cn("inline-flex items-center justify-center rounded-full px-4 py-2.5 text-sm font-medium transition duration-200 ease-out bg-accent-soft text-accent hover:bg-[rgba(61,111,94,0.22)]")}>
              Settings
            </Link>
          </div>
        </header>

        <main className="flex-1 pb-[calc(7rem+env(safe-area-inset-bottom))] md:life-scrollbar md:min-h-0 md:overflow-y-auto md:pb-0">
          {children}
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-[rgba(255,255,255,0.94)] px-2 pt-2 pb-[calc(0.55rem+env(safe-area-inset-bottom))] backdrop-blur-2xl lg:hidden">
          <div className="no-scrollbar mx-auto max-w-4xl overflow-x-auto">
            <div className="flex min-w-max items-start gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = activePath === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex min-w-[4.75rem] shrink-0 flex-col items-center gap-1 rounded-[20px] px-3 py-2 text-[10px] font-medium leading-tight transition",
                      active ? "bg-ink text-bg shadow-[0_10px_20px_rgba(16,32,24,0.16)]" : "text-ink/78 hover:bg-white hover:text-ink",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-center">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>
      </div>
    </div>
  );
}
