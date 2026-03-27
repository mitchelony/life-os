"use client";

import { Check, PencilLine, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useFeedback } from "@/components/feedback-provider";
import { Badge, Button, InlineField, Input, Panel, SectionHeading, Select, Textarea } from "@/components/ui";
import {
  api,
  type BackendAccount,
  type BackendIncomeEntry,
  type BackendIncomeEntryCreatePayload,
  type BackendIncomeEntryUpdatePayload,
} from "@/lib/api";
import { notifyDecisionChanged } from "@/lib/decision";
import { formatMoney } from "@/lib/finance";

type IncomeDraft = {
  source_name: string;
  amount: string;
  status: "expected" | "received" | "missed";
  expected_on: string;
  received_on: string;
  account_id: string;
  notes: string;
};

const emptyDraft: IncomeDraft = {
  source_name: "",
  amount: "",
  status: "expected",
  expected_on: "",
  received_on: "",
  account_id: "",
  notes: "",
};

function shortDate(value?: string | null) {
  if (!value) return "No date";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function statusTone(status: string) {
  if (status === "expected") return "border-transparent bg-accent-soft text-accent";
  if (status === "received") return "border-transparent bg-[rgba(47,107,82,0.14)] text-[#2f6b52]";
  return "border-transparent bg-[rgba(163,76,60,0.12)] text-[#8a3022]";
}

function toCreatePayload(draft: IncomeDraft): BackendIncomeEntryCreatePayload {
  return {
    source_name: draft.source_name.trim(),
    amount: Number(draft.amount || 0),
    status: draft.status,
    expected_on: draft.expected_on || null,
    received_on: draft.received_on || null,
    account_id: draft.account_id || null,
    notes: draft.notes.trim() || null,
  };
}

function toUpdatePayload(draft: IncomeDraft): BackendIncomeEntryUpdatePayload {
  return {
    source_name: draft.source_name.trim(),
    amount: Number(draft.amount || 0),
    status: draft.status,
    expected_on: draft.expected_on || null,
    received_on: draft.received_on || null,
    account_id: draft.account_id || null,
    notes: draft.notes.trim() || null,
  };
}

function IncomeEntryCard({
  entry,
  accounts,
  onSaved,
  onDeleted,
  onConfirmed,
}: {
  entry: BackendIncomeEntry;
  accounts: BackendAccount[];
  onSaved: (entryId: string, draft: IncomeDraft) => Promise<boolean>;
  onDeleted: (entryId: string) => Promise<void>;
  onConfirmed: (entryId: string, accountId?: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [draft, setDraft] = useState<IncomeDraft>({
    source_name: entry.source_name,
    amount: String(entry.amount),
    status: entry.status,
    expected_on: entry.expected_on ?? "",
    received_on: entry.received_on ?? "",
    account_id: entry.account_id ?? "",
    notes: entry.notes ?? "",
  });

  useEffect(() => {
    setDraft({
      source_name: entry.source_name,
      amount: String(entry.amount),
      status: entry.status,
      expected_on: entry.expected_on ?? "",
      received_on: entry.received_on ?? "",
      account_id: entry.account_id ?? "",
      notes: entry.notes ?? "",
    });
  }, [entry]);

  async function run(task: () => Promise<void>) {
    setPending(true);
    try {
      await task();
    } finally {
      setPending(false);
    }
  }

  return (
    <Panel className="space-y-4 bg-white/74">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={statusTone(entry.status)}>{entry.status}</Badge>
            {entry.account_id ? <Badge>{accounts.find((item) => item.id === entry.account_id)?.name ?? "Linked account"}</Badge> : null}
          </div>
          <h3 className="mt-3 text-xl font-semibold tracking-tight text-ink">{entry.source_name}</h3>
          <p className="mt-1 text-sm text-muted">
            {entry.status === "received" ? `Received ${shortDate(entry.received_on)}` : `Expected ${shortDate(entry.expected_on)}`}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted">Amount</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">{formatMoney(entry.amount)}</p>
        </div>
      </div>

      {entry.notes ? <p className="text-sm leading-6 text-muted">{entry.notes}</p> : null}

      {editing ? (
        <div className="grid gap-4 md:grid-cols-2">
          <InlineField label="Source">
            <Input value={draft.source_name} onChange={(event) => setDraft((current) => ({ ...current, source_name: event.target.value }))} />
          </InlineField>
          <InlineField label="Amount">
            <Input value={draft.amount} inputMode="decimal" onChange={(event) => setDraft((current) => ({ ...current, amount: event.target.value }))} />
          </InlineField>
          <InlineField label="Status">
            <Select value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as IncomeDraft["status"] }))}>
              <option value="expected">expected</option>
              <option value="received">received</option>
              <option value="missed">missed</option>
            </Select>
          </InlineField>
          <InlineField label="Account">
            <Select value={draft.account_id} onChange={(event) => setDraft((current) => ({ ...current, account_id: event.target.value }))}>
              <option value="">No linked account</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </Select>
          </InlineField>
          <InlineField label="Expected on">
            <Input type="date" value={draft.expected_on} onChange={(event) => setDraft((current) => ({ ...current, expected_on: event.target.value }))} />
          </InlineField>
          <InlineField label="Received on">
            <Input type="date" value={draft.received_on} onChange={(event) => setDraft((current) => ({ ...current, received_on: event.target.value }))} />
          </InlineField>
          <InlineField label="Notes" helper="Optional">
            <Textarea rows={3} value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} />
          </InlineField>
          <div className="md:col-span-2 flex flex-wrap gap-2">
            <Button
              disabled={pending || !draft.source_name.trim() || !draft.amount}
              onClick={() =>
                run(async () => {
                  const saved = await onSaved(entry.id, draft);
                  if (saved) {
                    setEditing(false);
                  }
                })
              }
            >
              Save income
            </Button>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {entry.status === "expected" ? (
          <Button disabled={pending} onClick={() => run(() => onConfirmed(entry.id, entry.account_id ?? undefined))}>
            <Check className="h-4 w-4" />
            Confirm received
          </Button>
        ) : null}
        <Button variant="ghost" disabled={pending} onClick={() => setEditing((current) => !current)}>
          <PencilLine className="h-4 w-4" />
          {editing ? "Close" : "Edit"}
        </Button>
        <Button variant="ghost" disabled={pending} onClick={() => run(() => onDeleted(entry.id))}>
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
      </div>
    </Panel>
  );
}

export function ExpectedIncomeManager({ onChanged }: { onChanged?: () => Promise<void> | void }) {
  const { pushFeedback } = useFeedback();
  const [entries, setEntries] = useState<BackendIncomeEntry[]>([]);
  const [accounts, setAccounts] = useState<BackendAccount[]>([]);
  const [pending, setPending] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [draft, setDraft] = useState<IncomeDraft>(emptyDraft);

  async function load() {
    const [nextEntries, nextAccounts] = await Promise.all([api.listIncomeEntries(), api.listAccounts()]);
    nextEntries.sort((left, right) => {
      const leftDate = left.expected_on ?? left.received_on ?? "";
      const rightDate = right.expected_on ?? right.received_on ?? "";
      return leftDate.localeCompare(rightDate);
    });
    setEntries(nextEntries);
    setAccounts(nextAccounts.filter((item) => item.type !== "credit_card" && item.type !== "debt"));
  }

  useEffect(() => {
    void load();
  }, []);

  async function sync(task: () => Promise<unknown>, successTitle: string, errorTitle: string) {
    setPending(true);
    try {
      await task();
      await load();
      notifyDecisionChanged();
      await onChanged?.();
      pushFeedback({ tone: "success", title: successTitle });
      return true;
    } catch (error) {
      pushFeedback({
        tone: "error",
        title: errorTitle,
        description: error instanceof Error ? error.message : "Try again.",
      });
      return false;
    } finally {
      setPending(false);
    }
  }

  const expectedCount = useMemo(() => entries.filter((item) => item.status === "expected").length, [entries]);
  const expectedEntries = entries.filter((item) => item.status === "expected");
  const receivedEntries = entries.filter((item) => item.status === "received");
  const missedEntries = entries.filter((item) => item.status === "missed");

  return (
    <section className="space-y-3">
      <Panel>
        <SectionHeading
          eyebrow="Expected income"
          title="Track incoming money after onboarding"
          description="View, edit, and confirm expected income so the roadmap knows what money is actually on the way."
          action={
            <Button variant="secondary" disabled={pending} onClick={() => setComposerOpen((current) => !current)}>
              <Plus className="h-4 w-4" />
              {composerOpen ? "Close" : "Add expected income"}
            </Button>
          }
        />
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <Panel className="bg-white/72">
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted">Open expected</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">{expectedCount}</p>
          </Panel>
          <Panel className="bg-white/72">
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted">Total expected</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">
              {formatMoney(entries.filter((item) => item.status === "expected").reduce((sum, item) => sum + item.amount, 0))}
            </p>
          </Panel>
          <Panel className="bg-white/72">
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted">Received entries</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">{entries.filter((item) => item.status === "received").length}</p>
          </Panel>
        </div>

        {composerOpen ? (
          <div className="mt-5 grid gap-4 rounded-[24px] border border-line bg-white/74 p-4 md:grid-cols-2">
            <InlineField label="Source">
              <Input value={draft.source_name} onChange={(event) => setDraft((current) => ({ ...current, source_name: event.target.value }))} placeholder="Payroll" />
            </InlineField>
            <InlineField label="Amount">
              <Input value={draft.amount} inputMode="decimal" onChange={(event) => setDraft((current) => ({ ...current, amount: event.target.value }))} placeholder="0.00" />
            </InlineField>
            <InlineField label="Expected on">
              <Input type="date" value={draft.expected_on} onChange={(event) => setDraft((current) => ({ ...current, expected_on: event.target.value }))} />
            </InlineField>
            <InlineField label="Account">
              <Select value={draft.account_id} onChange={(event) => setDraft((current) => ({ ...current, account_id: event.target.value }))}>
                <option value="">No linked account</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </Select>
            </InlineField>
            <InlineField label="Notes" helper="Optional">
              <Textarea rows={3} value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} />
            </InlineField>
            <div className="md:col-span-2">
              <Button
                disabled={pending || !draft.source_name.trim() || !draft.amount}
                onClick={async () => {
                  const created = await sync(() => api.createIncomeEntry(toCreatePayload(draft)), "Expected income saved.", "Could not save expected income.");
                  if (created) {
                    setDraft(emptyDraft);
                    setComposerOpen(false);
                  }
                }}
              >
                Save expected income
              </Button>
            </div>
          </div>
        ) : null}
      </Panel>

      {entries.length ? (
        <div className="space-y-4">
          {[
            { key: "expected", label: "Expected", description: "Upcoming money the plan is still waiting on.", items: expectedEntries },
            { key: "received", label: "Received", description: "Entries already confirmed into real income.", items: receivedEntries },
            { key: "missed", label: "Missed", description: "Expected income that did not land as planned.", items: missedEntries },
          ]
            .filter((section) => section.items.length)
            .map((section) => (
              <section key={section.key} className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.24em] text-muted">{section.label}</p>
                    <p className="mt-1 text-sm text-muted">{section.description}</p>
                  </div>
                  <Badge>{section.items.length}</Badge>
                </div>
                <div className="space-y-3">
                  {section.items.map((entry) => (
                    <IncomeEntryCard
                      key={entry.id}
                      entry={entry}
                      accounts={accounts}
                      onSaved={(entryId, nextDraft) =>
                        sync(() => api.updateIncomeEntry(entryId, toUpdatePayload(nextDraft)), "Income entry saved.", "Could not save income entry.")
                      }
                      onDeleted={async (entryId) => {
                        await sync(() => api.deleteIncomeEntry(entryId), "Income entry deleted.", "Could not delete income entry.");
                      }}
                      onConfirmed={async (entryId, accountId) => {
                        await sync(
                          () => api.confirmIncomeEntry(entryId, { account_id: accountId ?? null }),
                          "Income confirmed.",
                          "Could not confirm income.",
                        );
                      }}
                    />
                  ))}
                </div>
              </section>
            ))}
        </div>
      ) : (
        <Panel className="border-dashed bg-white/56 text-sm text-muted">No expected income yet. Add the next paycheck or expected deposit here.</Panel>
      )}
    </section>
  );
}
