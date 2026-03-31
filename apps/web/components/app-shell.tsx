"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowUpRight, LogOut, Menu, Plus, RefreshCw, X } from "lucide-react";
import type { ReactNode, TouchEvent as ReactTouchEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { Button, cn } from "@/components/ui";
import { signOut } from "@/lib/auth";
import {
  getActiveNavItem,
  getMobileMenuNavItems,
  getMobilePrimaryNavItems,
  getMobileSecondaryNavItems,
  getPullToRefreshDistance,
  getPullToRefreshProgress,
  isMobileSecondaryRoute,
  navItems,
  shouldTriggerPullToRefresh,
} from "@/lib/app-shell";
import { useDecisionSnapshot } from "@/lib/decision";
import { formatMoney, formatSignedMoney } from "@/lib/finance";

export function AppShell({ children }: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const activeItem = getActiveNavItem(pathname);
  const activePath = activeItem.href;
  const { snapshot } = useDecisionSnapshot();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const pullStartYRef = useRef<number | null>(null);
  const refreshTimeoutRef = useRef<number | null>(null);
  const mobilePrimaryItems = getMobilePrimaryNavItems(navItems);
  const mobileMenuItems = getMobileMenuNavItems(navItems);
  const desktopPrimaryItems = getMobilePrimaryNavItems(navItems);
  const desktopSecondaryItems = getMobileSecondaryNavItems(navItems);
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
    if (typeof window !== "undefined") {
      window.location.assign("/login");
      return;
    }
    router.replace("/login");
  }

  const pullProgress = getPullToRefreshProgress(pullDistance);
  const showPullIndicator = refreshing || pullDistance > 0;
  const freeNow = snapshot?.freeNow.amount ?? 0;
  const freeAfter = snapshot?.freeAfterPlannedIncome.amount ?? 0;
  const roadmapFocus = snapshot?.focus.primaryAction?.title;
  const focusReason = snapshot?.focus.whyNow;

  return (
    <div
      className="mx-auto flex min-h-screen w-full max-w-[1660px] gap-4 px-0 py-0 sm:px-3 sm:py-3 md:gap-6 md:px-5 md:py-5"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <aside className="hidden h-[calc(100svh-1.5rem)] w-[clamp(18rem,22vw,24rem)] shrink-0 self-start overflow-hidden rounded-[34px] border border-line bg-[rgba(255,255,255,0.72)] p-4 shadow-[0_22px_54px_rgba(20,35,29,0.08)] backdrop-blur-2xl lg:sticky lg:top-3 lg:grid lg:grid-rows-[auto_minmax(0,1fr)_auto] lg:gap-4">
        <div className="border-b border-line pb-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-muted">Life OS</p>
              <h1 className="mt-1.5 text-[1.12rem] font-semibold tracking-tight">Your money plan</h1>
            </div>
            <div className="rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent">Private</div>
          </div>
          <p className="mt-2 max-w-[15rem] text-sm leading-5 text-muted">Keep the next bill and the safe-to-spend number in view.</p>
        </div>

        <div className="life-scrollbar min-h-0 overflow-y-auto overscroll-contain pr-1">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted">Main pages</p>
            <div className="mt-3 space-y-1.5">
              {desktopPrimaryItems.map((item) => {
                const Icon = item.icon;
                const active = activePath === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "relative flex items-center justify-between overflow-hidden rounded-[22px] px-4 py-3 text-sm transition duration-200",
                      active
                        ? "bg-ink text-bg shadow-[0_14px_28px_rgba(20,35,29,0.18)] ring-1 ring-[rgba(20,35,29,0.06)]"
                        : "text-muted hover:bg-white/78 hover:text-ink",
                    )}
                  >
                    <span className={cn("flex items-center gap-3", active && "font-semibold")}>
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </span>
                    <ArrowUpRight className={cn("h-4 w-4", active ? "opacity-100" : "opacity-70")} />
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="mt-5 border-t border-line pt-5">
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted">More</p>
            <div className="mt-3 space-y-1.5">
              {desktopSecondaryItems.map((item) => {
                const Icon = item.icon;
                const active = activePath === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "relative flex items-center justify-between overflow-hidden rounded-[20px] px-4 py-3 text-sm transition duration-200",
                      active
                        ? "bg-[linear-gradient(135deg,rgba(20,35,29,0.98),rgba(41,77,67,0.96))] text-white shadow-[0_14px_28px_rgba(20,35,29,0.14)]"
                        : "text-muted hover:bg-white/72 hover:text-ink",
                    )}
                  >
                    <span className={cn("flex items-center gap-3", active && "font-semibold")}>
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </span>
                    <ArrowUpRight className={cn("h-4 w-4", active ? "opacity-100" : "opacity-60")} />
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        <div className="rounded-[26px] border border-line bg-[linear-gradient(180deg,rgba(20,35,29,0.98),rgba(49,88,77,0.94))] p-4 text-white">
          <p className="text-[10px] uppercase tracking-[0.24em] text-white/62">Available now</p>
          <div className="mt-2 text-[2.15rem] font-semibold tracking-tight tabular-nums">{formatSignedMoney(freeNow)}</div>
          <p className="mt-1.5 text-sm leading-5 text-white/72">Safe to spend before bills, minimums, and essentials need it.</p>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 px-3 pb-0 pt-3 sm:px-0 sm:pt-0 md:gap-4">
        {showPullIndicator ? (
          <div className="pointer-events-none fixed inset-x-0 top-3 z-50 flex justify-center md:hidden">
            <div
              className="rounded-full border border-line bg-[rgba(255,255,255,0.96)] px-4 py-2 shadow-[0_12px_28px_rgba(20,35,29,0.12)] backdrop-blur-xl transition"
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

        <header className="md:rounded-[30px] md:border md:border-line md:bg-[rgba(255,255,255,0.7)] md:px-5 md:py-4 md:shadow-[0_18px_40px_rgba(20,35,29,0.06)] md:backdrop-blur-xl">
          <div className="flex items-start justify-between gap-3 px-1 py-1 md:px-0 md:py-0">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.26em] text-muted md:text-[11px] md:tracking-[0.28em]">{activeItem.label}</p>
              <div className="mt-1 truncate text-[1.5rem] font-semibold tracking-tight md:text-[1.7rem]">
                {roadmapFocus && activePath === "/dashboard" ? roadmapFocus : activeItem.label}
              </div>
              <p className="mt-1 hidden max-w-3xl text-sm leading-6 text-muted md:block">
                {focusReason ?? "Keep the next bill and the next safe move in view without redoing the math in your head."}
              </p>
              {showMobileSummary ? (
                <div className="mt-2 flex flex-wrap items-center gap-2 md:hidden">
                  <span className="rounded-full border border-line bg-white/92 px-3 py-1 text-xs font-medium text-ink shadow-[0_6px_20px_rgba(20,35,29,0.06)]">
                    Available now <span className="tabular-nums">{formatSignedMoney(freeNow)}</span>
                  </span>
                  <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
                    Through next income {formatMoney(freeAfter)}
                  </span>
                </div>
              ) : null}
            </div>

            {showMobileQuickAddButton ? (
              <div className="flex items-center gap-2 md:hidden">
                <Link
                  href="/quick-add"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-accent text-white shadow-[0_10px_22px_rgba(51,95,83,0.16)] transition hover:bg-[#294d43]"
                  aria-label="Quick add"
                >
                  <Plus className="h-4.5 w-4.5" />
                </Link>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(true)}
                  className={cn(
                    "inline-flex h-11 items-center justify-center gap-2 rounded-full border border-line bg-white/92 px-4 text-sm font-medium text-ink shadow-[0_10px_22px_rgba(20,35,29,0.08)] transition hover:bg-white",
                    (mobileMoreActive || mobileMenuOpen) && "border-transparent bg-ink text-bg shadow-[0_12px_24px_rgba(20,35,29,0.16)]",
                  )}
                  aria-label="Open menu"
                >
                  <Menu className="h-4.5 w-4.5" />
                  <span>Menu</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className={cn(
                  "inline-flex h-11 items-center justify-center gap-2 rounded-full border border-line bg-white/92 px-4 text-sm font-medium text-ink shadow-[0_10px_22px_rgba(20,35,29,0.08)] transition hover:bg-white md:hidden",
                  (mobileMoreActive || mobileMenuOpen) && "border-transparent bg-ink text-bg shadow-[0_12px_24px_rgba(20,35,29,0.16)]",
                )}
                aria-label="Open menu"
              >
                <Menu className="h-4.5 w-4.5" />
                <span>Menu</span>
              </button>
            )}
          </div>

          <div className="mt-4 hidden items-center justify-between gap-4 md:flex">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-line bg-white/92 px-3 py-1 text-xs font-medium text-ink">
                Available now <span className="tabular-nums">{formatSignedMoney(freeNow)}</span>
              </span>
              <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
                Through next income {formatMoney(freeAfter)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/quick-add"
                className="inline-flex items-center justify-center rounded-full bg-accent px-4 py-2.5 text-sm font-medium text-white transition duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#294d43]"
              >
                Quick add
              </Link>
              <Link
                href="/settings"
                className="inline-flex items-center justify-center rounded-full border border-line bg-white/72 px-4 py-2.5 text-sm font-medium text-ink transition duration-200 ease-out hover:-translate-y-0.5 hover:bg-white"
              >
                Settings
              </Link>
            </div>
          </div>
        </header>

        <main className="flex-1 pb-[calc(6.75rem+env(safe-area-inset-bottom))] md:life-scrollbar md:min-h-0 md:overflow-y-auto md:pb-0">
          {children}
        </main>

        {mobileMenuOpen ? (
          <div className="fixed inset-0 z-40 bg-[rgba(20,35,29,0.28)] backdrop-blur-[2px] lg:hidden" onClick={() => setMobileMenuOpen(false)}>
            <div
              className="absolute inset-x-0 bottom-0 max-h-[calc(100svh-1rem)] overflow-y-auto overscroll-contain rounded-t-[34px] border border-line bg-[rgba(255,255,255,0.98)] px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-4 shadow-[0_-22px_50px_rgba(20,35,29,0.16)] [touch-action:pan-y]"
              style={{ WebkitOverflowScrolling: "touch" }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.24em] text-muted">Menu</p>
                  <h2 className="mt-1 text-lg font-semibold tracking-tight text-ink">Everything in one place</h2>
                  <p className="mt-1 text-sm text-muted">Jump between the daily workspace and the supporting money screens.</p>
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

              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button variant="ghost" className="h-11 rounded-full" onClick={() => router.refresh()}>
                  <RefreshCw className="h-3.5 w-3.5" /> Refresh
                </Button>
                <Button variant="ghost" className="h-11 rounded-full" onClick={handleSignOut}>
                  <LogOut className="h-3.5 w-3.5" /> Log out
                </Button>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                {mobileMenuItems.map((item) => {
                  const Icon = item.icon;
                  const active = activePath === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "relative flex min-h-[4.8rem] flex-col items-start justify-between overflow-hidden rounded-[22px] border px-4 py-3 text-sm transition",
                        active
                          ? "border-transparent bg-ink text-bg shadow-[0_12px_24px_rgba(20,35,29,0.16)] before:absolute before:left-3 before:top-3 before:h-8 before:w-1 before:rounded-full before:bg-white/68"
                          : "border-line bg-white/92 text-ink",
                      )}
                    >
                      <span className={cn("flex items-center gap-3", active && "font-semibold")}>
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </span>
                      <span className="mt-2 inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.18em] opacity-70">
                        Open
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </span>
                    </Link>
                  );
                })}
              </div>

              <div className="mt-4 rounded-[24px] bg-[linear-gradient(180deg,rgba(20,35,29,0.98),rgba(49,88,77,0.94))] p-4 text-white">
                <p className="text-[10px] uppercase tracking-[0.22em] text-white/58">Available now</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{formatSignedMoney(freeNow)}</p>
                <p className="mt-1 text-sm text-white/72">
                  Through next income <span className="font-semibold tabular-nums text-white">{formatMoney(freeAfter)}</span>
                </p>
              </div>
            </div>
          </div>
        ) : null}

        <nav className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(0.55rem+env(safe-area-inset-bottom))] pt-2 lg:hidden">
          <div className="mx-auto max-w-md rounded-[26px] border border-line bg-[rgba(255,255,255,0.96)] px-2 py-1.5 shadow-[0_14px_34px_rgba(20,35,29,0.1)] backdrop-blur-2xl">
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
                      active ? "bg-ink text-bg shadow-[0_10px_24px_rgba(20,35,29,0.16)]" : "text-ink/78 hover:bg-white hover:text-ink",
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
                  mobileMoreActive || mobileMenuOpen ? "bg-ink text-bg shadow-[0_10px_24px_rgba(20,35,29,0.16)]" : "text-ink/78 hover:bg-white hover:text-ink",
                )}
              >
                <Menu className="h-[0.95rem] w-[0.95rem]" />
                <span className="text-center">Menu</span>
              </button>
            </div>
          </div>
        </nav>
      </div>
    </div>
  );
}
