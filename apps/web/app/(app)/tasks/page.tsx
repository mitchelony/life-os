"use client";

import { Check, EyeOff, PencilLine, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge, Button, cn, InlineField, Input, Panel, SectionHeading, Select, Textarea } from "@/components/ui";
import {
  buildDashboardFromSetup,
  buildManagedTasks,
  createEmptyStoredLifeOsSetup,
  useStoredLifeOsSetup,
  type StoredLifeOsSetup,
  type StoredTaskOverride,
} from "@/lib/local-state";
import type { Task, TaskPriority } from "@/lib/types";

type TaskDraft = {
  title: string;
  dueDate: string;
  priority: TaskPriority;
  notes: string;
};

const priorityOptions: TaskPriority[] = ["urgent", "high", "normal"];

function createDraftId() {
  return `manual-${Math.random().toString(36).slice(2, 10)}`;
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function dueLabel(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

function buildTaskDraft(task: Task): TaskDraft {
  return {
    title: task.title,
    dueDate: task.dueDate.slice(0, 10),
    priority: task.priority,
    notes: task.notes ?? "",
  };
}

function getBaseSetup(setup: StoredLifeOsSetup, hydrated: boolean) {
  return hydrated ? setup : createEmptyStoredLifeOsSetup();
}

function upsertTaskOverride(
  taskOverrides: StoredTaskOverride[],
  taskId: string,
  patch: Partial<StoredTaskOverride>,
) {
  const index = taskOverrides.findIndex((item) => item.taskId === taskId);
  const nextOverride: StoredTaskOverride = {
    ...(index >= 0 ? taskOverrides[index] : { taskId }),
    ...patch,
    taskId,
  };

  if (!nextOverride.title?.trim()) delete nextOverride.title;
  if (!nextOverride.dueDate?.trim()) delete nextOverride.dueDate;
  if (!nextOverride.notes?.trim()) delete nextOverride.notes;
  if (nextOverride.completed === false) delete nextOverride.completed;
  if (nextOverride.dismissed === false) delete nextOverride.dismissed;

  const hasMeaningfulFields = Object.keys(nextOverride).some((key) => key !== "taskId");
  if (!hasMeaningfulFields) {
    return taskOverrides.filter((item) => item.taskId !== taskId);
  }

  if (index >= 0) {
    const nextOverrides = [...taskOverrides];
    nextOverrides[index] = nextOverride;
    return nextOverrides;
  }

  return [...taskOverrides, nextOverride];
}

function HiddenTaskCard({
  override,
  onRestore,
}: {
  override: StoredTaskOverride;
  onRestore: () => void;
}) {
  return (
    <Panel className="space-y-3 border-dashed">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted">Hidden</p>
          <h3 className="mt-2 text-lg font-semibold tracking-tight text-ink">{override.title ?? "Hidden task"}</h3>
          <p className="mt-1 text-sm text-muted">
            {override.dueDate ? dueLabel(override.dueDate) : "No due date"} · {override.linkedTo ?? "Derived task"}
          </p>
        </div>
        <Badge>hidden</Badge>
      </div>
      {override.notes ? <p className="text-sm leading-6 text-muted">{override.notes}</p> : null}
      <Button variant="ghost" className="w-full sm:w-auto" onClick={onRestore}>
        <RotateCcw className="h-4 w-4" />
        Restore
      </Button>
    </Panel>
  );
}

function TaskCard({
  task,
  onSave,
  onToggleComplete,
  onDismiss,
  onDelete,
}: {
  task: Task;
  onSave: (draft: TaskDraft) => void;
  onToggleComplete: () => void;
  onDismiss?: () => void;
  onDelete?: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<TaskDraft>(() => buildTaskDraft(task));

  useEffect(() => {
    setDraft(buildTaskDraft(task));
  }, [task]);

  const isManual = task.source === "manual";

  return (
    <Panel className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={cn(task.completed ? "bg-white/88 text-muted" : task.priority === "urgent" ? "bg-[rgba(165,57,42,0.12)] text-[#8a3022]" : "bg-accent-soft text-accent")}>
              {task.priority}
            </Badge>
            <Badge>{isManual ? "manual" : "derived"}</Badge>
            {task.linkedTo ? <span className="text-xs text-muted">{task.linkedTo}</span> : null}
          </div>
          <h2 className="mt-3 text-xl font-semibold tracking-tight text-ink">{task.title}</h2>
          <p className="mt-1 text-sm text-muted">{dueLabel(task.dueDate)}</p>
          {task.notes ? <p className="mt-3 text-sm leading-6 text-muted">{task.notes}</p> : null}
        </div>
        <Button variant="ghost" className="shrink-0" onClick={() => setIsEditing((current) => !current)}>
          <PencilLine className="h-4 w-4" />
          {isEditing ? "Close" : "Edit"}
        </Button>
      </div>

      {isEditing ? (
        <div className="grid gap-4 md:grid-cols-2">
          <InlineField label="Title">
            <Input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} />
          </InlineField>
          <InlineField label="Due date">
            <Input type="date" value={draft.dueDate} onChange={(event) => setDraft((current) => ({ ...current, dueDate: event.target.value }))} />
          </InlineField>
          <InlineField label="Priority">
            <Select value={draft.priority} onChange={(event) => setDraft((current) => ({ ...current, priority: event.target.value as TaskPriority }))}>
              {priorityOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </InlineField>
          <InlineField label="Notes" helper="Optional">
            <Textarea
              rows={3}
              value={draft.notes}
              onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
              placeholder="Leave yourself the one note that matters."
            />
          </InlineField>
          <div className="md:col-span-2">
            <Button
              className="w-full sm:w-auto"
              onClick={() => {
                onSave(draft);
                setIsEditing(false);
              }}
              disabled={!draft.title.trim()}
            >
              Save task
            </Button>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button variant={task.completed ? "ghost" : "primary"} className="w-full sm:w-auto" onClick={onToggleComplete}>
          {task.completed ? <RotateCcw className="h-4 w-4" /> : <Check className="h-4 w-4" />}
          {task.completed ? "Reopen" : "Mark done"}
        </Button>
        {isManual ? (
          <Button variant="ghost" className="w-full sm:w-auto" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        ) : (
          <Button variant="ghost" className="w-full sm:w-auto" onClick={onDismiss}>
            <EyeOff className="h-4 w-4" />
            Hide
          </Button>
        )}
      </div>
    </Panel>
  );
}

export default function TasksPage() {
  const { setup, hydrated, save } = useStoredLifeOsSetup();
  const dashboard = useMemo(() => buildDashboardFromSetup(setup), [setup]);
  const [showComposer, setShowComposer] = useState(false);
  const [newTask, setNewTask] = useState<TaskDraft>({
    title: "",
    dueDate: todayString(),
    priority: "normal",
    notes: "",
  });

  const tasks = useMemo(
    () =>
      buildManagedTasks(
        dashboard.obligations,
        dashboard.debts,
        dashboard.upcomingIncome,
        setup.manualTasks,
        setup.taskOverrides,
      ),
    [dashboard.debts, dashboard.obligations, dashboard.upcomingIncome, setup.manualTasks, setup.taskOverrides],
  );

  const openTasks = tasks.filter((task) => !task.completed);
  const completedTasks = tasks.filter((task) => task.completed);
  const hiddenTasks = setup.taskOverrides.filter((task) => task.dismissed);

  function commit(nextSetup: StoredLifeOsSetup) {
    save(nextSetup);
  }

  function addManualTask() {
    const base = getBaseSetup(setup, hydrated);
    if (!newTask.title.trim()) return;
    commit({
      ...base,
      manualTasks: [
        ...base.manualTasks,
        {
          id: createDraftId(),
          title: newTask.title.trim(),
          dueDate: newTask.dueDate,
          priority: newTask.priority,
          linkedTo: "Manual",
          completed: false,
          source: "manual",
          notes: newTask.notes.trim(),
        },
      ],
    });
    setNewTask({
      title: "",
      dueDate: todayString(),
      priority: "normal",
      notes: "",
    });
    setShowComposer(false);
  }

  function updateManualTask(taskId: string, patch: Partial<Task>) {
    const base = getBaseSetup(setup, hydrated);
    commit({
      ...base,
      manualTasks: base.manualTasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              ...patch,
              title: patch.title?.trim() ?? task.title,
              notes: patch.notes?.trim() ?? task.notes,
            }
          : task,
      ),
    });
  }

  function removeManualTask(taskId: string) {
    const base = getBaseSetup(setup, hydrated);
    commit({
      ...base,
      manualTasks: base.manualTasks.filter((task) => task.id !== taskId),
    });
  }

  function updateDerivedTask(task: Task, patch: Partial<StoredTaskOverride>) {
    const base = getBaseSetup(setup, hydrated);
    commit({
      ...base,
      taskOverrides: upsertTaskOverride(base.taskOverrides, task.id, {
        title: patch.title ?? task.title,
        dueDate: patch.dueDate ?? task.dueDate,
        priority: patch.priority ?? task.priority,
        linkedTo: patch.linkedTo ?? task.linkedTo,
        notes: patch.notes ?? task.notes,
        completed: patch.completed,
        dismissed: patch.dismissed,
      }),
    });
  }

  function restoreHiddenTask(taskId: string) {
    const base = getBaseSetup(setup, hydrated);
    commit({
      ...base,
      taskOverrides: upsertTaskOverride(base.taskOverrides, taskId, {
        dismissed: false,
      }),
    });
  }

  return (
    <div className="space-y-4 pb-24 md:space-y-6 md:pb-6">
      <Panel>
        <SectionHeading
          eyebrow="Tasks"
          title="Keep the follow-ups under your control"
          description="The app still derives the important bills, debt payments, and income check-ins. You can now add your own tasks, edit the wording, mark things done, and hide noise you do not need."
          action={
            <Button className="w-full sm:w-auto" onClick={() => setShowComposer((current) => !current)}>
              <Plus className="h-4 w-4" />
              {showComposer ? "Close" : "Add task"}
            </Button>
          }
        />
      </Panel>

      {showComposer ? (
        <Panel className="space-y-4">
          <SectionHeading
            eyebrow="Manual task"
            title="Add one thing you want to track yourself"
            description="Use this for calls, paperwork, or follow-ups that should sit beside the derived money tasks."
          />
          <div className="grid gap-4 md:grid-cols-2">
            <InlineField label="Title">
              <Input
                value={newTask.title}
                onChange={(event) => setNewTask((current) => ({ ...current, title: event.target.value }))}
                placeholder="Call landlord about the payment split"
              />
            </InlineField>
            <InlineField label="Due date">
              <Input
                type="date"
                value={newTask.dueDate}
                onChange={(event) => setNewTask((current) => ({ ...current, dueDate: event.target.value }))}
              />
            </InlineField>
            <InlineField label="Priority">
              <Select
                value={newTask.priority}
                onChange={(event) => setNewTask((current) => ({ ...current, priority: event.target.value as TaskPriority }))}
              >
                {priorityOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </InlineField>
            <InlineField label="Notes" helper="Optional">
              <Textarea
                rows={3}
                value={newTask.notes}
                onChange={(event) => setNewTask((current) => ({ ...current, notes: event.target.value }))}
                placeholder="Keep this short and useful."
              />
            </InlineField>
          </div>
          <Button className="w-full sm:w-auto" onClick={addManualTask} disabled={!newTask.title.trim()}>
            Save manual task
          </Button>
        </Panel>
      ) : null}

      {dashboard.roadmap.focus.nextStep ? (
        <Panel>
          <SectionHeading
            eyebrow="Roadmap focus"
            title={dashboard.roadmap.focus.nextStep.title}
            description={`${dashboard.roadmap.focus.whyNow} Open Roadmap if you want the full payment order.`}
          />
        </Panel>
      ) : null}

      <section className="space-y-4">
        <SectionHeading
          eyebrow="Open"
          title="What still needs attention"
          description="This is the working list. Derived items stay current as your bills, debt, and income change."
        />
        {openTasks.length ? (
          openTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onSave={(draft) => {
                if (task.source === "manual") {
                  updateManualTask(task.id, {
                    title: draft.title,
                    dueDate: draft.dueDate,
                    priority: draft.priority,
                    notes: draft.notes,
                  });
                  return;
                }
                updateDerivedTask(task, {
                  title: draft.title,
                  dueDate: draft.dueDate,
                  priority: draft.priority,
                  notes: draft.notes,
                  dismissed: false,
                });
              }}
              onToggleComplete={() => {
                if (task.source === "manual") {
                  updateManualTask(task.id, {
                    completed: !task.completed,
                  });
                  return;
                }
                updateDerivedTask(task, {
                  completed: !task.completed,
                  dismissed: false,
                });
              }}
              onDismiss={
                task.source === "manual"
                  ? undefined
                  : () =>
                      updateDerivedTask(task, {
                        title: task.title,
                        dueDate: task.dueDate,
                        priority: task.priority,
                        linkedTo: task.linkedTo,
                        notes: task.notes,
                        dismissed: true,
                        completed: false,
                      })
              }
              onDelete={task.source === "manual" ? () => removeManualTask(task.id) : undefined}
            />
          ))
        ) : (
          <Panel>
            <SectionHeading
              eyebrow="Clear"
              title="Nothing is actively waiting on you"
              description="Use Add task if you want to track something manual, or let the app create the next derived task when the plan changes."
            />
          </Panel>
        )}
      </section>

      {completedTasks.length ? (
        <section className="space-y-4">
          <SectionHeading
            eyebrow="Done"
            title="Completed tasks"
            description="Reopen anything you want to bring back into the main list."
          />
          {completedTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onSave={(draft) => {
                if (task.source === "manual") {
                  updateManualTask(task.id, {
                    title: draft.title,
                    dueDate: draft.dueDate,
                    priority: draft.priority,
                    notes: draft.notes,
                  });
                  return;
                }
                updateDerivedTask(task, {
                  title: draft.title,
                  dueDate: draft.dueDate,
                  priority: draft.priority,
                  notes: draft.notes,
                });
              }}
              onToggleComplete={() => {
                if (task.source === "manual") {
                  updateManualTask(task.id, {
                    completed: false,
                  });
                  return;
                }
                updateDerivedTask(task, {
                  completed: false,
                });
              }}
              onDismiss={task.source === "manual" ? undefined : () => updateDerivedTask(task, { dismissed: true, completed: false })}
              onDelete={task.source === "manual" ? () => removeManualTask(task.id) : undefined}
            />
          ))}
        </section>
      ) : null}

      {hiddenTasks.length ? (
        <section className="space-y-4">
          <SectionHeading
            eyebrow="Hidden"
            title="Derived tasks you chose to hide"
            description="Restore one if it belongs back in the working list."
          />
          {hiddenTasks.map((task) => (
            <HiddenTaskCard key={task.taskId} override={task} onRestore={() => restoreHiddenTask(task.taskId)} />
          ))}
        </section>
      ) : null}
    </div>
  );
}
