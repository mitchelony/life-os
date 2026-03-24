"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowUpRight, Compass, LogOut, Plus, RefreshCw, Settings2, X } from "lucide-react";
import type { ReactNode, TouchEvent as ReactTouchEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { cn, Button } from "@/components/ui";
import { formatMoney, formatSignedMoney } from "@/lib/finance";
import { signOut } from "@/lib/auth";
import {
  getPullToRefreshDistance,
  getPullToRefreshProgress,
  getActiveNavItem,
  getMobilePrimaryNavItems,
  getMobileSecondaryNavItems,
  isMobileSecondaryRoute,
  navItems,
  shouldTriggerPullToRefresh,
} from "@/lib/app-shell";
import { useLifeOsDashboard } from "@/lib/local-state";

export function AppShell({ children }: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const activeItem = getActiveNavItem(pathname);
  const activePath = activeItem.href;
  const dashboard = useLifeOsDashboard();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const pullStartYRef = useRef<number | null>(null);
  const refreshTimeoutRef = useRef<number | null>(null);
  const mobilePrimaryItems = getMobilePrimaryNavItems(navItems);
  const mobileSecondaryItems = getMobileSecondaryNavItems(navItems);
  const mobileMoreActive = isMobileSecondaryRoute(pathname, navItems);
  const showMobileSummary = activePath === "/dashboard";
  const showMobileQuickAddButton = !["/quick-add", "/roadmap", "/settings"].includes(activePath);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) window.clearTimeout(refreshTimeoutRef.current);
    };
  }, []);

  function resetPullState() {
    pullStartYRef.current = null;
    setPullDistance(0);
  }

  function handleTouchStart(event: ReactTouchEvent<HTMLDivElement>) {
    if (refreshing || mobileMenuOpen || typeof window === "undefined") return;
    if (window.innerWidth >= 768) return;
    if (window.scrollY > 0) return;
    pullStartYRef.current = event.touches[0]?.clientY ?? null;
  }

  function handleTouchMove(event: ReactTouchEvent<HTMLDivElement>) {
    if (refreshing || mobileMenuOpen || pullStartYRef.current === null) return;
    const currentY = event.touches[0]?.clientY;
    if (currentY === undefined) return;
    setPullDistance(getPullToRefreshDistance(pullStartYRef.current, currentY));
  }

  function handleTouchEnd() {
    if (refreshing) return;
    if (shouldTriggerPullToRefresh(pullDistance)) {
      setRefreshing(true);
      router.refresh();
      if (refreshTimeoutRef.current) window.clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = window.setTimeout(() => {
        setRefreshing(false);
      }, 900);
    }
    resetPullState();
  }

  async function handleSignOut() {
    await signOut();
    setMobileMenuOpen(false);
    router.replace("/login");
    router.refresh();
  }

  const pullProgress = getPullToRefreshProgress(pullDistance);
  const showPullIndicator = refreshing || pullDistance > 0;

  return (
    <div
      className="mx-auto flex min-h-screen w-full max-w-[1600px] gap-4 px-0 py-0 sm:px-3 sm:py-3 md:gap-6 md:px-6 md:py-6"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
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
          <p className="mt-2 text-sm leading-6 text-muted">What you can safely spend right now.</p>
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
          <Button variant="ghost" className="mt-2 w-full" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" /> Log out
          </Button>
        </div>
      </aside>

      <div className="flex min-h-0 flex-1 flex-col gap-3 px-3 pb-0 pt-3 sm:px-0 sm:pt-0 md:gap-4">
        {showPullIndicator ? (
          <div className="pointer-events-none fixed inset-x-0 top-3 z-50 flex justify-center md:hidden">
            <div
              className="rounded-full border border-line bg-[rgba(255,255,255,0.96)] px-4 py-2 shadow-[0_12px_28px_rgba(16,32,24,0.12)] backdrop-blur-xl transition"
              style={{
                transform: `translateY(${Math.min(20, pullDistance * 0.28)}px) scale(${0.94 + pullProgress * 0.06})`,
                opacity: refreshing ? 1 : Math.max(0.52, pullProgress),
              }}
            >
              <div className="flex items-center gap-2 text-xs font-medium text-ink">
                <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
                <span>{refreshing ? "Refreshing" : pullProgress >= 1 ? "Release to refresh" : "Pull to refresh"}</span>
              </div>
            </div>
          </div>
        ) : null}

        <header className="px-1 py-1 md:rounded-[28px] md:border md:border-line md:bg-surface md:px-5 md:py-3.5 md:shadow-soft md:backdrop-blur-xl">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.26em] text-muted md:text-[11px] md:tracking-[0.28em]">Life OS</p>
              <div className="mt-1 truncate text-[1.35rem] font-semibold tracking-tight md:text-lg">{activeItem.label}</div>
              {showMobileSummary ? (
                <div className="mt-2 flex flex-wrap items-center gap-2 md:hidden">
                  <span className="rounded-full border border-line bg-white/92 px-3 py-1 text-xs font-medium text-ink shadow-[0_6px_20px_rgba(16,32,24,0.06)]">
                    Available now <span className="tabular-nums">{formatSignedMoney(dashboard.availableSpend.availableNow)}</span>
                  </span>
                  <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
                    Through next income {formatMoney(dashboard.availableSpend.availableThroughNextIncome)}
                  </span>
                </div>
              ) : null}
            </div>
            {showMobileQuickAddButton ? (
              <div className="flex items-center gap-2 md:hidden">
                <Link
                  href="/quick-add"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-accent text-white shadow-[0_10px_22px_rgba(61,111,94,0.16)] transition hover:bg-[#315a4c]"
                  aria-label="Quick add"
                >
                  <Plus className="h-4.5 w-4.5" />
                </Link>
              </div>
            ) : null}
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

        <main className="flex-1 pb-[calc(6.75rem+env(safe-area-inset-bottom))] md:life-scrollbar md:min-h-0 md:overflow-y-auto md:pb-0">
          {children}
        </main>

        {mobileMenuOpen ? (
          <div className="fixed inset-0 z-40 bg-[rgba(16,32,24,0.28)] backdrop-blur-[2px] lg:hidden" onClick={() => setMobileMenuOpen(false)}>
            <div
              className="absolute inset-x-0 bottom-0 rounded-t-[32px] border border-line bg-[rgba(255,255,255,0.98)] px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 shadow-[0_-22px_50px_rgba(16,32,24,0.16)]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.24em] text-muted">Browse</p>
                  <h2 className="mt-1 text-lg font-semibold tracking-tight text-ink">More pages</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-line bg-white text-ink"
                  aria-label="Close menu"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 grid gap-2">
                {mobileSecondaryItems.map((item) => {
                  const Icon = item.icon;
                  const active = activePath === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center justify-between rounded-[20px] border px-4 py-3 text-sm transition",
                        active
                          ? "border-transparent bg-ink text-bg shadow-[0_12px_24px_rgba(16,32,24,0.14)]"
                          : "border-line bg-white/92 text-ink",
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

              <div className="mt-4 rounded-[22px] bg-accent-soft p-4">
                <p className="text-[10px] uppercase tracking-[0.22em] text-accent">Today</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums text-ink">
                  {formatSignedMoney(dashboard.availableSpend.availableNow)}
                </p>
                <p className="mt-1 text-sm text-muted">
                  Through next income <span className="font-semibold tabular-nums text-ink">{formatMoney(dashboard.availableSpend.availableThroughNextIncome)}</span>
                </p>
                <Button variant="ghost" className="mt-4 h-10 w-full rounded-full" onClick={() => router.refresh()}>
                  <RefreshCw className="h-3.5 w-3.5" /> Refresh snapshot
                </Button>
                <Button variant="ghost" className="mt-2 h-10 w-full rounded-full" onClick={handleSignOut}>
                  <LogOut className="h-3.5 w-3.5" /> Log out
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        <nav className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(0.55rem+env(safe-area-inset-bottom))] pt-2 lg:hidden">
          <div className="mx-auto max-w-md rounded-[24px] border border-line bg-[rgba(255,255,255,0.96)] px-2 py-1.5 shadow-[0_14px_34px_rgba(16,32,24,0.1)] backdrop-blur-2xl">
            <div className="grid grid-cols-5 gap-1.5">
              {mobilePrimaryItems.map((item) => {
                const Icon = item.icon;
                const active = activePath === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex min-h-[3.35rem] flex-col items-center justify-center gap-0.5 rounded-[16px] px-1 py-1.5 text-[9px] font-medium leading-tight transition",
                      active ? "bg-ink text-bg shadow-[0_10px_24px_rgba(16,32,24,0.14)]" : "text-ink/78 hover:bg-white hover:text-ink",
                    )}
                  >
                    <Icon className="h-[0.95rem] w-[0.95rem]" />
                    <span className="text-center">{item.mobileLabel}</span>
                  </Link>
                );
              })}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className={cn(
                  "flex min-h-[3.35rem] flex-col items-center justify-center gap-0.5 rounded-[16px] px-1 py-1.5 text-[9px] font-medium leading-tight transition",
                  mobileMoreActive || mobileMenuOpen ? "bg-accent-soft text-accent" : "text-ink/78 hover:bg-white hover:text-ink",
                )}
              >
                <Compass className="h-[0.95rem] w-[0.95rem]" />
                <span className="text-center">Browse</span>
              </button>
            </div>
          </div>
        </nav>
      </div>
    </div>
  );
}
