"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowUpRight, Plus, RefreshCw, Settings2 } from "lucide-react";
import type { ReactNode } from "react";
import { cn, Button } from "@/components/ui";
import { formatMoney, formatSignedMoney } from "@/lib/finance";
import { chunkMobileNavItems, getActiveNavItem, navItems } from "@/lib/app-shell";
import { useLifeOsDashboard } from "@/lib/local-state";

export function AppShell({ children }: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const activeItem = getActiveNavItem(pathname);
  const activePath = activeItem.href;
  const dashboard = useLifeOsDashboard();
  const mobileRows = chunkMobileNavItems(navItems, 4);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1600px] gap-4 px-0 py-0 sm:px-3 sm:py-3 md:gap-6 md:px-6 md:py-6">
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

      <div className="flex min-h-0 flex-1 flex-col gap-3 px-3 pb-0 pt-3 sm:px-0 sm:pt-0 md:gap-4">
        <header className="rounded-[22px] border border-line bg-surface px-4 py-3 shadow-soft backdrop-blur-xl md:rounded-[28px] md:px-5 md:py-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.26em] text-muted md:text-[11px] md:tracking-[0.28em]">Life OS</p>
              <div className="mt-1 truncate text-base font-semibold tracking-tight md:text-lg">{activeItem.label}</div>
              <p className="mt-1 text-xs leading-5 text-muted md:hidden">
                Available now <span className="font-semibold tabular-nums text-ink">{formatSignedMoney(dashboard.availableSpend.availableNow)}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/quick-add"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent text-white shadow-[0_10px_20px_rgba(61,111,94,0.18)] transition hover:bg-[#315a4c] md:hidden"
                aria-label="Quick add"
              >
                <Plus className="h-4 w-4" />
              </Link>
              <Link
                href="/settings"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white/88 text-ink transition hover:bg-white md:hidden"
                aria-label="Settings"
              >
                <Settings2 className="h-4 w-4" />
              </Link>
            </div>
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

        <main className="flex-1 pb-[calc(9rem+env(safe-area-inset-bottom))] md:life-scrollbar md:min-h-0 md:overflow-y-auto md:pb-0">
          {children}
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-[rgba(255,255,255,0.96)] px-3 pt-2 pb-[calc(0.65rem+env(safe-area-inset-bottom))] backdrop-blur-2xl lg:hidden">
          <div className="mx-auto max-w-4xl rounded-[26px] border border-line bg-white/86 p-2 shadow-[0_-10px_30px_rgba(16,32,24,0.08)]">
            <div className="grid gap-1">
              {mobileRows.map((row, rowIndex) => (
                <div key={`mobile-nav-row-${rowIndex}`} className="grid grid-cols-4 gap-1">
                  {row.map((item) => {
                    const Icon = item.icon;
                    const active = activePath === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex min-h-[4.35rem] flex-col items-center justify-center gap-1 rounded-[18px] px-2 py-2 text-[10px] font-medium leading-tight transition",
                          active ? "bg-ink text-bg shadow-[0_10px_20px_rgba(16,32,24,0.14)]" : "text-ink/78 hover:bg-white hover:text-ink",
                        )}
                      >
                        <Icon className="h-[1.05rem] w-[1.05rem]" />
                        <span className="text-center">{item.mobileLabel}</span>
                      </Link>
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="mt-2 flex items-center justify-between gap-2 rounded-[18px] bg-accent-soft px-3 py-2">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.22em] text-accent">Available now</p>
                <p className="truncate text-sm font-semibold tabular-nums text-ink">{formatSignedMoney(dashboard.availableSpend.availableNow)}</p>
              </div>
              <Button variant="ghost" className="h-9 rounded-full px-3 py-0 text-xs" onClick={() => router.refresh()}>
                <RefreshCw className="h-3.5 w-3.5" /> Refresh
              </Button>
            </div>
          </div>
        </nav>
      </div>
    </div>
  );
}
