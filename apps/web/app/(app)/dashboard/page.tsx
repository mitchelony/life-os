"use client";

import { DashboardScreen } from "@/components/dashboard-screen";
import { useLifeOsDashboard } from "@/lib/local-state";

export default function DashboardPage() {
  const dashboard = useLifeOsDashboard();
  return <DashboardScreen dashboard={dashboard} />;
}
