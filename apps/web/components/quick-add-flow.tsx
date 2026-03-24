"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Check, Delete, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { formatMoney } from "@/lib/finance";
import { sampleCategories } from "@/lib/sample-data";
import { applyQuickAddToSetup, readStoredLifeOsSetup, saveStoredLifeOsSetup, useLifeOsDashboard } from "@/lib/local-state";
import type { QuickAddDraft, RecurrenceFrequency, TransactionKind } from "@/lib/types";
import { Badge, Button, InlineField, Input, Panel, SectionHeading, Select, Segment, Textarea } from "@/components/ui";

const recurrenceOptions: Array<{ value: RecurrenceFrequency; label: string }> = [
  { value: "one-time", label: "One time" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Biweekly" },
  { value: "monthly", label: "Monthly" },
];

function recurrenceLabel(value: RecurrenceFrequency) {
  return recurrenceOptions.find((option) => option.value === value)?.label ?? value;
}

export function QuickAddFlow() {
  const dashboard = useLifeOsDashboard();
  const accountOptions = dashboard.accounts.map((account) => account.name);
  const [kind, setKind] = useState<TransactionKind>("expense");
  const [amount, setAmount] = useState("0.00");
  const [title, setTitle] = useState("");
  const [merchantOrSource, setMerchantOrSource] = useState("");
  const [category, setCategory] = useState("Food");
  const [account, setAccount] = useState(accountOptions[0] ?? "Wells Fargo Checking");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"expected" | "received">("received");
  const [recurrence, setRecurrence] = useState<RecurrenceFrequency>("one-time");
  const [saveAsObligation, setSaveAsObligation] = useState(false);
  const [obligationDueDate, setObligationDueDate] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const suggestions = useMemo(() => {
    const list = kind === "expense" ? dashboard.merchants : dashboard.sources;
    return list.map((item) => item.name);
  }, [dashboard.merchants, dashboard.sources, kind]);

  useEffect(() => {
    if (!date) {
      const today = new Date().toISOString().slice(0, 10);
      setDate(today);
      setObligationDueDate(today);
    }
  }, [date]);

  useEffect(() => {
    if (!obligationDueDate && date) {
      setObligationDueDate(date);
    }
  }, [date, obligationDueDate]);

  useEffect(() => {
    if (!account && accountOptions[0]) {
      setAccount(accountOptions[0]);
    }
  }, [account, accountOptions]);

  const draft: QuickAddDraft = {
    kind,
    amount,
    title,
    merchantOrSource,
    category,
    account,
    date,
    notes,
    status,
    recurrence,
    saveAsObligation: kind === "expense" ? saveAsObligation || recurrence !== "one-time" : false,
    obligationDueDate: kind === "expense" ? obligationDueDate || date : undefined,
  };

  function appendDigit(value: string) {
    setAmount((current) => {
      const [whole, fraction = ""] = current.split(".");
      if (current === "0.00" || current === "0") {
        if (value === ".") return "0.";
        return value === "0" ? "0" : value;
      }
      if (value === ".") {
        if (current.includes(".")) return current;
        return `${whole}.`;
      }
      if (current === "0.00") return value;
      if (!current.includes(".")) return `${current}${value}`;
      if (fraction.length >= 2) return current;
      return `${whole}.${fraction}${value}`.replace(/\.$/, ".00");
    });
  }

  function backspace() {
    setAmount((current) => {
      if (current.length <= 1) return "0.00";
      const next = current.slice(0, -1);
      if (!next || next === "0" || next === "0.") return "0.00";
      if (next.endsWith(".")) return `${next}00`;
      return next;
    });
  }

  function clearAmount() {
    setAmount("0.00");
  }

  function applySuggestion(value: string) {
    setMerchantOrSource(value);
    if (!title) setTitle(value);
  }

  function handleSubmit() {
    startTransition(() => {
      void api.submitQuickAdd(draft).then(() => {
        const storedSetup = readStoredLifeOsSetup();
        let setupUpdated = false;
        if (storedSetup) {
          saveStoredLifeOsSetup(applyQuickAddToSetup(storedSetup, draft));
          setupUpdated = true;
        }

        setSubmitted(
          !setupUpdated
            ? "Finish setup in Settings to save locally"
            : recurrence === "one-time"
              ? kind === "income"
                ? draft.status === "expected"
                  ? "Expected income scheduled"
                  : "Income logged"
                : draft.saveAsObligation
                  ? "Expense logged and upcoming obligation added"
                  : "Expense logged"
              : kind === "income"
                ? draft.status === "expected"
                  ? `Expected income and recurring plan added (${recurrenceLabel(recurrence)})`
                  : `Income logged and recurring plan added (${recurrenceLabel(recurrence)})`
                : `Expense logged and recurring plan added (${recurrenceLabel(recurrence)})`,
        );
      });
    });
  }

  return (
    <div className="grid gap-6 pb-24 lg:grid-cols-[1.05fr_0.95fr] lg:pb-6">
      <Panel className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <SectionHeading
              eyebrow="Quick entry"
              title="Amount first, details second"
              description="Start with the number. Then finish the record with the few details that matter."
            />
          </div>
          <Badge>{kind}</Badge>
        </div>

        <Segment options={["expense", "income"]} value={kind} onChange={(value) => setKind(value as TransactionKind)} />

        <div className="rounded-[32px] border border-line bg-[linear-gradient(180deg,rgba(255,255,255,0.85),rgba(255,255,255,0.62))] p-5">
          <p className="text-[11px] uppercase tracking-[0.28em] text-muted">Amount</p>
          <div className="mt-4 text-5xl font-semibold tracking-tight tabular-nums">{formatMoney(Number(amount || 0))}</div>
          <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-4">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "Clear"].map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  if (key === "Clear") {
                    clearAmount();
                  } else {
                    appendDigit(key);
                  }
                }}
                className="h-16 rounded-3xl border border-line bg-white/80 text-lg font-medium text-ink transition hover:-translate-y-0.5 hover:bg-white"
              >
                {key}
              </button>
            ))}
          </div>
          <div className="mt-3 flex gap-3">
            <button
              type="button"
              onClick={backspace}
              className="flex-1 rounded-3xl border border-line bg-white/80 px-4 py-4 text-sm font-medium text-ink transition hover:-translate-y-0.5 hover:bg-white"
            >
              <Delete className="mx-auto h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="flex-[2] rounded-3xl bg-ink px-4 py-4 text-bg transition hover:-translate-y-0.5 disabled:opacity-60"
              disabled={isPending}
            >
              <span className="inline-flex items-center gap-2">
                <Check className="h-4 w-4" />
                Save entry
              </span>
            </button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => applySuggestion(suggestion)}
              className="rounded-[22px] border border-line bg-white/70 px-4 py-3 text-left text-sm font-medium text-ink transition hover:bg-white"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </Panel>

      <Panel className="space-y-5">
        <SectionHeading
          eyebrow="Details"
          title="Finish the record"
          description="Choose the minimum detail set required for a clean ledger entry."
        />

        <div className="grid gap-4">
          <InlineField label={kind === "expense" ? "Expense name" : "Income name"} helper="Required">
            <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={kind === "expense" ? "Groceries" : "Payroll deposit"} />
          </InlineField>

          <InlineField label={kind === "expense" ? "Merchant" : "Source"} helper="Reusable">
            <Input
              value={merchantOrSource}
              onChange={(event) => setMerchantOrSource(event.target.value)}
              list="quick-add-suggestions"
              placeholder={kind === "expense" ? "Walmart" : "Employer"}
            />
            <datalist id="quick-add-suggestions">
              {suggestions.map((suggestion) => (
                <option key={suggestion} value={suggestion} />
              ))}
            </datalist>
          </InlineField>

          <div className="grid gap-4 sm:grid-cols-2">
            <InlineField label="Category">
              <Select value={category} onChange={(event) => setCategory(event.target.value)}>
                {sampleCategories.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </InlineField>

            <InlineField label="Account">
              <Select value={account} onChange={(event) => setAccount(event.target.value)}>
                {accountOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </InlineField>
          </div>

          {kind === "income" ? (
            <InlineField label="Income status">
              <Segment options={["expected", "received"]} value={status} onChange={(value) => setStatus(value as "expected" | "received")} />
            </InlineField>
          ) : null}

          {kind === "expense" ? (
            <InlineField
              label="Save as upcoming obligation"
              description="Turn this into a tracked bill or one-time required payment that should stay visible on the dashboard."
            >
              <Segment options={["no", "yes"]} value={saveAsObligation || recurrence !== "one-time" ? "yes" : "no"} onChange={(value) => setSaveAsObligation(value === "yes")} />
            </InlineField>
          ) : null}

          <InlineField
            label={kind === "expense" ? "Expense cadence" : "Income cadence"}
            description={
              kind === "expense"
                ? "Leave this as one time for normal logging, or choose a cadence to also save it as a recurring expense."
                : "Choose a cadence if this deposit should stay on your recurring income plan."
            }
          >
            <Select value={recurrence} onChange={(event) => setRecurrence(event.target.value as RecurrenceFrequency)}>
              {recurrenceOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </InlineField>

          <InlineField label="Date">
            <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </InlineField>

          {kind === "expense" && (saveAsObligation || recurrence !== "one-time") ? (
            <InlineField
              label="Upcoming obligation due date"
              description="Use the date this bill or required payment should show up in your upcoming obligations."
            >
              <Input type="date" value={obligationDueDate} onChange={(event) => setObligationDueDate(event.target.value)} />
            </InlineField>
          ) : null}

          <InlineField label="Notes" helper="Optional">
            <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} placeholder="Anything useful about this entry" />
          </InlineField>
        </div>

        <div className="rounded-[24px] border border-line bg-accent-soft p-4">
          <p className="text-[11px] uppercase tracking-[0.24em] text-accent">Preview</p>
          <div className="mt-3 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-ink">{title || "Untitled entry"}</p>
              <p className="mt-1 text-xs text-muted">
                {merchantOrSource || "Merchant/source"} • {category} • {account}
              </p>
              {recurrence !== "one-time" ? <p className="mt-1 text-xs font-medium text-accent">Repeats {recurrenceLabel(recurrence)}</p> : null}
              {kind === "expense" && (saveAsObligation || recurrence !== "one-time") ? (
                <p className="mt-1 text-xs font-medium text-accent">Upcoming obligation due {obligationDueDate || date}</p>
              ) : null}
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold tracking-tight tabular-nums text-ink">
                {kind === "income" ? "+" : "−"}
                {formatMoney(Number(amount || 0))}
              </p>
              <p className="text-xs text-muted">{date}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted">
            {submitted ? (
              <span className="inline-flex items-center gap-2 text-success">
                <Sparkles className="h-4 w-4" />
                {submitted}
              </span>
            ) : (
              "Saved locally until the backend is connected."
            )}
          </p>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Saving..." : "Save entry"}
          </Button>
        </div>
      </Panel>
    </div>
  );
}
