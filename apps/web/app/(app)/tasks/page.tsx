"use client";

import { Badge, Panel, SectionHeading } from "@/components/ui";
import { useLifeOsDashboard } from "@/lib/local-state";

function dueLabel(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

export default function TasksPage() {
  const dashboard = useLifeOsDashboard();

  return (
    <div className="space-y-6 pb-24 md:pb-6">
      <Panel>
        <SectionHeading eyebrow="Tasks" title="What matters this week" description="Non-financial and linked life admin stay in one calm list." />
      </Panel>
      {dashboard.roadmap.focus.nextStep ? (
        <Panel>
          <SectionHeading
            eyebrow="Guidance"
            title={dashboard.roadmap.focus.nextStep.title}
            description={dashboard.roadmap.focus.whyNow}
          />
        </Panel>
      ) : null}
      <section className="space-y-4">
        {dashboard.topPriorities.map((task) => (
          <Panel key={task.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-muted">{task.linkedTo ?? "Task"}</p>
                <h2 className="mt-2 text-xl font-semibold tracking-tight">{task.title}</h2>
                <p className="mt-1 text-sm text-muted">{dueLabel(task.dueDate)}</p>
              </div>
              <Badge>{task.priority}</Badge>
            </div>
          </Panel>
        ))}
      </section>
    </div>
  );
}
