"use client";

import { Badge, Panel, SectionHeading, StatCard } from "@/components/ui";
import { formatMoney } from "@/lib/finance";
import { useLifeOsDashboard } from "@/lib/local-state";

export default function AccountsPage() {
  const dashboard = useLifeOsDashboard();

  return (
    <div className="space-y-4 pb-24 md:space-y-6 md:pb-6">
      <Panel>
        <SectionHeading eyebrow="Accounts" title="Cash and debt snapshot" description="Just enter the balances yourself for now." />
      </Panel>

      <section className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
        <StatCard label="Liquid cash" value={formatMoney(dashboard.availableSpend.liquidCash)} />
        <StatCard label="Checking" value={formatMoney(dashboard.cashSummary.checking)} />
        <StatCard label="Savings" value={formatMoney(dashboard.cashSummary.savings)} />
        <StatCard label="Tracked debt" value={formatMoney(dashboard.cashSummary.totalDebt)} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {dashboard.accounts.map((account) => (
          <Panel key={account.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-muted">{account.institution}</p>
                <h2 className="mt-2 text-xl font-semibold tracking-tight">{account.name}</h2>
                <p className="mt-1 text-sm text-muted">{account.notes}</p>
              </div>
              <Badge>{account.type.replace("_", " ")}</Badge>
            </div>
            <div className="mt-5 text-3xl font-semibold tracking-tight tabular-nums md:mt-6 md:text-4xl">{formatMoney(account.balance)}</div>
            <p className="mt-2 text-sm text-muted">{account.active ? "Active" : "Inactive"}</p>
          </Panel>
        ))}
      </section>
    </div>
  );
}
