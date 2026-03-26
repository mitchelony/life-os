"use client";

import { PencilLine, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge, Button, InlineField, Input, Panel, SectionHeading, Select, StatCard } from "@/components/ui";
import { api, type BackendAccount, type BackendAccountCreatePayload, type BackendAccountUpdatePayload } from "@/lib/api";
import { notifyDecisionChanged } from "@/lib/decision";
import { formatMoney } from "@/lib/finance";

const accountTypeOptions = [
  { value: "checking", label: "Checking" },
  { value: "savings", label: "Savings" },
  { value: "cash", label: "Cash" },
  { value: "credit_card", label: "Credit card" },
  { value: "debt", label: "Debt" },
] as const;

type AccountDraft = {
  name: string;
  institution: string;
  type: BackendAccount["type"];
  balance: string;
  notes: string;
};

const emptyDraft: AccountDraft = {
  name: "",
  institution: "",
  type: "checking",
  balance: "",
  notes: "",
};

function accountTypeHelp(type: BackendAccount["type"]) {
  switch (type) {
    case "checking":
      return "Use this for the cash you spend from most often.";
    case "savings":
      return "Use this for money you want the app to treat as set aside.";
    case "cash":
      return "Use this for wallet cash or any off-bank cash balance.";
    case "credit_card":
      return "Enter the current amount owed on the card.";
    case "debt":
      return "Use this only for non-card debt accounts you want to track as accounts.";
    default:
      return "Keep this as a manual account balance.";
  }
}

function toCreatePayload(draft: AccountDraft): BackendAccountCreatePayload {
  return {
    name: draft.name.trim(),
    institution: draft.institution.trim() || null,
    type: draft.type,
    balance: Number(draft.balance || 0),
    notes: draft.notes.trim() || null,
    is_active: true,
  };
}

function toUpdatePayload(draft: AccountDraft): BackendAccountUpdatePayload {
  return {
    name: draft.name.trim(),
    institution: draft.institution.trim() || null,
    type: draft.type,
    balance: Number(draft.balance || 0),
    notes: draft.notes.trim() || null,
  };
}

function AccountEditorCard({
  account,
  onSave,
  onDelete,
}: {
  account: BackendAccount;
  onSave: (accountId: string, draft: AccountDraft) => Promise<void>;
  onDelete: (accountId: string) => Promise<void>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [draft, setDraft] = useState<AccountDraft>({
    name: account.name,
    institution: account.institution ?? "",
    type: account.type,
    balance: String(account.balance),
    notes: account.notes ?? "",
  });

  useEffect(() => {
    setDraft({
      name: account.name,
      institution: account.institution ?? "",
      type: account.type,
      balance: String(account.balance),
      notes: account.notes ?? "",
    });
  }, [account]);

  const balanceLabel = draft.type === "credit_card" || draft.type === "debt" ? "Amount owed" : "Current balance";
  const visibleBalance = draft.type === "credit_card" || draft.type === "debt" ? Math.abs(account.balance) : account.balance;

  async function run(task: () => Promise<void>) {
    setPending(true);
    try {
      await task();
    } finally {
      setPending(false);
    }
  }

  return (
    <Panel className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{draft.type.replace("_", " ")}</Badge>
            <span className="text-xs text-muted">{draft.institution || "Manual institution"}</span>
            {!account.can_delete ? <Badge>linked</Badge> : null}
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
        <div className="mt-2 text-3xl font-semibold tracking-tight tabular-nums md:text-4xl">{formatMoney(visibleBalance)}</div>
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
            <Select value={draft.type} onChange={(event) => setDraft((current) => ({ ...current, type: event.target.value as BackendAccount["type"] }))}>
              {accountTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </InlineField>
          <InlineField label={draft.type === "credit_card" || draft.type === "debt" ? "Amount owed" : "Balance"} description={accountTypeHelp(draft.type)}>
            <Input
              type="number"
              step="0.01"
              value={draft.balance}
              onChange={(event) => setDraft((current) => ({ ...current, balance: event.target.value }))}
              placeholder={draft.type === "credit_card" || draft.type === "debt" ? "498.28" : "1200.00"}
            />
          </InlineField>
          <InlineField label="Notes" helper="Optional" description="Use this only for something you actually want to remember later.">
            <Input
              value={draft.notes}
              onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
              placeholder="Main spending account"
            />
          </InlineField>
          <div className="md:col-span-2 flex flex-wrap gap-2">
            <Button
              className="w-full sm:w-auto"
              disabled={pending || !draft.name.trim()}
              onClick={() =>
                run(async () => {
                  await onSave(account.id, draft);
                  setIsEditing(false);
                })
              }
            >
              Save account
            </Button>
            <Button variant="ghost" className="w-full sm:w-auto" disabled={pending} onClick={() => run(() => onDelete(account.id))}>
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
          {!account.can_delete ? (
            <div className="md:col-span-2 text-sm text-muted">
              This account is still linked to {account.linked_record_count ?? 0} record(s). Rename is safe. Delete it only after you move those links elsewhere.
            </div>
          ) : null}
        </div>
      ) : null}
    </Panel>
  );
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<BackendAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [newAccount, setNewAccount] = useState<AccountDraft>(emptyDraft);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const nextAccounts = await api.listAccounts();
      setAccounts(nextAccounts);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function sync(task: () => Promise<unknown>) {
    setPending(true);
    setError(null);
    try {
      await task();
      await load();
      notifyDecisionChanged();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save account changes.");
    } finally {
      setPending(false);
    }
  }

  const stats = useMemo(() => {
    const liquidCash = accounts.filter((item) => item.type === "checking" || item.type === "savings" || item.type === "cash").reduce((sum, item) => sum + item.balance, 0);
    const checking = accounts.filter((item) => item.type === "checking").reduce((sum, item) => sum + item.balance, 0);
    const savings = accounts.filter((item) => item.type === "savings").reduce((sum, item) => sum + item.balance, 0);
    const trackedDebt = accounts.filter((item) => item.type === "credit_card" || item.type === "debt").reduce((sum, item) => sum + Math.abs(item.balance), 0);
    return { liquidCash, checking, savings, trackedDebt };
  }, [accounts]);

  async function addAccount() {
    if (!newAccount.name.trim()) return;
    await sync(async () => {
      await api.createAccount(toCreatePayload(newAccount));
      setNewAccount(emptyDraft);
      setShowComposer(false);
    });
  }

  if (loading) {
    return (
      <div className="space-y-4 pb-24 md:space-y-6 md:pb-6">
        <Panel>
          <SectionHeading eyebrow="Accounts" title="Loading account balances" description="Pulling the latest account list from the API." />
        </Panel>
      </div>
    );
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

      {error ? <Panel className="border-[rgba(165,57,42,0.18)] bg-[rgba(165,57,42,0.06)] text-sm text-ink">{error}</Panel> : null}

      <section className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
        <StatCard label="Liquid cash" value={formatMoney(stats.liquidCash)} />
        <StatCard label="Checking" value={formatMoney(stats.checking)} />
        <StatCard label="Savings" value={formatMoney(stats.savings)} />
        <StatCard label="Tracked debt" value={formatMoney(stats.trackedDebt)} />
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
              <Select value={newAccount.type} onChange={(event) => setNewAccount((current) => ({ ...current, type: event.target.value as BackendAccount["type"] }))}>
                {accountTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </InlineField>
            <InlineField label={newAccount.type === "credit_card" || newAccount.type === "debt" ? "Amount owed" : "Balance"} description={accountTypeHelp(newAccount.type)}>
              <Input
                type="number"
                step="0.01"
                value={newAccount.balance}
                onChange={(event) => setNewAccount((current) => ({ ...current, balance: event.target.value }))}
                placeholder={newAccount.type === "credit_card" || newAccount.type === "debt" ? "498.28" : "1200.00"}
              />
            </InlineField>
            <InlineField label="Notes" helper="Optional">
              <Input
                value={newAccount.notes}
                onChange={(event) => setNewAccount((current) => ({ ...current, notes: event.target.value }))}
                placeholder="Main spending account"
              />
            </InlineField>
          </div>
          <Button className="w-full sm:w-auto" disabled={pending || !newAccount.name.trim()} onClick={() => void addAccount()}>
            Save account
          </Button>
        </Panel>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-2">
        {accounts.length ? (
          accounts.map((account) => (
            <AccountEditorCard
              key={account.id}
              account={account}
              onSave={(accountId, draft) => sync(() => api.updateAccount(accountId, toUpdatePayload(draft)))}
              onDelete={(accountId) => sync(() => api.deleteAccount(accountId))}
            />
          ))
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
