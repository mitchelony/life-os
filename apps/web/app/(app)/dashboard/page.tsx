"use client";

import { DashboardScreen } from "@/components/dashboard-screen";
import { Panel, SectionHeading } from "@/components/ui";
import { useDecisionSnapshot } from "@/lib/decision";

export default function DashboardPage() {
  const { snapshot, loading } = useDecisionSnapshot();

  if (loading || !snapshot) {
    return (
      <div className="space-y-4 pb-24 md:space-y-6 md:pb-6">
        <Panel>
          <SectionHeading eyebrow="Dashboard" title="Loading your finance OS" description="Pulling the latest free cash, action queue, and progress." />
        </Panel>
      </div>
    );
  }

  return <DashboardScreen snapshot={snapshot} />;
}
