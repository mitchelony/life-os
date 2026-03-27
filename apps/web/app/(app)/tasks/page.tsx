"use client";

import Link from "next/link";
import { Check, PauseCircle, Plus, RotateCcw, Slash, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useFeedback } from "@/components/feedback-provider";
import { Badge, Button, InlineField, Input, Panel, SectionHeading, Select, Textarea } from "@/components/ui";
import { api } from "@/lib/api";
import { notifyDecisionChanged, type DecisionAction, useDecisionSnapshot } from "@/lib/decision";
import { getActionLaneSummary, getVisibleActionLanes, groupActionsByLane, isInactiveActionStatus } from "@/lib/decision-view";

const laneOptions = [
  { value: "do_now", label: "Do now" },
  { value: "this_week", label: "This week" },
  { value: "when_income_lands", label: "When income lands" },
  { value: "manual", label: "Manual" },
];

const statusOptions = [
  { value: "todo", label: "To do" },
  { value: "in_progress", label: "In progress" },
  { value: "blocked", label: "Blocked" },
  { value: "done", label: "Done" },
  { value: "skipped", label: "Skipped" },
];

function dueLabel(value?: string) {
  if (!value) return "No due date";
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function laneLabel(value: string) {
  return laneOptions.find((option) => option.value === value)?.label ?? value.replaceAll("_", " ");
}

function statusLabel(value: string) {
  return statusOptions.find((option) => option.value === value)?.label ?? value.replaceAll("_", " ");
}

type ActionDraft = {
  title: string;
  detail: string;
  lane: string;
  dueOn: string;
};

const emptyDraft: ActionDraft = {
  title: "",
  detail: "",
  lane: "manual",
  dueOn: "",
};

function ActionCard({
  action,
  onSave,
  onStatusChange,
  onDelete,
}: {
  action: {
    id: string;
    title: string;
    detail?: string;
    lane: string;
    source: string;
    status: string;
    dueOn?: string;
  };
  onSave: (draft: ActionDraft) => Promise<boolean>;
  onStatusChange: (status: string) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [draft, setDraft] = useState<ActionDraft>({
    title: action.title,
    detail: action.detail ?? "",
    lane: action.lane,
    dueOn: action.dueOn ?? "",
  });

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
            <Badge className={action.source === "manual" ? "border-transparent bg-accent-soft text-accent" : undefined}>
              {action.source === "manual" ? "manual" : "system"}
            </Badge>
            <Badge>{statusLabel(action.status)}</Badge>
            <Badge>{laneLabel(action.lane)}</Badge>
          </div>
          <h2 className="mt-3 text-xl font-semibold tracking-tight text-ink">{action.title}</h2>
          <p className="mt-1 text-sm text-muted">{dueLabel(action.dueOn)}</p>
          {action.detail ? <p className="mt-3 text-sm leading-6 text-muted">{action.detail}</p> : null}
        </div>
        <Button variant="ghost" onClick={() => setEditing((current) => !current)}>
          {editing ? "Close" : "Edit"}
        </Button>
      </div>

      {editing ? (
        <div className="grid gap-4 md:grid-cols-2">
          <InlineField label="Title">
            <Input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} />
          </InlineField>
          <InlineField label="Due date">
            <Input type="date" value={draft.dueOn} onChange={(event) => setDraft((current) => ({ ...current, dueOn: event.target.value }))} />
          </InlineField>
          <InlineField label="Lane">
            <Select value={draft.lane} onChange={(event) => setDraft((current) => ({ ...current, lane: event.target.value }))}>
              {laneOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </InlineField>
          <InlineField label="Detail" helper="Optional">
            <Textarea
              rows={3}
              value={draft.detail}
              onChange={(event) => setDraft((current) => ({ ...current, detail: event.target.value }))}
              placeholder="Leave yourself the one note that matters."
            />
          </InlineField>
          <div className="md:col-span-2">
            <Button
              disabled={pending || !draft.title.trim()}
              onClick={() =>
                run(async () => {
                  const saved = await onSave(draft);
                  if (saved) {
                    setEditing(false);
                  }
                })
              }
            >
              Save action
            </Button>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {isInactiveActionStatus(action.status) ? (
          <Button variant="ghost" disabled={pending} onClick={() => run(() => onStatusChange("todo"))}>
            <RotateCcw className="h-4 w-4" />
            Reopen
          </Button>
        ) : (
          <Button disabled={pending} onClick={() => run(() => onStatusChange("done"))}>
            <Check className="h-4 w-4" />
            Mark done
          </Button>
        )}
        <Button variant="ghost" disabled={pending} onClick={() => run(() => onStatusChange("in_progress"))}>
          <PauseCircle className="h-4 w-4" />
          Start
        </Button>
        <Button variant="ghost" disabled={pending} onClick={() => run(() => onStatusChange("blocked"))}>
          <Slash className="h-4 w-4" />
          Block
        </Button>
        <Button variant="ghost" disabled={pending} onClick={() => run(() => onStatusChange("skipped"))}>
          Skip
        </Button>
        {onDelete ? (
          <Button variant="ghost" disabled={pending} onClick={() => run(onDelete)}>
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        ) : null}
      </div>
    </Panel>
  );
}

function ActionLane({
  title,
  description,
  actions,
  onSave,
  onStatusChange,
  onDelete,
}: {
  title: string;
  description: string;
  actions: DecisionAction[];
  onSave: (actionId: string, draft: ActionDraft) => Promise<boolean>;
  onStatusChange: (actionId: string, status: string) => Promise<void>;
  onDelete: (actionId: string) => Promise<void>;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.24em] text-muted">{title}</p>
          <p className="mt-1 text-sm text-muted">{description}</p>
        </div>
        <Badge>{actions.length}</Badge>
      </div>
      {actions.length ? (
        <div className="space-y-3">
          {actions.map((action) => (
            <ActionCard
              key={action.id}
              action={action}
              onSave={(draft) => onSave(action.id, draft)}
              onStatusChange={(status) => onStatusChange(action.id, status)}
              onDelete={action.source === "manual" ? () => onDelete(action.id) : undefined}
            />
          ))}
        </div>
      ) : (
        <Panel className="border-dashed bg-white/56 text-sm text-muted">Nothing here right now.</Panel>
      )}
    </section>
  );
}

export default function TasksPage() {
  const { pushFeedback } = useFeedback();
  const { snapshot, loading, refresh } = useDecisionSnapshot();
  const [composerOpen, setComposerOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [draft, setDraft] = useState<ActionDraft>(emptyDraft);

  const grouped = useMemo(() => groupActionsByLane(snapshot?.orderedActionQueue ?? []), [snapshot?.orderedActionQueue]);
  const laneSummary = useMemo(() => getActionLaneSummary(snapshot?.orderedActionQueue ?? []), [snapshot?.orderedActionQueue]);
  const visibleLanes = useMemo(() => getVisibleActionLanes(snapshot?.orderedActionQueue ?? []), [snapshot?.orderedActionQueue]);
  const hasActiveWork = grouped.doNow.length + grouped.thisWeek.length + grouped.whenIncomeLands.length + grouped.manual.length > 0;

  async function sync(task: () => Promise<unknown>, successTitle: string, errorTitle: string) {
    setPending(true);
    try {
      await task();
      notifyDecisionChanged();
      await refresh();
      pushFeedback({ tone: "success", title: successTitle });
      return true;
    } catch (error) {
      pushFeedback({
        tone: "error",
        title: errorTitle,
        description: error instanceof Error ? error.message : "Try again in a moment.",
      });
      return false;
    } finally {
      setPending(false);
    }
  }

  async function createManualAction() {
    if (!draft.title.trim()) return;
    const created = await sync(
      () =>
        api.createAction({
          title: draft.title.trim(),
          detail: draft.detail.trim() || null,
          lane: draft.lane,
          status: "todo",
          source: "manual",
          due_on: draft.dueOn || null,
        }),
      "Action added.",
      "Could not add action.",
    );
    if (created) {
      setDraft(emptyDraft);
      setComposerOpen(false);
    }
  }

  if (loading && !snapshot) {
    return (
      <div className="space-y-4 pb-24 md:space-y-6 md:pb-6">
        <Panel>
          <SectionHeading eyebrow="Actions" title="Loading the queue" description="Pulling your next moves from the decision engine." />
        </Panel>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1180px] space-y-4 pb-24 md:space-y-6 md:pb-6">
      <Panel className="overflow-hidden bg-[linear-gradient(135deg,rgba(244,241,233,0.94),rgba(232,245,238,0.88))]">
        <SectionHeading
          eyebrow="Actions"
          title={snapshot?.focus.primaryAction?.title ?? "Keep the queue light and decisive"}
          description={snapshot?.focus.whyNow ?? "This queue is ordered so you know what to do next without recomputing the system."}
          action={
            <Button variant="secondary" disabled={pending} onClick={() => setComposerOpen((current) => !current)}>
              <Plus className="h-4 w-4" />
              {composerOpen ? "Close" : "Add manual action"}
            </Button>
          }
        />
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {laneSummary.map((item) => (
            <Panel key={item.key} className="bg-white/72">
              <p className="text-[10px] uppercase tracking-[0.22em] text-muted">{item.label}</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">{item.count}</p>
            </Panel>
          ))}
        </div>

        {composerOpen ? (
          <div className="mt-5 grid gap-4 rounded-[24px] border border-line bg-white/74 p-4 md:grid-cols-2">
            <InlineField label="Title">
              <Input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Call utilities and confirm payment arrangement" />
            </InlineField>
            <InlineField label="Due date">
              <Input type="date" value={draft.dueOn} onChange={(event) => setDraft((current) => ({ ...current, dueOn: event.target.value }))} />
            </InlineField>
            <InlineField label="Lane">
              <Select value={draft.lane} onChange={(event) => setDraft((current) => ({ ...current, lane: event.target.value }))}>
                {laneOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </InlineField>
            <InlineField label="Detail" helper="Optional">
              <Textarea rows={3} value={draft.detail} onChange={(event) => setDraft((current) => ({ ...current, detail: event.target.value }))} placeholder="Keep it short and useful." />
            </InlineField>
            <div className="md:col-span-2">
              <Button disabled={pending || !draft.title.trim()} onClick={() => void createManualAction()}>
                Save action
              </Button>
            </div>
          </div>
        ) : null}
      </Panel>

      {!hasActiveWork ? (
        <Panel className="overflow-hidden bg-[linear-gradient(135deg,rgba(255,255,255,0.88),rgba(239,246,243,0.88))]">
          <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <p className="text-[10px] uppercase tracking-[0.24em] text-muted">No live queue</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink">Nothing is competing for attention right now.</h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
                Use this page to add the next thing you do not want to forget, or go back to Roadmap if you need the app to rebuild the order for you.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <Button onClick={() => setComposerOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Add manual action
                </Button>
                <Link
                  href="/roadmap"
                  className="inline-flex items-center justify-center rounded-full border border-line bg-white/72 px-4 py-2.5 text-sm font-medium text-ink transition duration-200 hover:-translate-y-0.5 hover:bg-white"
                >
                  Open roadmap
                </Link>
                <Link
                  href="/quick-add"
                  className="inline-flex items-center justify-center rounded-full border border-line bg-white/72 px-4 py-2.5 text-sm font-medium text-ink transition duration-200 hover:-translate-y-0.5 hover:bg-white"
                >
                  Log money
                </Link>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-[22px] border border-line bg-[rgba(255,255,255,0.7)] p-4">
                <p className="text-[10px] uppercase tracking-[0.22em] text-muted">Best use</p>
                <p className="mt-2 text-sm leading-6 text-ink">Keep this screen for work you actually need to execute, not for storing every idea.</p>
              </div>
              <div className="rounded-[22px] border border-line bg-[rgba(255,255,255,0.7)] p-4">
                <p className="text-[10px] uppercase tracking-[0.22em] text-muted">When to use Roadmap</p>
                <p className="mt-2 text-sm leading-6 text-ink">Go there when you need to decide what gets paid first when the next income lands.</p>
              </div>
            </div>
          </div>
        </Panel>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {visibleLanes
            .filter((lane) => lane.key !== "inactive")
            .map((lane) => (
              <ActionLane
                key={lane.key}
                title={lane.label}
                description={lane.description}
                actions={lane.actions}
                onSave={(actionId, nextDraft) =>
                  sync(
                    () =>
                      api.updateAction(actionId, {
                        title: nextDraft.title.trim(),
                        detail: nextDraft.detail.trim() || null,
                        lane: nextDraft.lane,
                        due_on: nextDraft.dueOn || null,
                      }),
                    "Action updated.",
                    "Could not update action.",
                  )
                }
                onStatusChange={(actionId, status) =>
                  (async () => {
                    await sync(() => api.updateAction(actionId, { status }), "Action updated.", "Could not update action.");
                  })()
                }
                onDelete={async (actionId) => {
                  await sync(() => api.deleteAction(actionId), "Action removed.", "Could not remove action.");
                }}
              />
            ))}
        </div>
      )}

      {grouped.inactive.length ? (
        <ActionLane
          title="Inactive"
          description="Done, skipped, and blocked actions move here so they stop competing with live work."
          actions={grouped.inactive}
          onSave={(actionId, nextDraft) =>
            sync(
              () =>
                api.updateAction(actionId, {
                  title: nextDraft.title.trim(),
                  detail: nextDraft.detail.trim() || null,
                  lane: nextDraft.lane,
                  due_on: nextDraft.dueOn || null,
                }),
              "Action updated.",
              "Could not update action.",
            )
          }
          onStatusChange={(actionId, status) =>
            (async () => {
              await sync(() => api.updateAction(actionId, { status }), "Action updated.", "Could not update action.");
            })()
          }
          onDelete={async (actionId) => {
            await sync(() => api.deleteAction(actionId), "Action removed.", "Could not remove action.");
          }}
        />
      ) : null}
    </div>
  );
}
