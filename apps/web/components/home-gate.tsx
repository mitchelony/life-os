"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Badge, Panel, cn } from "@/components/ui";
import { formatMoney } from "@/lib/finance";
import { sampleDashboard } from "@/lib/sample-data";

const onboardingKey = process.env.NEXT_PUBLIC_ONBOARDING_KEY ?? "life-os-onboarded";

export function HomeGate() {
  const router = useRouter();

  useEffect(() => {
    const isOnboarded = window.localStorage.getItem(onboardingKey) === "true";
    router.replace(isOnboarded ? "/dashboard" : "/settings");
  }, [router]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-4 py-8">
      <Panel className="w-full overflow-hidden p-0">
        <div className="grid gap-0 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="p-6 sm:p-10">
            <Badge>Life OS</Badge>
            <h1 className="mt-5 max-w-2xl text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
              A calm personal operating system for money, tasks, and next actions.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-muted">
              You should know what is next, what follows, and what is safe to spend without opening a spreadsheet.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => router.push("/settings")}
                className="inline-flex items-center justify-center rounded-full bg-ink px-4 py-2.5 text-sm font-medium text-bg transition duration-200 hover:-translate-y-0.5 hover:bg-[#0c1511]"
              >
                Open setup
              </button>
              <button
                type="button"
                onClick={() => router.push("/dashboard")}
                className={cn(
                  "inline-flex items-center justify-center rounded-full border border-line bg-transparent px-4 py-2.5 text-sm font-medium text-ink transition duration-200 hover:-translate-y-0.5 hover:bg-black/5",
                )}
              >
                Open dashboard
              </button>
            </div>
          </div>

          <div className="border-t border-line bg-[linear-gradient(180deg,rgba(61,111,94,0.12),rgba(255,255,255,0.65))] p-6 sm:p-8 lg:border-l lg:border-t-0">
            <div className="rounded-[28px] border border-line bg-white/80 p-5 shadow-soft">
              <p className="text-[11px] uppercase tracking-[0.26em] text-muted">Preview</p>
              <div className="mt-3 text-4xl font-semibold tracking-tight tabular-nums">
                {formatMoney(sampleDashboard.availableSpend.availableThroughNextIncome)}
              </div>
              <p className="mt-2 text-sm leading-6 text-muted">Safe to spend through the next income once bills and guardrails are covered.</p>
              <p className="mt-2 text-xs leading-5 text-muted">
                Available now:{" "}
                <span className="font-semibold tabular-nums text-ink">{formatMoney(sampleDashboard.availableSpend.availableNow)}</span>
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-accent-soft p-4">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-accent">Next</p>
                  <p className="mt-2 text-sm font-medium text-ink">{sampleDashboard.nextItem}</p>
                </div>
                <div className="rounded-2xl bg-white/85 p-4">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-muted">After that</p>
                  <p className="mt-2 text-sm font-medium text-ink">{sampleDashboard.afterThat}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Panel>
    </main>
  );
}
