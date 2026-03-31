"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api, type BackendSetupPayload } from "@/lib/api";
import { Check, ChevronLeft, ChevronRight, CirclePlus } from "lucide-react";
import { todayDateInputValue } from "@/lib/dates";
import {
  onboardingKey,
  readStoredLifeOsSetup,
  saveStoredLifeOsSetup,
  storedSetupFromApiSetup,
  storedSetupToBackendSetupPayload,
  type StoredLifeOsSetup,
} from "@/lib/local-state";
import { createOnboardingSetupPreset, onboardingPresetOptions, type OnboardingPresetId } from "@/lib/onboarding-presets";
import type { RecurrenceFrequency, RoadmapItem, StrategyDocument, Task } from "@/lib/types";
import { Badge, Button, InlineField, Input, Panel, Select, SectionHeading, Textarea } from "@/components/ui";

type Step = 0 | 1 | 2 | 3 | 4;
type StartingPoint = OnboardingPresetId | "current" | null;

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
  return todayDateInputValue();
}

const recurrenceOptions: Array<{ value: RecurrenceFrequency; label: string }> = [
  { value: "one-time", label: "One time" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Biweekly" },
  { value: "monthly", label: "Monthly" },
];

const defaultAccounts: AccountDraft[] = [
  ...createOnboardingSetupPreset("blank").accounts,
];

const defaultObligations: ObligationDraft[] = [
  ...createOnboardingSetupPreset("blank").obligations,
];

const defaultDebts: DebtDraft[] = [
  ...createOnboardingSetupPreset("blank").debts,
];

const defaultIncome: IncomeDraft[] = [
  ...createOnboardingSetupPreset("blank").income,
];

function hasBootstrapData(payload: BackendSetupPayload) {
  return (
    payload.accounts.length > 0 ||
    payload.obligations.length > 0 ||
    payload.debts.length > 0 ||
    payload.income.length > 0 ||
    payload.roadmap_items.length > 0 ||
    Boolean(payload.strategy_document) ||
    payload.notes.trim().length > 0 ||
    payload.protected_buffer !== "0" ||
    payload.essential_target !== "0" ||
    payload.savings_floor !== "0"
  );
}

function hasStoredSetupData(setup: StoredLifeOsSetup) {
  return (
    setup.accounts.length > 0 ||
    setup.obligations.length > 0 ||
    setup.debts.length > 0 ||
    setup.income.length > 0 ||
    setup.roadmapItems.length > 0 ||
    Boolean(setup.strategyDocument) ||
    setup.notes.trim().length > 0 ||
    setup.protectedBuffer !== "0" ||
    setup.essentialTarget !== "0" ||
    setup.savingsFloor !== "0"
  );
}

export function OnboardingFlow() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(0);
  const [startingPoint, setStartingPoint] = useState<StartingPoint>(null);
  const [currentSetupSnapshot, setCurrentSetupSnapshot] = useState<StoredLifeOsSetup | null>(null);
  const [storedTransactions, setStoredTransactions] = useState<StoredLifeOsSetup["transactions"]>([]);
  const [manualTasks, setManualTasks] = useState<Task[]>([]);
  const [taskOverrides, setTaskOverrides] = useState<StoredLifeOsSetup["taskOverrides"]>([]);
  const [roadmapItems, setRoadmapItems] = useState<RoadmapItem[]>([]);
  const [strategyDocument, setStrategyDocument] = useState<StrategyDocument | null>(null);
  const [name, setName] = useState("Life owner");
  const [protectedBuffer, setProtectedBuffer] = useState("0");
  const [essentialTarget, setEssentialTarget] = useState("0");
  const [savingsFloor, setSavingsFloor] = useState("0");
  const [accounts, setAccounts] = useState<AccountDraft[]>(defaultAccounts);
  const [obligations, setObligations] = useState<ObligationDraft[]>(defaultObligations);
  const [debts, setDebts] = useState<DebtDraft[]>(defaultDebts);
  const [income, setIncome] = useState<IncomeDraft[]>(defaultIncome);
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const totalSteps = 5;

  const completedPercent = useMemo(() => Math.round(((step + 1) / totalSteps) * 100), [step, totalSteps]);

  function applySetup(nextSetup: StoredLifeOsSetup, nextStartingPoint?: StartingPoint) {
    setStoredTransactions(nextSetup.transactions ?? []);
    setManualTasks(nextSetup.manualTasks ?? []);
    setTaskOverrides(nextSetup.taskOverrides ?? []);
    setRoadmapItems(nextSetup.roadmapItems ?? []);
    setStrategyDocument(nextSetup.strategyDocument ?? null);
    setName(nextSetup.displayName);
    setProtectedBuffer(nextSetup.protectedBuffer);
    setEssentialTarget(nextSetup.essentialTarget);
    setSavingsFloor(nextSetup.savingsFloor);
    setAccounts(nextSetup.accounts.length ? nextSetup.accounts : defaultAccounts);
    setObligations(nextSetup.obligations.length ? nextSetup.obligations : defaultObligations);
    setDebts(nextSetup.debts.length ? nextSetup.debts : defaultDebts);
    setIncome(nextSetup.income.length ? nextSetup.income : defaultIncome);
    setNotes(nextSetup.notes);
    if (nextStartingPoint !== undefined) {
      setStartingPoint(nextStartingPoint);
    }
  }

  function applyPreset(presetId: OnboardingPresetId) {
    applySetup(createOnboardingSetupPreset(presetId, new Date()), presetId);
  }

  useEffect(() => {
    const storedSetup = readStoredLifeOsSetup();
    if (storedSetup && hasStoredSetupData(storedSetup)) {
      setCurrentSetupSnapshot(storedSetup);
      applySetup(storedSetup, "current");
    }

    void api.getSetup().then((payload) => {
      if (!hasBootstrapData(payload)) return;
      const mapped = storedSetupFromApiSetup(payload, readStoredLifeOsSetup());
      setCurrentSetupSnapshot(mapped);
      applySetup(
        {
          ...mapped,
          obligations: mapped.obligations.map((item) => ({
            id: item.id,
            name: item.name,
            amount: item.amount,
            dueDate: item.dueDate,
            recurrence: item.recurrence,
            linkedAccount: item.linkedAccount,
          })),
          debts: mapped.debts.map((item) => ({
            id: item.id,
            name: item.name,
            balance: item.balance,
            minimum: item.minimum,
            dueDate: item.dueDate,
          })),
          income: mapped.income.map((item) => ({
            id: item.id,
            source: item.source,
            expectedAmount: item.expectedAmount,
            dueDate: item.dueDate,
            recurrence: item.recurrence,
            linkedAccount: item.linkedAccount,
          })),
        },
        "current",
      );
    });
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
    const nextSetup: StoredLifeOsSetup = {
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
      manualTasks,
      taskOverrides,
      roadmapItems,
      strategyDocument,
    };

    setIsSaving(true);
    setSaveError(null);
    void api
      .saveSetup(storedSetupToBackendSetupPayload(nextSetup))
      .then(() => api.completeOnboarding())
      .then(() => {
        setCurrentSetupSnapshot(nextSetup);
        saveStoredLifeOsSetup(nextSetup);
        window.localStorage.setItem(onboardingKey, "true");
        router.push("/dashboard");
      })
      .catch(() => {
        saveStoredLifeOsSetup(nextSetup);
        window.localStorage.removeItem(onboardingKey);
        setSaveError("Setup was saved locally, but the API could not confirm onboarding. Fix the connection and try again.");
      })
      .finally(() => {
        setIsSaving(false);
      });
  }

  return (
    <div className="space-y-4 pb-[calc(8rem+env(safe-area-inset-bottom))] md:space-y-6 md:pb-6">
      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-muted">Setup</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Set the baseline once.</h1>
          </div>
          <Badge>{completedPercent}% complete</Badge>
        </div>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-black/5">
          <div className="h-full rounded-full bg-accent transition-all duration-300" style={{ width: `${completedPercent}%` }} />
        </div>
        {saveError ? (
          <div className="mt-4 rounded-[20px] border border-[rgba(165,57,42,0.16)] bg-[rgba(165,57,42,0.08)] px-4 py-3 text-sm text-[#7a2f22]">
            {saveError}
          </div>
        ) : null}
      </Panel>

      {step === 0 ? (
        <Panel className="space-y-5">
          <SectionHeading
            eyebrow="Demo setup"
            title="Do you want sample data?"
            description="Pick a starting point first. Sample student data loads a realistic college budget, uneven income, and a roadmap plan."
          />
          {currentSetupSnapshot ? (
            <div className="rounded-[22px] border border-line bg-[rgba(244,241,233,0.82)] p-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-muted">Saved setup found</p>
              <p className="mt-2 text-sm leading-6 text-ink">
                You already have baseline data here. You can keep it, start blank, or swap in sample student data.
              </p>
            </div>
          ) : null}
          <div className="grid gap-3 lg:grid-cols-[0.85fr_1.15fr]">
            {onboardingPresetOptions.map((option) => {
              const active = startingPoint === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => applyPreset(option.id)}
                  className={[
                    "rounded-[26px] border p-5 text-left transition duration-200",
                    active
                      ? "border-accent bg-[rgba(51,95,83,0.12)] shadow-soft"
                      : "border-line bg-white/72 hover:-translate-y-0.5 hover:bg-white/82",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.24em] text-muted">{option.label}</p>
                      <p className="mt-3 text-xl font-semibold tracking-tight text-ink">{option.description}</p>
                    </div>
                    {option.recommended ? <Badge>Recommended</Badge> : null}
                  </div>
                  <div className="mt-5 space-y-2">
                    {option.bullets.map((bullet) => (
                      <p key={bullet} className="text-sm leading-6 text-muted">
                        {bullet}
                      </p>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
          {currentSetupSnapshot ? (
            <div className="flex flex-wrap items-center gap-3">
              <Button variant={startingPoint === "current" ? "secondary" : "ghost"} onClick={() => applySetup(currentSetupSnapshot, "current")}>
                Keep current setup
              </Button>
              <p className="text-sm text-muted">Useful if you already entered real data and only need to review it.</p>
            </div>
          ) : null}
          {startingPoint === "student-demo" ? (
            <div className="rounded-[24px] border border-line bg-[linear-gradient(180deg,rgba(51,95,83,0.12),rgba(255,255,255,0.82))] p-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-accent">Sample setup loaded</p>
              <p className="mt-2 text-sm leading-6 text-ink">
                The sample includes part-time job income, parent support, a refund check, a live roadmap focus, and a next-income plan built for student cash flow.
              </p>
            </div>
          ) : null}
        </Panel>
      ) : null}

      {step === 1 ? (
        <Panel className="space-y-5">
          <SectionHeading
            eyebrow="Preferences"
            title="Identity, buffer, and guardrails"
            description="Start with the basic numbers the app will use."
          />
          <div className="grid gap-4 md:grid-cols-2">
            <InlineField label="Display name" description="The name you want to see in the app.">
              <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Mitchel" />
            </InlineField>
            <InlineField label="Protected cash buffer" description="Money you do not want to spend.">
              <Input type="number" value={protectedBuffer} onChange={(event) => setProtectedBuffer(event.target.value)} placeholder="100" />
            </InlineField>
            <InlineField label="Essential weekly target" description="How much money you want left for food, gas, and basics each week.">
              <Input type="number" value={essentialTarget} onChange={(event) => setEssentialTarget(event.target.value)} placeholder="310" />
            </InlineField>
            <InlineField label="Savings floor" description="Savings you want the app to leave alone.">
              <Input type="number" value={savingsFloor} onChange={(event) => setSavingsFloor(event.target.value)} placeholder="100" />
            </InlineField>
            <InlineField
              label="Notes"
              helper="Optional"
              description="Anything you want the app to keep in mind."
            >
              <Textarea className="min-h-[8rem]" value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} placeholder="Keep things simple and easy to follow." />
            </InlineField>
          </div>
        </Panel>
      ) : null}

      {step === 2 ? (
        <Panel className="space-y-5">
          <SectionHeading eyebrow="Accounts" title="Add the balances you already know" description="Just type them in by hand for now." />
          <p className="text-sm leading-6 text-muted">
            Add the account name, where it is, the type, and the balance you see right now.
          </p>
          <div className="space-y-3">
            {accounts.map((account, index) => (
              <div key={account.id} className="grid gap-3 rounded-[20px] border border-line bg-white/70 p-4 md:grid-cols-[1.2fr_1fr_0.8fr_0.8fr] md:rounded-[24px]">
                <InlineField label="Account name" description="The name you know it by.">
                  <Input
                    value={account.name}
                    onChange={(event) =>
                      setAccounts((current) => current.map((item, currentIndex) => (currentIndex === index ? { ...item, name: event.target.value } : item)))
                    }
                    placeholder="Wells Fargo Checking"
                  />
                </InlineField>
                <InlineField label="Institution" description="The bank or app it belongs to.">
                  <Input
                    value={account.institution}
                    onChange={(event) =>
                      setAccounts((current) => current.map((item, currentIndex) => (currentIndex === index ? { ...item, institution: event.target.value } : item)))
                    }
                    placeholder="Wells Fargo"
                  />
                </InlineField>
                <InlineField label="Account type" description="Pick the kind of account this is.">
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
                <InlineField label="Current balance" description="Enter the amount in it right now, or the amount owed.">
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

      {step === 3 ? (
        <Panel className="space-y-5">
          <SectionHeading
            eyebrow="Responsibilities"
            title="Bills, debts, and expected income"
            description="Add your bills, debts, and income dates so nothing sneaks up on you."
          />
          <div className="grid gap-5 lg:grid-cols-3">
            <div className="space-y-3">
              <p className="text-sm font-medium text-ink">Recurring bills</p>
              <p className="text-xs leading-5 text-muted">Add the bill name, amount, and next due date.</p>
              {obligations.map((item, index) => (
                <div key={item.id} className="space-y-3 rounded-[20px] border border-line bg-white/70 p-4 md:rounded-[24px]">
                  <InlineField label="Bill name" description="What this bill is called.">
                    <Input
                      value={item.name}
                      onChange={(event) =>
                        setObligations((current) => current.map((value, currentIndex) => (currentIndex === index ? { ...value, name: event.target.value } : value)))
                      }
                      placeholder="Rent"
                    />
                  </InlineField>
                  <InlineField label="Amount due" description="How much you need to pay.">
                    <Input
                      type="number"
                      value={item.amount}
                      onChange={(event) =>
                        setObligations((current) => current.map((value, currentIndex) => (currentIndex === index ? { ...value, amount: event.target.value } : value)))
                      }
                      placeholder="950"
                    />
                  </InlineField>
                  <InlineField label="Due date" description="The next day this bill is due.">
                    <Input
                      type="date"
                      value={item.dueDate}
                      onChange={(event) =>
                        setObligations((current) => current.map((value, currentIndex) => (currentIndex === index ? { ...value, dueDate: event.target.value } : value)))
                      }
                    />
                  </InlineField>
                  <InlineField label="Recurs" description="How often this bill comes back.">
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
              <p className="text-xs leading-5 text-muted">Add what you still owe, the minimum payment, and the next due date.</p>
              {debts.map((item, index) => (
                <div key={item.id} className="space-y-3 rounded-[20px] border border-line bg-white/70 p-4 md:rounded-[24px]">
                  <InlineField label="Debt name" description="The name of the card or loan.">
                    <Input
                      value={item.name}
                      onChange={(event) =>
                        setDebts((current) => current.map((value, currentIndex) => (currentIndex === index ? { ...value, name: event.target.value } : value)))
                      }
                      placeholder="Capital One Credit Card"
                    />
                  </InlineField>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <InlineField label="Balance owed" description="How much you still owe right now.">
                      <Input
                        type="number"
                        value={item.balance}
                        onChange={(event) =>
                          setDebts((current) => current.map((value, currentIndex) => (currentIndex === index ? { ...value, balance: event.target.value } : value)))
                        }
                        placeholder="318.49"
                      />
                    </InlineField>
                    <InlineField label="Minimum payment" description="The smallest payment you need to make.">
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
                  <InlineField label="Due date" description="The next day this payment is due.">
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
              <p className="text-xs leading-5 text-muted">Add where the money is coming from, how much, and when you expect it.</p>
              {income.map((item, index) => (
                <div key={item.id} className="space-y-3 rounded-[20px] border border-line bg-white/70 p-4 md:rounded-[24px]">
                  <InlineField label="Income source" description="Where this money is coming from.">
                    <Input
                      value={item.source}
                      onChange={(event) =>
                        setIncome((current) => current.map((value, currentIndex) => (currentIndex === index ? { ...value, source: event.target.value } : value)))
                      }
                      placeholder="Payroll deposit"
                    />
                  </InlineField>
                  <InlineField label="Expected amount" description="How much money you expect.">
                    <Input
                      type="number"
                      value={item.expectedAmount}
                      onChange={(event) =>
                        setIncome((current) => current.map((value, currentIndex) => (currentIndex === index ? { ...value, expectedAmount: event.target.value } : value)))
                      }
                      placeholder="2480"
                    />
                  </InlineField>
                  <InlineField label="Deposit date" description="The day you think it will arrive.">
                    <Input
                      type="date"
                      value={item.dueDate}
                      onChange={(event) =>
                        setIncome((current) => current.map((value, currentIndex) => (currentIndex === index ? { ...value, dueDate: event.target.value } : value)))
                      }
                    />
                  </InlineField>
                  <InlineField label="Recurs" description="How often this money comes in.">
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

      {step === 4 ? (
        <Panel className="space-y-5">
          <SectionHeading eyebrow="Review" title="Check everything before you save" description="This is what the dashboard will use." />
          <div className="grid gap-4 md:grid-cols-3">
            <SummaryCard label="Accounts" value={`${accounts.length}`} detail="Manual account rows" />
            <SummaryCard label="Bills" value={`${obligations.length}`} detail="Recurring obligations" />
            <SummaryCard label="Income" value={`${income.length}`} detail="Expected sources" />
          </div>
          {strategyDocument ? (
            <div className="grid gap-3 md:grid-cols-2">
              <SummaryCard label="Roadmap focus" value={`${roadmapItems.length}`} detail="Strategy-backed roadmap items" />
              <SummaryCard
                label="Next income plan"
                value={strategyDocument.nextIncomePlans?.[0]?.label ?? "Ready"}
                detail={strategyDocument.summary}
              />
            </div>
          ) : null}
          <div className="rounded-[24px] border border-line bg-accent-soft p-4">
            <p className="text-[11px] uppercase tracking-[0.24em] text-accent">Why this matters</p>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-ink">
              The app uses this to show what is due next, what you can spend, and what needs your attention.
            </p>
          </div>
        </Panel>
      ) : null}

      <div className="rounded-[22px] border border-line bg-surface/96 p-3 shadow-[0_16px_40px_rgba(16,32,24,0.08)] backdrop-blur-xl md:static md:rounded-none md:border-0 md:bg-transparent md:p-0 md:shadow-none">
        <div className="mb-3 flex items-center justify-between px-1 md:hidden">
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted">Step {step + 1} of {totalSteps}</p>
          <p className="text-sm font-medium text-ink">{completedPercent}% done</p>
        </div>
        <div className="flex items-center gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button
            className="h-11 shrink-0 px-4 sm:w-auto"
            variant="ghost"
            onClick={() => setStep((current) => Math.max(0, current - 1) as Step)}
            disabled={step === 0 || isSaving}
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:flex-none sm:items-center">
            {step < totalSteps - 1 ? (
              <Button
                className="h-11 w-full sm:w-auto"
                onClick={() => setStep((current) => Math.min(totalSteps - 1, current + 1) as Step)}
                disabled={isSaving || (step === 0 && startingPoint === null)}
              >
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            ) : null}
            {step === totalSteps - 1 ? (
              <Button className="h-11 w-full sm:w-auto" onClick={completeOnboarding} disabled={isSaving}>
                <Check className="h-4 w-4" /> {isSaving ? "Saving..." : "Save setup"}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-[20px] border border-line bg-white/70 p-4 md:rounded-[24px]">
      <p className="text-[11px] uppercase tracking-[0.24em] text-muted">{label}</p>
      <div className="mt-2 text-2xl font-semibold tracking-tight tabular-nums text-ink md:text-3xl">{value}</div>
      <p className="mt-1 text-xs text-muted">{detail}</p>
    </div>
  );
}
