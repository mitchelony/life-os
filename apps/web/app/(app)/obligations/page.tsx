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

function recurrenceLabel(value: string) {
  return value === "one-time" ? "One time" : value.charAt(0).toUpperCase() + value.slice(1);
}

export default function ObligationsPage() {
  const dashboard = useLifeOsDashboard();

  return (
    <div className="space-y-4 pb-24 md:space-y-6 md:pb-6">
      <Panel>
        <SectionHeading
          eyebrow="Obligations"
          title="Bills and required payments"
          description="Recurring and one-time bills are shown in due-date order so the next thing is obvious."
        />
      </Panel>
      <section className="grid gap-4 lg:grid-cols-2">
        {dashboard.obligations.map((item) => (
          <Panel key={item.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-muted">{recurrenceLabel(item.recurrence)}</p>
                <h2 className="mt-2 text-xl font-semibold tracking-tight">{item.name}</h2>
                <p className="mt-1 text-sm text-muted">{dueLabel(item.dueDate)}</p>
              </div>
              <Badge>{item.status.replace("_", " ")}</Badge>
            </div>
            <div className="mt-5 text-3xl font-semibold tracking-tight tabular-nums md:mt-6 md:text-4xl">{formatMoney(item.amount)}</div>
            {item.linkedAccount ? <p className="mt-2 text-sm text-muted">Linked to {item.linkedAccount}</p> : null}
            {item.strategy ? (
              <div className="mt-4 rounded-[22px] border border-line bg-accent-soft p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="border-transparent bg-white/90 text-accent">{item.strategy.handling.replace("_", " ")}</Badge>
                  {item.strategy.priority ? <Badge className="border-transparent bg-white/90 text-accent">{item.strategy.priority}</Badge> : null}
                </div>
                {item.strategy.installmentAmount ? (
                  <p className="mt-3 text-sm font-medium text-ink">
                    Reserve {formatMoney(item.strategy.installmentAmount)} {item.strategy.installmentCadence ? `${item.strategy.installmentCadence}` : "this cycle"}.
                  </p>
                ) : null}
                {item.strategy.nextPlannedPayment ? (
                  <p className="mt-2 text-sm text-muted">
                    Next planned payment: {formatMoney(item.strategy.nextPlannedPayment)}
                    {item.strategy.nextPlanLabel ? ` from ${item.strategy.nextPlanLabel}` : ""}
                  </p>
                ) : null}
                {item.strategy.notes ? <p className="mt-2 text-sm text-muted">{item.strategy.notes}</p> : null}
              </div>
            ) : null}
          </Panel>
        ))}
      </section>
    </div>
  );
}
