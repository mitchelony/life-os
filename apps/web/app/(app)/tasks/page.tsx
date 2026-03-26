"use client";

import { Check, PauseCircle, Plus, RotateCcw, Slash, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge, Button, InlineField, Input, Panel, SectionHeading, Select, Textarea } from "@/components/ui";
import { api } from "@/lib/api";
import { notifyDecisionChanged, type DecisionAction, useDecisionSnapshot } from "@/lib/decision";
import { groupActionsByLane } from "@/lib/decision-view";

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

function isDoneLike(status: string) {
  return status === "done" || status === "skipped";
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
  onSave: (draft: ActionDraft) => Promise<void>;
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
                  await onSave(draft);
                  setEditing(false);
                })
              }
            >
              Save action
            </Button>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {action.status === "done" ? (
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
  onSave: (actionId: string, draft: ActionDraft) => Promise<void>;
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
  const { snapshot, loading, refresh } = useDecisionSnapshot();
  const [composerOpen, setComposerOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [draft, setDraft] = useState<ActionDraft>(emptyDraft);

  const grouped = useMemo(() => groupActionsByLane(snapshot?.orderedActionQueue ?? []), [snapshot?.orderedActionQueue]);
  const doneCount = (snapshot?.orderedActionQueue ?? []).filter((item) => isDoneLike(item.status)).length;

  async function sync(task: () => Promise<unknown>) {
    setPending(true);
    try {
      await task();
      notifyDecisionChanged();
      await refresh();
    } finally {
      setPending(false);
    }
  }

  async function createManualAction() {
    if (!draft.title.trim()) return;
    await sync(() =>
      api.createAction({
        title: draft.title.trim(),
        detail: draft.detail.trim() || null,
        lane: draft.lane,
        status: "todo",
        source: "manual",
        due_on: draft.dueOn || null,
      }),
    );
    setDraft(emptyDraft);
    setComposerOpen(false);
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
          <Panel className="bg-white/72">
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted">Do now</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">{grouped.doNow.filter((item) => !isDoneLike(item.status)).length}</p>
          </Panel>
          <Panel className="bg-white/72">
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted">This week</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">{grouped.thisWeek.filter((item) => !isDoneLike(item.status)).length}</p>
          </Panel>
          <Panel className="bg-white/72">
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted">Finished or skipped</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">{doneCount}</p>
          </Panel>
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

      <ActionLane
        title="Do now"
        description="The actions that should be resolved before anything else."
        actions={grouped.doNow}
        onSave={(actionId, nextDraft) =>
          sync(() =>
            api.updateAction(actionId, {
              title: nextDraft.title.trim(),
              detail: nextDraft.detail.trim() || null,
              lane: nextDraft.lane,
              due_on: nextDraft.dueOn || null,
            }),
          )
        }
        onStatusChange={(actionId, status) => sync(() => api.updateAction(actionId, { status }))}
        onDelete={(actionId) => sync(() => api.deleteAction(actionId))}
      />

      <ActionLane
        title="This week"
        description="Important, but not the first move."
        actions={grouped.thisWeek}
        onSave={(actionId, nextDraft) =>
          sync(() =>
            api.updateAction(actionId, {
              title: nextDraft.title.trim(),
              detail: nextDraft.detail.trim() || null,
              lane: nextDraft.lane,
              due_on: nextDraft.dueOn || null,
            }),
          )
        }
        onStatusChange={(actionId, status) => sync(() => api.updateAction(actionId, { status }))}
        onDelete={(actionId) => sync(() => api.deleteAction(actionId))}
      />

      <ActionLane
        title="When income lands"
        description="The ordered moves waiting on the next reliable inflow."
        actions={grouped.whenIncomeLands}
        onSave={(actionId, nextDraft) =>
          sync(() =>
            api.updateAction(actionId, {
              title: nextDraft.title.trim(),
              detail: nextDraft.detail.trim() || null,
              lane: nextDraft.lane,
              due_on: nextDraft.dueOn || null,
            }),
          )
        }
        onStatusChange={(actionId, status) => sync(() => api.updateAction(actionId, { status }))}
        onDelete={(actionId) => sync(() => api.deleteAction(actionId))}
      />

      <ActionLane
        title="Manual"
        description="The tasks you added yourself so they can live inside the same operating system."
        actions={grouped.manual}
        onSave={(actionId, nextDraft) =>
          sync(() =>
            api.updateAction(actionId, {
              title: nextDraft.title.trim(),
              detail: nextDraft.detail.trim() || null,
              lane: nextDraft.lane,
              due_on: nextDraft.dueOn || null,
            }),
          )
        }
        onStatusChange={(actionId, status) => sync(() => api.updateAction(actionId, { status }))}
        onDelete={(actionId) => sync(() => api.deleteAction(actionId))}
      />
    </div>
  );
}
