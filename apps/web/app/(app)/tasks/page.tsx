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
    <div className="space-y-4 pb-24 md:space-y-6 md:pb-6">
      <Panel>
        <SectionHeading
          eyebrow="Tasks"
          title="Follow-ups for this week"
          description="Use Roadmap for your big plan. This page is for the bills, debt payments, and check-ins that still need your attention."
        />
      </Panel>
      {dashboard.roadmap.focus.nextStep ? (
        <Panel>
          <SectionHeading
            eyebrow="Roadmap focus"
            title={dashboard.roadmap.focus.nextStep.title}
            description={`${dashboard.roadmap.focus.whyNow} Open Roadmap if you want the full payment order and goal plan.`}
          />
        </Panel>
      ) : null}
      <section className="space-y-4">
        {dashboard.topPriorities.length ? (
          dashboard.topPriorities.map((task) => (
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
          ))
        ) : (
          <Panel>
            <SectionHeading
              eyebrow="Clear"
              title="Nothing else needs a separate follow-up right now"
              description="Your main direction is already covered in Roadmap. Come back here when you have bills, debt payments, or income check-ins to handle."
            />
          </Panel>
        )}
      </section>
    </div>
  );
}
