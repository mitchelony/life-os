"use client";

import { PencilLine, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge, Button, InlineField, Input, Panel, SectionHeading, Select, StatCard } from "@/components/ui";
import {
  createStoredAccountDraft,
  hasStoredAccountReferences,
  removeStoredAccountDraft,
  renameStoredAccountReferences,
  updateStoredAccountDraft,
} from "@/lib/account-management";
import { formatMoney } from "@/lib/finance";
import { buildDashboardFromSetup, createEmptyStoredLifeOsSetup, useStoredLifeOsSetup, type StoredAccountDraft } from "@/lib/local-state";

const accountTypeOptions = [
  { value: "checking", label: "Checking" },
  { value: "savings", label: "Savings" },
  { value: "cash", label: "Cash" },
  { value: "credit_card", label: "Credit card" },
] as const;

function accountTypeHelp(type: StoredAccountDraft["type"]) {
  switch (type) {
    case "checking":
      return "Use this for the cash you spend from most often.";
    case "savings":
      return "Use this for money you want the app to treat as set aside.";
    case "cash":
      return "Use this for wallet cash or any off-bank cash balance.";
    case "credit_card":
      return "Enter the current amount owed on the card.";
    default:
      return "Keep this as a manual account balance.";
  }
}

function AccountEditorCard({
  account,
  displayBalance,
  hasLinkedData,
  onSave,
  onDelete,
}: {
  account: StoredAccountDraft;
  displayBalance: number;
  hasLinkedData: boolean;
  onSave: (draft: StoredAccountDraft) => void;
  onDelete: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(account);

  useEffect(() => {
    setDraft(account);
  }, [account]);

  const balanceLabel = draft.type === "credit_card" ? "Amount owed" : "Current balance";
  const visibleBalance = draft.type === "credit_card" ? Math.abs(displayBalance) : displayBalance;

  return (
    <Panel className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{draft.type.replace("_", " ")}</Badge>
            <span className="text-xs text-muted">{draft.institution || "Manual institution"}</span>
          </div>
          <h2 className="mt-3 text-xl font-semibold tracking-tight text-ink">{draft.name || "New account"}</h2>
          <p className="mt-1 text-sm text-muted">{accountTypeHelp(draft.type)}</p>
        </div>
        <Button variant="ghost" className="shrink-0" onClick={() => setIsEditing((current) => !current)}>
          <PencilLine className="h-4 w-4" />
          {isEditing ? "Close" : "Edit"}
        </Button>
      </div>

      <div>
        <p className="text-[11px] uppercase tracking-[0.22em] text-muted">{balanceLabel}</p>
        <div className="mt-2 text-3xl font-semibold tracking-tight tabular-nums md:text-4xl">
          {formatMoney(visibleBalance)}
        </div>
      </div>

      {isEditing ? (
        <div className="grid gap-4 md:grid-cols-2">
          <InlineField label="Account name">
            <Input
              value={draft.name}
              onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
              placeholder="Wells Fargo Checking"
            />
          </InlineField>
          <InlineField label="Institution">
            <Input
              value={draft.institution}
              onChange={(event) => setDraft((current) => ({ ...current, institution: event.target.value }))}
              placeholder="Wells Fargo"
            />
          </InlineField>
          <InlineField label="Account type">
            <Select
              value={draft.type}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  type: event.target.value as StoredAccountDraft["type"],
                }))
              }
            >
              {accountTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </InlineField>
          <InlineField label={draft.type === "credit_card" ? "Amount owed" : "Balance"} description={accountTypeHelp(draft.type)}>
            <Input
              type="number"
              step="0.01"
              value={draft.balance}
              onChange={(event) => setDraft((current) => ({ ...current, balance: event.target.value }))}
              placeholder={draft.type === "credit_card" ? "498.28" : "1200.00"}
            />
          </InlineField>
          <div className="md:col-span-2 flex flex-wrap gap-2">
            <Button
              className="w-full sm:w-auto"
              onClick={() => {
                onSave({
                  ...draft,
                  name: draft.name.trim(),
                  institution: draft.institution.trim(),
                });
                setIsEditing(false);
              }}
              disabled={!draft.name.trim()}
            >
              Save account
            </Button>
            <Button variant="ghost" className="w-full sm:w-auto" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
          {hasLinkedData ? (
            <div className="md:col-span-2 text-sm text-muted">
              This account is still linked to transactions or planned items. Rename is safe. Delete it only after you move those links elsewhere.
            </div>
          ) : null}
        </div>
      ) : null}
    </Panel>
  );
}

export default function AccountsPage() {
  const { setup, hydrated, save } = useStoredLifeOsSetup();
  const dashboard = useMemo(() => buildDashboardFromSetup(setup), [setup]);
  const [showComposer, setShowComposer] = useState(false);
  const [newAccount, setNewAccount] = useState<StoredAccountDraft>(() => createStoredAccountDraft());

  const accountsById = useMemo(
    () => new Map(dashboard.accounts.map((account) => [account.id, account])),
    [dashboard.accounts],
  );

  function commit(nextSetup: ReturnType<typeof createEmptyStoredLifeOsSetup>) {
    save(nextSetup);
  }

  function addAccount() {
    if (!newAccount.name.trim()) return;
    const base = hydrated ? setup : createEmptyStoredLifeOsSetup();
    commit({
      ...base,
      accounts: [
        ...base.accounts,
        {
          ...newAccount,
          name: newAccount.name.trim(),
          institution: newAccount.institution.trim(),
        },
      ],
    });
    setNewAccount(createStoredAccountDraft());
    setShowComposer(false);
  }

  return (
    <div className="space-y-4 pb-24 md:space-y-6 md:pb-6">
      <Panel>
        <SectionHeading
          eyebrow="Accounts"
          title="Update your balances without leaving the page"
          description="Use this page to add, adjust, or remove the accounts the app uses for cash and debt."
          action={
            <Button className="w-full sm:w-auto" onClick={() => setShowComposer((current) => !current)}>
              <Plus className="h-4 w-4" />
              {showComposer ? "Close" : "Add account"}
            </Button>
          }
        />
      </Panel>

      <section className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
        <StatCard label="Liquid cash" value={formatMoney(dashboard.availableSpend.liquidCash)} />
        <StatCard label="Checking" value={formatMoney(dashboard.cashSummary.checking)} />
        <StatCard label="Savings" value={formatMoney(dashboard.cashSummary.savings)} />
        <StatCard label="Tracked debt" value={formatMoney(dashboard.cashSummary.totalDebt)} />
      </section>

      {showComposer ? (
        <Panel className="space-y-4">
          <SectionHeading
            eyebrow="New account"
            title="Add another balance to track"
            description="Keep this simple. The app only needs the name, type, institution, and current balance."
          />
          <div className="grid gap-4 md:grid-cols-2">
            <InlineField label="Account name">
              <Input
                value={newAccount.name}
                onChange={(event) => setNewAccount((current) => ({ ...current, name: event.target.value }))}
                placeholder="Cash App Savings"
              />
            </InlineField>
            <InlineField label="Institution">
              <Input
                value={newAccount.institution}
                onChange={(event) => setNewAccount((current) => ({ ...current, institution: event.target.value }))}
                placeholder="Cash App"
              />
            </InlineField>
            <InlineField label="Account type">
              <Select
                value={newAccount.type}
                onChange={(event) =>
                  setNewAccount((current) => ({
                    ...current,
                    type: event.target.value as StoredAccountDraft["type"],
                  }))
                }
              >
                {accountTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </InlineField>
            <InlineField label={newAccount.type === "credit_card" ? "Amount owed" : "Balance"} description={accountTypeHelp(newAccount.type)}>
              <Input
                type="number"
                step="0.01"
                value={newAccount.balance}
                onChange={(event) => setNewAccount((current) => ({ ...current, balance: event.target.value }))}
                placeholder={newAccount.type === "credit_card" ? "498.28" : "1200.00"}
              />
            </InlineField>
          </div>
          <Button className="w-full sm:w-auto" onClick={addAccount} disabled={!newAccount.name.trim()}>
            Save account
          </Button>
        </Panel>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-2">
        {setup.accounts.length ? (
          setup.accounts.map((account) => {
            const derivedAccount = accountsById.get(account.id);
            const displayBalance = derivedAccount?.balance ?? Number(account.balance || 0);

            return (
              <AccountEditorCard
                key={account.id}
                account={account}
                displayBalance={displayBalance}
                hasLinkedData={hasStoredAccountReferences(setup, account.name)}
                onSave={(draft) => {
                  const renamedSetup = renameStoredAccountReferences(setup, account.name, draft.name.trim());
                  commit({
                    ...renamedSetup,
                    accounts: updateStoredAccountDraft(renamedSetup.accounts, account.id, draft),
                  });
                }}
                onDelete={() => {
                  if (hasStoredAccountReferences(setup, account.name)) return;
                  commit({
                    ...setup,
                    accounts: removeStoredAccountDraft(setup.accounts, account.id),
                  });
                }}
              />
            );
          })
        ) : (
          <Panel className="lg:col-span-2">
            <SectionHeading
              eyebrow="No accounts yet"
              title="Add the balances you want the app to watch"
              description="Start with checking, savings, cash, or any credit card you want included in the picture."
            />
          </Panel>
        )}
      </section>
    </div>
  );
}
