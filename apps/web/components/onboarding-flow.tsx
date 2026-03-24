"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, CirclePlus } from "lucide-react";
import { onboardingKey, readStoredLifeOsSetup, saveStoredLifeOsSetup, type StoredLifeOsSetup } from "@/lib/local-state";
import type { RecurrenceFrequency } from "@/lib/types";
import { Badge, Button, InlineField, Input, Panel, Select, SectionHeading, Textarea } from "@/components/ui";

type Step = 0 | 1 | 2 | 3;

type AccountDraft = {
  id: string;
  name: string;
  institution: string;
  type: "checking" | "savings" | "credit_card" | "cash";
  balance: string;
};

type ObligationDraft = {
  id: string;
  name: string;
  amount: string;
  dueDate: string;
  recurrence: RecurrenceFrequency;
};

type IncomeDraft = {
  id: string;
  source: string;
  expectedAmount: string;
  dueDate: string;
  recurrence: RecurrenceFrequency;
};

type DebtDraft = {
  id: string;
  name: string;
  balance: string;
  minimum: string;
  dueDate: string;
};

function createDraftId() {
  return Math.random().toString(36).slice(2, 10);
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

const recurrenceOptions: Array<{ value: RecurrenceFrequency; label: string }> = [
  { value: "one-time", label: "One time" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Biweekly" },
  { value: "monthly", label: "Monthly" },
];

const defaultAccounts: AccountDraft[] = [
  { id: "seed-account-checking", name: "Wells Fargo Checking", institution: "Wells Fargo", type: "checking", balance: "1842.17" },
  { id: "seed-account-savings", name: "Cash App Savings", institution: "Cash App", type: "savings", balance: "1480.12" },
];

const defaultObligations: ObligationDraft[] = [
  { id: "seed-obligation-rent", name: "Rent", amount: "950", dueDate: "2026-03-26", recurrence: "monthly" },
  { id: "seed-obligation-electric", name: "Electric bill", amount: "73.22", dueDate: "2026-03-29", recurrence: "monthly" },
];

const defaultDebts: DebtDraft[] = [
  { id: "seed-debt-capital-one", name: "Capital One Credit Card", balance: "318.49", minimum: "52", dueDate: "2026-03-25" },
];

const defaultIncome: IncomeDraft[] = [
  { id: "seed-income-payroll", source: "Payroll deposit", expectedAmount: "2480", dueDate: "2026-03-27", recurrence: "biweekly" },
];

export function OnboardingFlow() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(0);
  const [storedTransactions, setStoredTransactions] = useState<StoredLifeOsSetup["transactions"]>([]);
  const [name, setName] = useState("Life owner");
  const [protectedBuffer, setProtectedBuffer] = useState("750");
  const [essentialTarget, setEssentialTarget] = useState("310");
  const [savingsFloor, setSavingsFloor] = useState("1500");
  const [accounts, setAccounts] = useState<AccountDraft[]>(defaultAccounts);
  const [obligations, setObligations] = useState<ObligationDraft[]>(defaultObligations);
  const [debts, setDebts] = useState<DebtDraft[]>(defaultDebts);
  const [income, setIncome] = useState<IncomeDraft[]>(defaultIncome);
  const [notes, setNotes] = useState("Keep the dashboard calm and high-signal.");

  const completedPercent = useMemo(() => Math.round(((step + 1) / 4) * 100), [step]);

  useEffect(() => {
    const storedSetup = readStoredLifeOsSetup();
    if (!storedSetup) return;

    setStoredTransactions(storedSetup.transactions ?? []);
    setName(storedSetup.displayName);
    setProtectedBuffer(storedSetup.protectedBuffer);
    setEssentialTarget(storedSetup.essentialTarget);
    setSavingsFloor(storedSetup.savingsFloor);
    setAccounts(storedSetup.accounts.length ? storedSetup.accounts : defaultAccounts);
    setObligations(storedSetup.obligations.length ? storedSetup.obligations : defaultObligations);
    setDebts(storedSetup.debts.length ? storedSetup.debts : defaultDebts);
    setIncome(storedSetup.income.length ? storedSetup.income : defaultIncome);
    setNotes(storedSetup.notes);
  }, []);

  function addAccount() {
    setAccounts((current) => [...current, { id: createDraftId(), name: "", institution: "", type: "checking", balance: "0.00" }]);
  }

  function addObligation() {
    setObligations((current) => [
      ...current,
      { id: createDraftId(), name: "", amount: "0.00", dueDate: todayString(), recurrence: "monthly" },
    ]);
  }

  function addIncome() {
    setIncome((current) => [
      ...current,
      { id: createDraftId(), source: "", expectedAmount: "0.00", dueDate: todayString(), recurrence: "one-time" },
    ]);
  }

  function addDebt() {
    setDebts((current) => [
      ...current,
      { id: createDraftId(), name: "", balance: "0.00", minimum: "0.00", dueDate: todayString() },
    ]);
  }

  function completeOnboarding() {
    saveStoredLifeOsSetup({
      displayName: name,
      protectedBuffer,
      essentialTarget,
      savingsFloor,
      notes,
      accounts,
      obligations,
      debts,
      income,
      transactions: storedTransactions,
    });
    window.localStorage.setItem(onboardingKey, "true");
    router.push("/dashboard");
  }

  return (
    <div className="space-y-6 pb-24 md:pb-6">
      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-muted">Setup</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Set the baseline once.</h1>
          </div>
          <Badge>{completedPercent}% complete</Badge>
        </div>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-black/5">
          <div className="h-full rounded-full bg-accent transition-all duration-300" style={{ width: `${completedPercent}%` }} />
        </div>
      </Panel>

      {step === 0 ? (
        <Panel className="space-y-5">
          <SectionHeading
            eyebrow="Preferences"
            title="Identity, buffer, and guardrails"
            description="Start with the numbers that shape the safe-spend calculation."
          />
          <div className="grid gap-4 md:grid-cols-2">
            <InlineField label="Display name" description="The name used in your private app shell and future reminders.">
              <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Mitchel" />
            </InlineField>
            <InlineField label="Protected cash buffer" description="Cash you do not want the app to treat as casually spendable.">
              <Input type="number" value={protectedBuffer} onChange={(event) => setProtectedBuffer(event.target.value)} placeholder="100" />
            </InlineField>
            <InlineField label="Essential weekly target" description="How much should remain available for food, transport, and core essentials.">
              <Input type="number" value={essentialTarget} onChange={(event) => setEssentialTarget(event.target.value)} placeholder="310" />
            </InlineField>
            <InlineField label="Savings floor" description="A reserve the dashboard should keep protected in the spend calculation.">
              <Input type="number" value={savingsFloor} onChange={(event) => setSavingsFloor(event.target.value)} placeholder="100" />
            </InlineField>
            <InlineField
              label="Notes"
              helper="Optional"
              description="Any context that should shape how the app feels or what it prioritizes."
            >
              <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} placeholder="Keep the dashboard calm and high-signal." />
            </InlineField>
          </div>
        </Panel>
      ) : null}

      {step === 1 ? (
        <Panel className="space-y-5">
          <SectionHeading eyebrow="Accounts" title="Enter the balances you already know" description="Manual accounts are enough for the MVP." />
          <p className="text-sm leading-6 text-muted">
            Use the account name you recognize, the institution it belongs to, the type that best matches how money moves,
            and the current balance or amount owed.
          </p>
          <div className="space-y-3">
            {accounts.map((account, index) => (
              <div key={account.id} className="grid gap-3 rounded-[24px] border border-line bg-white/70 p-4 md:grid-cols-[1.2fr_1fr_0.8fr_0.8fr]">
                <InlineField label="Account name" description="The label you want to recognize instantly.">
                  <Input
                    value={account.name}
                    onChange={(event) =>
                      setAccounts((current) => current.map((item, currentIndex) => (currentIndex === index ? { ...item, name: event.target.value } : item)))
                    }
                    placeholder="Wells Fargo Checking"
                  />
                </InlineField>
                <InlineField label="Institution" description="Bank, app, or place the account belongs to.">
                  <Input
                    value={account.institution}
                    onChange={(event) =>
                      setAccounts((current) => current.map((item, currentIndex) => (currentIndex === index ? { ...item, institution: event.target.value } : item)))
                    }
                    placeholder="Wells Fargo"
                  />
                </InlineField>
                <InlineField label="Account type" description="How this account should behave in the app.">
                  <Select
                    value={account.type}
                    onChange={(event) =>
                      setAccounts((current) =>
                        current.map((item, currentIndex) =>
                          currentIndex === index ? { ...item, type: event.target.value as AccountDraft["type"] } : item,
                        ),
                      )
                    }
                  >
                    <option value="checking">Checking</option>
                    <option value="savings">Savings</option>
                    <option value="credit_card">Credit card</option>
                    <option value="cash">Cash</option>
                  </Select>
                </InlineField>
                <InlineField label="Current balance" description="Use the current cash balance or amount owed.">
                  <Input
                    type="number"
                    value={account.balance}
                    onChange={(event) =>
                      setAccounts((current) => current.map((item, currentIndex) => (currentIndex === index ? { ...item, balance: event.target.value } : item)))
                    }
                    placeholder="1842.17"
                  />
                </InlineField>
              </div>
            ))}
          </div>
          <Button variant="ghost" onClick={addAccount}>
            <CirclePlus className="h-4 w-4" /> Add another account
          </Button>
        </Panel>
      ) : null}

      {step === 2 ? (
        <Panel className="space-y-5">
          <SectionHeading
            eyebrow="Responsibilities"
            title="Bills, debts, and expected income"
            description="Use your known dates so the dashboard can stay ahead of the next problem."
          />
          <div className="grid gap-5 lg:grid-cols-3">
            <div className="space-y-3">
              <p className="text-sm font-medium text-ink">Recurring bills</p>
              <p className="text-xs leading-5 text-muted">Name the bill, add the amount due, and use the next due date you expect.</p>
              {obligations.map((item, index) => (
                <div key={item.id} className="space-y-3 rounded-[24px] border border-line bg-white/70 p-4">
                  <InlineField label="Bill name" description="The obligation that should appear on the dashboard.">
                    <Input
                      value={item.name}
                      onChange={(event) =>
                        setObligations((current) => current.map((value, currentIndex) => (currentIndex === index ? { ...value, name: event.target.value } : value)))
                      }
                      placeholder="Rent"
                    />
                  </InlineField>
                  <InlineField label="Amount due" description="Amount that needs to be protected before the next income.">
                    <Input
                      type="number"
                      value={item.amount}
                      onChange={(event) =>
                        setObligations((current) => current.map((value, currentIndex) => (currentIndex === index ? { ...value, amount: event.target.value } : value)))
                      }
                      placeholder="950"
                    />
                  </InlineField>
                  <InlineField label="Due date" description="Use the next date this bill is expected.">
                    <Input
                      type="date"
                      value={item.dueDate}
                      onChange={(event) =>
                        setObligations((current) => current.map((value, currentIndex) => (currentIndex === index ? { ...value, dueDate: event.target.value } : value)))
                      }
                    />
                  </InlineField>
                  <InlineField label="Recurs" description="Choose how often this expense should come back.">
                    <Select
                      value={item.recurrence}
                      onChange={(event) =>
                        setObligations((current) =>
                          current.map((value, currentIndex) =>
                            currentIndex === index ? { ...value, recurrence: event.target.value as RecurrenceFrequency } : value,
                          ),
                        )
                      }
                    >
                      {recurrenceOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  </InlineField>
                </div>
              ))}
              <Button variant="ghost" onClick={addObligation}>
                <CirclePlus className="h-4 w-4" /> Add another bill
              </Button>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium text-ink">Debt minimums</p>
              <p className="text-xs leading-5 text-muted">Track the balance still owed, the minimum payment, and the next due date.</p>
              {debts.map((item, index) => (
                <div key={item.id} className="space-y-3 rounded-[24px] border border-line bg-white/70 p-4">
                  <InlineField label="Debt name" description="Card or loan name that should stay visible.">
                    <Input
                      value={item.name}
                      onChange={(event) =>
                        setDebts((current) => current.map((value, currentIndex) => (currentIndex === index ? { ...value, name: event.target.value } : value)))
                      }
                      placeholder="Capital One Credit Card"
                    />
                  </InlineField>
                  <div className="grid grid-cols-2 gap-3">
                    <InlineField label="Balance owed" description="Total amount still owed right now.">
                      <Input
                        type="number"
                        value={item.balance}
                        onChange={(event) =>
                          setDebts((current) => current.map((value, currentIndex) => (currentIndex === index ? { ...value, balance: event.target.value } : value)))
                        }
                        placeholder="318.49"
                      />
                    </InlineField>
                    <InlineField label="Minimum payment" description="Amount due before the next income arrives.">
                      <Input
                        type="number"
                        value={item.minimum}
                        onChange={(event) =>
                          setDebts((current) => current.map((value, currentIndex) => (currentIndex === index ? { ...value, minimum: event.target.value } : value)))
                        }
                        placeholder="52"
                      />
                    </InlineField>
                  </div>
                  <InlineField label="Due date" description="Next date the minimum payment is due.">
                    <Input
                      type="date"
                      value={item.dueDate}
                      onChange={(event) =>
                        setDebts((current) => current.map((value, currentIndex) => (currentIndex === index ? { ...value, dueDate: event.target.value } : value)))
                      }
                    />
                  </InlineField>
                </div>
              ))}
              <Button variant="ghost" onClick={addDebt}>
                <CirclePlus className="h-4 w-4" /> Add another debt
              </Button>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium text-ink">Expected income</p>
              <p className="text-xs leading-5 text-muted">Enter the source you expect, how much should arrive, and the expected deposit date.</p>
              {income.map((item, index) => (
                <div key={item.id} className="space-y-3 rounded-[24px] border border-line bg-white/70 p-4">
                  <InlineField label="Income source" description="Employer, client, or source you expect money from.">
                    <Input
                      value={item.source}
                      onChange={(event) =>
                        setIncome((current) => current.map((value, currentIndex) => (currentIndex === index ? { ...value, source: event.target.value } : value)))
                      }
                      placeholder="Payroll deposit"
                    />
                  </InlineField>
                  <InlineField label="Expected amount" description="The amount you expect to receive.">
                    <Input
                      type="number"
                      value={item.expectedAmount}
                      onChange={(event) =>
                        setIncome((current) => current.map((value, currentIndex) => (currentIndex === index ? { ...value, expectedAmount: event.target.value } : value)))
                      }
                      placeholder="2480"
                    />
                  </InlineField>
                  <InlineField label="Deposit date" description="The day you expect this money to arrive.">
                    <Input
                      type="date"
                      value={item.dueDate}
                      onChange={(event) =>
                        setIncome((current) => current.map((value, currentIndex) => (currentIndex === index ? { ...value, dueDate: event.target.value } : value)))
                      }
                    />
                  </InlineField>
                  <InlineField label="Recurs" description="Use a cadence for paychecks or repeat deposits.">
                    <Select
                      value={item.recurrence}
                      onChange={(event) =>
                        setIncome((current) =>
                          current.map((value, currentIndex) =>
                            currentIndex === index ? { ...value, recurrence: event.target.value as RecurrenceFrequency } : value,
                          ),
                        )
                      }
                    >
                      {recurrenceOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  </InlineField>
                </div>
              ))}
              <Button variant="ghost" onClick={addIncome}>
                <CirclePlus className="h-4 w-4" /> Add another income source
              </Button>
            </div>
          </div>
        </Panel>
      ) : null}

      {step === 3 ? (
        <Panel className="space-y-5">
          <SectionHeading eyebrow="Review" title="Check the baseline before saving settings" description="This is the snapshot the dashboard will use." />
          <div className="grid gap-4 md:grid-cols-3">
            <SummaryCard label="Accounts" value={`${accounts.length}`} detail="Manual account rows" />
            <SummaryCard label="Bills" value={`${obligations.length}`} detail="Recurring obligations" />
            <SummaryCard label="Income" value={`${income.length}`} detail="Expected sources" />
          </div>
          <div className="rounded-[24px] border border-line bg-accent-soft p-4">
            <p className="text-[11px] uppercase tracking-[0.24em] text-accent">Why this matters</p>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-ink">
              The app uses this setup to calculate safe spend, surface what is next, and keep the week calm instead of reactive.
            </p>
          </div>
        </Panel>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" onClick={() => setStep((current) => Math.max(0, current - 1) as Step)} disabled={step === 0}>
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>
        <div className="flex items-center gap-3">
          {step < 3 ? (
            <Button onClick={() => setStep((current) => Math.min(3, current + 1) as Step)}>
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          ) : null}
          {step === 3 ? (
            <Button onClick={completeOnboarding}>
              <Check className="h-4 w-4" /> Save setup
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-[24px] border border-line bg-white/70 p-4">
      <p className="text-[11px] uppercase tracking-[0.24em] text-muted">{label}</p>
      <div className="mt-2 text-3xl font-semibold tracking-tight tabular-nums text-ink">{value}</div>
      <p className="mt-1 text-xs text-muted">{detail}</p>
    </div>
  );
}
