"use client";

import { useEffect, useMemo, useState } from "react";
import { DashboardScreen } from "@/components/dashboard-screen";
import { Panel, SectionHeading } from "@/components/ui";
import { api, type BackendAppSetting } from "@/lib/api";
import { useDecisionSnapshot } from "@/lib/decision";

export default function DashboardPage() {
  const { snapshot, loading } = useDecisionSnapshot();
  const [settings, setSettings] = useState<BackendAppSetting[]>([]);

  useEffect(() => {
    void api.listSettings().then(setSettings).catch(() => setSettings([]));
  }, []);

  const preferences = useMemo(() => {
    const values = new Map(settings.map((item) => [item.key, item.value]));
    return {
      showCashflow: values.get("dashboard_show_cashflow") !== "false",
      showMomentum: values.get("dashboard_show_momentum") !== "false",
      showRecentUpdates: values.get("dashboard_show_recent_updates") !== "false",
    };
  }, [settings]);

  if (loading || !snapshot) {
    return (
      <div className="space-y-4 pb-24 md:space-y-6 md:pb-6">
        <Panel>
          <SectionHeading eyebrow="Dashboard" title="Loading your finance OS" description="Pulling the latest free cash, action queue, and progress." />
        </Panel>
      </div>
    );
  }

  return <DashboardScreen snapshot={snapshot} preferences={preferences} />;
}
