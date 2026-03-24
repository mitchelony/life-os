"use client";

import { Badge, Panel, SectionHeading } from "@/components/ui";
import { formatMoney } from "@/lib/finance";
import { useLifeOsDashboard } from "@/lib/local-state";

function dueLabel(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

export default function DebtsPage() {
  const dashboard = useLifeOsDashboard();

  return (
    <div className="space-y-6 pb-24 md:pb-6">
      <Panel>
        <SectionHeading
          eyebrow="Debts"
          title="Minimums and payoff pressure"
          description="Keep the next minimum payment visible without turning the app into a debt spreadsheet."
        />
      </Panel>
      <section className="grid gap-4 lg:grid-cols-2">
        {dashboard.debts.map((item) => (
          <Panel key={item.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-muted">Debt</p>
                <h2 className="mt-2 text-xl font-semibold tracking-tight">{item.name}</h2>
                <p className="mt-1 text-sm text-muted">{dueLabel(item.dueDate)}</p>
              </div>
              <Badge>{Math.round(item.payoffProgress * 100)}% paid</Badge>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Metric label="Balance" value={formatMoney(item.currentBalance)} />
              <Metric label="Minimum payment" value={formatMoney(item.minimumPayment)} />
            </div>
            {item.strategy ? (
              <div className="mt-4 rounded-[22px] border border-line bg-accent-soft p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="border-transparent bg-white/90 text-accent">{item.strategy.mode.replace("_", " ")}</Badge>
                  {item.strategy.priority ? <Badge className="border-transparent bg-white/90 text-accent">{item.strategy.priority}</Badge> : null}
                </div>
                {item.strategy.recommendedExtraPayment ? (
                  <p className="mt-3 text-sm font-medium text-ink">
                    Recommended extra payment: {formatMoney(item.strategy.recommendedExtraPayment)}
                  </p>
                ) : null}
                {item.strategy.notes ? <p className="mt-2 text-sm text-muted">{item.strategy.notes}</p> : null}
              </div>
            ) : null}
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-black/6">
              <div className="h-full rounded-full bg-accent" style={{ width: `${Math.round(item.payoffProgress * 100)}%` }} />
            </div>
            {item.notes ? <p className="mt-3 text-sm text-muted">{item.notes}</p> : null}
          </Panel>
        ))}
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-line bg-white/70 p-4">
      <p className="text-[11px] uppercase tracking-[0.24em] text-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
    </div>
  );
}
