"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { DashboardScreen } from "@/components/dashboard-screen";
import { Panel, SectionHeading } from "@/components/ui";
import { api, type BackendAppSetting } from "@/lib/api";
import { useDecisionSnapshot } from "@/lib/decision";
import { demoPlanKey } from "@/lib/local-state";

export default function DashboardPage() {
  const router = useRouter();
  const { snapshot, loading } = useDecisionSnapshot();
  const [settings, setSettings] = useState<BackendAppSetting[]>([]);
  const [showSamplePlanBanner, setShowSamplePlanBanner] = useState(false);

  useEffect(() => {
    void api.listSettings().then(setSettings).catch(() => setSettings([]));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setShowSamplePlanBanner(window.localStorage.getItem(demoPlanKey) === "student");
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
          <SectionHeading eyebrow="Dashboard" title="Loading your plan" description="Pulling your safe-to-spend number, next move, and latest roadmap signal." />
        </Panel>
      </div>
    );
  }

  return (
    <DashboardScreen
      snapshot={snapshot}
      preferences={preferences}
      showSamplePlanBanner={showSamplePlanBanner}
      onResetSamplePlan={() => {
        if (typeof window !== "undefined") {
          window.localStorage.removeItem(demoPlanKey);
        }
        setShowSamplePlanBanner(false);
        router.push("/settings");
      }}
    />
  );
}
