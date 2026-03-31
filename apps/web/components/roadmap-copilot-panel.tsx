"use client";

import React from "react";
import { AlertTriangle, Check, RefreshCw, ShieldAlert, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge, Button, InlineField, Input, Panel, SectionHeading, Select, Textarea, cn } from "@/components/ui";
import {
  api,
  type BackendAccount,
  type BackendRoadmapCopilotDraftResponse,
} from "@/lib/api";
import { todayDateInputValue } from "@/lib/dates";
import { formatMoney } from "@/lib/finance";

export type RoadmapCopilotEmergencyDraft = {
  message: string;
  amount: string;
  title: string;
  merchant_or_source: string;
  category: string;
  account: string;
  date: string;
  notes: string;
};

type RoadmapCopilotPanelViewProps = {
  draft: BackendRoadmapCopilotDraftResponse | null;
  prompt: string;
  revisionNote: string;
  error: string | null;
  feedback: string | null;
  pending: boolean;
  adjustmentOpen: boolean;
  emergencyOpen: boolean;
  emergencyDraft: RoadmapCopilotEmergencyDraft;
  accounts: Array<Pick<BackendAccount, "id" | "name">>;
  categories: string[];
  onPromptChange?: (value: string) => void;
  onDraft?: () => void;
  onApprove?: () => void;
  onAdjustmentToggle?: () => void;
  onRevisionNoteChange?: (value: string) => void;
  onRevise?: () => void;
  onDeny?: () => void;
  onEmergencyToggle?: () => void;
  onEmergencyChange?: <K extends keyof RoadmapCopilotEmergencyDraft>(field: K, value: RoadmapCopilotEmergencyDraft[K]) => void;
  onEmergencySubmit?: () => void;
};

function formatIncomeEntryCount(count: number) {
  return `Preserving ${count} expected income entr${count === 1 ? "y" : "ies"} unless you explicitly replace them.`;
}

function emptyPreviewMessage(label: string) {
  return `No ${label} drafted yet.`;
}

const copilotScenarioChips = [
  "My refund is late, so rent has to come first.",
  "My work-study shift was smaller than usual this week.",
  "Family support is coming later than expected.",
  "I need to cover groceries before anything optional.",
] as const;

export function RoadmapCopilotPanelView({
  draft,
  prompt,
  revisionNote,
  error,
  feedback,
  pending,
  adjustmentOpen,
  emergencyOpen,
  emergencyDraft,
  accounts,
  categories,
  onPromptChange,
  onDraft,
  onApprove,
  onAdjustmentToggle,
  onRevisionNoteChange,
  onRevise,
  onDeny,
  onEmergencyToggle,
  onEmergencyChange,
  onEmergencySubmit,
}: RoadmapCopilotPanelViewProps) {
  return (
    <Panel className="space-y-4 overflow-hidden bg-[linear-gradient(135deg,rgba(250,247,240,0.96),rgba(241,236,224,0.94))]">
      <SectionHeading
        eyebrow="Copilot"
        title={draft ? "Review the drafted plan" : "Tell the copilot what changed"}
        description={
          draft
            ? "Approve to use this updated plan, adjust it with a note, or leave your current roadmap unchanged."
            : "Describe what changed or what you want help with. The copilot will draft an updated plan around your current numbers, but nothing changes until you approve it."
        }
        action={
          <div className="flex flex-wrap gap-2">
            {draft ? (
              <>
                <Button disabled={pending} onClick={onApprove}>
                  <Check className="h-4 w-4" />
                  {pending ? "Working..." : "Approve"}
                </Button>
                <Button variant="secondary" disabled={pending} onClick={onAdjustmentToggle}>
                  <RefreshCw className="h-4 w-4" />
                  {adjustmentOpen ? "Close adjust" : "Adjust"}
                </Button>
                <Button variant="ghost" disabled={pending} onClick={onDeny}>
                  Deny
                </Button>
              </>
            ) : (
              <Button disabled={pending || !prompt.trim()} onClick={onDraft}>
                <Sparkles className="h-4 w-4" />
                {pending ? "Drafting..." : "Draft plan"}
              </Button>
            )}
          </div>
        }
      />

      {error ? <div className="rounded-[18px] border border-[rgba(165,57,42,0.2)] bg-[rgba(165,57,42,0.06)] px-4 py-3 text-sm text-ink">{error}</div> : null}
      {feedback ? (
        <div className="rounded-[18px] border border-[rgba(61,111,94,0.18)] bg-[rgba(61,111,94,0.08)] px-4 py-3 text-sm text-ink">{feedback}</div>
      ) : null}

      {!draft ? (
        <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-3">
            <InlineField
              label="What changed?"
              description="Examples: a refund is late, work hours got cut, family support changed, or rent has to come first."
            >
              <Textarea
                rows={8}
                value={prompt}
                onChange={(event) => onPromptChange?.(event.target.value)}
                placeholder="Rent is due in two days, my card minimum is coming up, and the next deposit is smaller than I expected. Rework the plan so this week stays stable."
              />
            </InlineField>
            <div className="flex flex-wrap gap-2">
              {copilotScenarioChips.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => onPromptChange?.(chip)}
                  className="rounded-full border border-line bg-white/72 px-3 py-2 text-sm text-ink transition hover:bg-white"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-3">
            <div className="rounded-[20px] border border-line bg-white/70 p-4">
              <p className="text-[10px] uppercase tracking-[0.22em] text-muted">Use it</p>
              <p className="mt-2 text-sm leading-6 text-muted">If it looks right, approve it and the roadmap updates in one step.</p>
            </div>
            <div className="rounded-[20px] border border-line bg-white/70 p-4">
              <p className="text-[10px] uppercase tracking-[0.22em] text-muted">Refine it</p>
              <p className="mt-2 text-sm leading-6 text-muted">Give one short note and the copilot redraws the plan against your latest numbers.</p>
            </div>
            <div className="rounded-[20px] border border-line bg-white/70 p-4">
              <p className="text-[10px] uppercase tracking-[0.22em] text-muted">Guardrails</p>
              <p className="mt-2 text-sm leading-6 text-muted">The copilot can reshape the plan, not your money history, so recorded transactions stay trustworthy.</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-[22px] border border-line bg-white/78 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge>{draft.status}</Badge>
                <Badge className="border-transparent bg-accent-soft text-accent">{draft.planner_source}</Badge>
              </div>
              <h3 className="mt-3 text-xl font-semibold tracking-tight text-ink">{draft.summary}</h3>
              <p className="mt-3 text-sm leading-6 text-muted">{draft.rationale}</p>
              <p className="mt-3 text-xs leading-5 text-muted">{formatIncomeEntryCount(draft.preview.preserved_income_entries)}</p>
              <p className="mt-2 text-xs leading-5 text-muted">If money already moved in real life, record it so the plan stays grounded in what actually happened.</p>
            </div>
            <div className="rounded-[22px] border border-line bg-white/78 p-4">
              <p className="text-[10px] uppercase tracking-[0.22em] text-muted">Warnings</p>
              {draft.warnings.length ? (
                <div className="mt-3 space-y-2">
                  {draft.warnings.map((warning) => (
                    <div key={warning} className="flex items-start gap-2 rounded-[16px] border border-[rgba(165,57,42,0.16)] bg-[rgba(165,57,42,0.06)] px-3 py-2 text-sm text-ink">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[rgba(165,57,42,0.9)]" />
                      <span>{warning}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted">No additional warnings in this draft.</p>
              )}
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            <div className="rounded-[22px] border border-line bg-white/72 p-4">
              <p className="text-[10px] uppercase tracking-[0.22em] text-muted">Goals</p>
              <div className="mt-3 space-y-2">
                {draft.preview.goals.length ? (
                  draft.preview.goals.map((goal) => (
                    <div key={`${goal.title}-${goal.priority}`} className="rounded-[16px] border border-line bg-white/90 px-3 py-2">
                      <p className="text-sm font-medium text-ink">{goal.title}</p>
                      <p className="mt-1 text-xs text-muted">
                        {goal.priority} priority · {goal.step_count} step{goal.step_count === 1 ? "" : "s"}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted">{emptyPreviewMessage("goals")}</p>
                )}
              </div>
            </div>
            <div className="rounded-[22px] border border-line bg-white/72 p-4">
              <p className="text-[10px] uppercase tracking-[0.22em] text-muted">Income plans</p>
              <div className="mt-3 space-y-2">
                {draft.preview.income_plans.length ? (
                  draft.preview.income_plans.map((plan) => (
                    <div key={`${plan.label}-${plan.amount}`} className="rounded-[16px] border border-line bg-white/90 px-3 py-2">
                      <p className="text-sm font-medium text-ink">{plan.label}</p>
                      <p className="mt-1 text-xs text-muted">
                        {formatMoney(plan.amount)} · {plan.allocation_count} allocation{plan.allocation_count === 1 ? "" : "s"}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted">{emptyPreviewMessage("income plans")}</p>
                )}
              </div>
            </div>
            <div className="rounded-[22px] border border-line bg-white/72 p-4">
              <p className="text-[10px] uppercase tracking-[0.22em] text-muted">Actions</p>
              <div className="mt-3 space-y-2">
                {draft.preview.actions.length ? (
                  draft.preview.actions.map((action) => (
                    <div key={`${action.title}-${action.lane}`} className="rounded-[16px] border border-line bg-white/90 px-3 py-2">
                      <p className="text-sm font-medium text-ink">{action.title}</p>
                      <p className="mt-1 text-xs text-muted">{action.lane.replaceAll("_", " ")}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted">{emptyPreviewMessage("actions")}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {draft && adjustmentOpen ? (
        <div className="rounded-[22px] border border-line bg-white/74 p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-1 h-4 w-4 text-accent" />
            <div className="flex-1 space-y-3">
              <div>
                <p className="text-sm font-medium text-ink">Adjust the draft</p>
                <p className="mt-1 text-sm leading-6 text-muted">Give the copilot a revision note. It will redraw the draft against your latest planning context.</p>
              </div>
              <Textarea
                rows={4}
                value={revisionNote}
                onChange={(event) => onRevisionNoteChange?.(event.target.value)}
                placeholder="Put utilities first, keep the card minimum current, and leave a smaller cushion for now."
              />
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" disabled={pending || !revisionNote.trim()} onClick={onRevise}>
                  {pending ? "Adjusting..." : "Submit adjustment"}
                </Button>
                <Button variant="ghost" disabled={pending} onClick={onAdjustmentToggle}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className={cn("rounded-[22px] border p-4 transition", emergencyOpen ? "border-[rgba(165,57,42,0.18)] bg-[rgba(165,57,42,0.04)]" : "border-line bg-white/72")}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-1 h-4 w-4 text-[rgba(165,57,42,0.88)]" />
            <div>
              <p className="text-sm font-medium text-ink">{emergencyOpen ? "Record emergency expense and replan" : "Record emergency expense"}</p>
              <p className="mt-1 text-sm leading-6 text-muted">This records the expense first, then lets the copilot redraw the plan from the updated numbers in the same flow.</p>
            </div>
          </div>
          <Button variant="ghost" disabled={pending} onClick={onEmergencyToggle}>
            {emergencyOpen ? "Close emergency form" : "Open emergency form"}
          </Button>
        </div>

        {emergencyOpen ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <InlineField label="What changed?">
              <Textarea rows={3} value={emergencyDraft.message} onChange={(event) => onEmergencyChange?.("message", event.target.value)} placeholder="A car repair hit today. Rework the plan around it." />
            </InlineField>
            <div className="grid gap-3">
              <InlineField label="Amount">
                <Input value={emergencyDraft.amount} onChange={(event) => onEmergencyChange?.("amount", event.target.value)} placeholder="0.00" inputMode="decimal" />
              </InlineField>
              <InlineField label="Date">
                <Input type="date" value={emergencyDraft.date} onChange={(event) => onEmergencyChange?.("date", event.target.value)} />
              </InlineField>
            </div>
            <InlineField label="Title">
              <Input value={emergencyDraft.title} onChange={(event) => onEmergencyChange?.("title", event.target.value)} placeholder="Emergency car repair" />
            </InlineField>
            <InlineField label="Merchant">
              <Input value={emergencyDraft.merchant_or_source} onChange={(event) => onEmergencyChange?.("merchant_or_source", event.target.value)} placeholder="City Garage" />
            </InlineField>
            <InlineField label="Category">
              <Input list="roadmap-copilot-categories" value={emergencyDraft.category} onChange={(event) => onEmergencyChange?.("category", event.target.value)} placeholder="Auto" />
            </InlineField>
            <InlineField label="Account">
              <Select value={emergencyDraft.account} onChange={(event) => onEmergencyChange?.("account", event.target.value)}>
                <option value="">{accounts.length ? "Choose an account" : "No account loaded"}</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.name}>
                    {account.name}
                  </option>
                ))}
              </Select>
            </InlineField>
            <div className="md:col-span-2">
              <InlineField label="Notes" helper="Optional">
                <Textarea rows={3} value={emergencyDraft.notes} onChange={(event) => onEmergencyChange?.("notes", event.target.value)} placeholder="Paid immediately. Rework the next few moves around it." />
              </InlineField>
            </div>
            <div className="md:col-span-2 flex flex-wrap gap-2">
              <Button
                variant="secondary"
                disabled={pending || !emergencyDraft.message.trim() || !emergencyDraft.amount || !emergencyDraft.title.trim() || !emergencyDraft.account}
                onClick={onEmergencySubmit}
              >
                {pending ? "Recording..." : "Record emergency expense and replan"}
              </Button>
            </div>
            <datalist id="roadmap-copilot-categories">
              {categories.map((category) => (
                <option key={category} value={category} />
              ))}
            </datalist>
          </div>
        ) : null}
      </div>
    </Panel>
  );
}

const todayIso = todayDateInputValue();

const emptyEmergencyDraft: RoadmapCopilotEmergencyDraft = {
  message: "",
  amount: "",
  title: "",
  merchant_or_source: "",
  category: "",
  account: "",
  date: todayIso,
  notes: "",
};

export function RoadmapCopilotPanel({ onPlanningChanged }: { onPlanningChanged: () => Promise<void> }) {
  const [draft, setDraft] = useState<BackendRoadmapCopilotDraftResponse | null>(null);
  const [prompt, setPrompt] = useState("");
  const [revisionNote, setRevisionNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [adjustmentOpen, setAdjustmentOpen] = useState(false);
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const [emergencyDraft, setEmergencyDraft] = useState<RoadmapCopilotEmergencyDraft>(emptyEmergencyDraft);
  const [accounts, setAccounts] = useState<Array<Pick<BackendAccount, "id" | "name">>>([]);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [current, nextAccounts, nextCategories] = await Promise.all([
          api.getRoadmapCopilotCurrent(),
          api.listAccounts().catch(() => []),
          api.getCategories().catch(() => []),
        ]);
        if (cancelled) return;
        setDraft(current.draft);
        setAccounts(nextAccounts.map((account) => ({ id: account.id, name: account.name })));
        setCategories(nextCategories);
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? `Copilot is unavailable right now. ${caught.message}` : "Copilot is unavailable right now. You can still work from the roadmap below.");
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function run(task: () => Promise<void>) {
    setPending(true);
    setError(null);
    setFeedback(null);
    try {
      await task();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something interrupted the copilot. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <RoadmapCopilotPanelView
      draft={draft}
      prompt={prompt}
      revisionNote={revisionNote}
      error={error}
      feedback={feedback}
      pending={pending}
      adjustmentOpen={adjustmentOpen}
      emergencyOpen={emergencyOpen}
      emergencyDraft={emergencyDraft}
      accounts={accounts}
      categories={categories}
      onPromptChange={setPrompt}
      onDraft={() =>
        void run(async () => {
          const nextDraft = await api.createRoadmapCopilotDraft(prompt.trim());
          setDraft(nextDraft);
          setPrompt("");
          setAdjustmentOpen(false);
          setFeedback("Fresh draft ready to review.");
        })
      }
      onApprove={() =>
        void run(async () => {
          if (!draft) return;
          await api.approveRoadmapCopilotDraft(draft.draft_id);
          setDraft(null);
          setAdjustmentOpen(false);
          setRevisionNote("");
          setFeedback("Draft approved. The roadmap is now updated.");
          await onPlanningChanged();
        })
      }
      onAdjustmentToggle={() => {
        setAdjustmentOpen((current) => !current);
        setError(null);
        setFeedback(null);
      }}
      onRevisionNoteChange={setRevisionNote}
      onRevise={() =>
        void run(async () => {
          if (!draft || !revisionNote.trim()) return;
          const nextDraft = await api.reviseRoadmapCopilotDraft(draft.draft_id, revisionNote.trim());
          setDraft(nextDraft);
          setRevisionNote("");
          setAdjustmentOpen(false);
          setFeedback("Draft refreshed from your note.");
        })
      }
      onDeny={() =>
        void run(async () => {
          if (!draft) return;
          const response = await api.denyRoadmapCopilotDraft(draft.draft_id);
          setDraft(response.draft);
          setAdjustmentOpen(false);
          setRevisionNote("");
          setFeedback(response.draft ? "That draft was already inactive. The latest active draft is now shown." : "Draft denied. The live roadmap was left unchanged.");
        })
      }
      onEmergencyToggle={() => {
        setEmergencyOpen((current) => !current);
        setError(null);
        setFeedback(null);
      }}
      onEmergencyChange={(field, value) => setEmergencyDraft((current) => ({ ...current, [field]: value }))}
      onEmergencySubmit={() =>
        void run(async () => {
          const response = await api.submitRoadmapCopilotEmergencyExpense({
            message: emergencyDraft.message.trim(),
            amount: Number(emergencyDraft.amount),
            title: emergencyDraft.title.trim(),
            merchant_or_source: emergencyDraft.merchant_or_source.trim(),
            category: emergencyDraft.category.trim(),
            account: emergencyDraft.account,
            date: emergencyDraft.date,
            notes: emergencyDraft.notes.trim() || undefined,
          });
          setDraft(response.draft);
          setEmergencyDraft({
            ...emptyEmergencyDraft,
            account: emergencyDraft.account,
          });
          setEmergencyOpen(false);
          setAdjustmentOpen(false);
          setFeedback("Expense recorded. A fresh draft is ready.");
          await onPlanningChanged();
        })
      }
    />
  );
}
