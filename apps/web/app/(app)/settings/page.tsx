"use client";

import { ArrowRight, LogOut, RefreshCw, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useFeedback } from "@/components/feedback-provider";
import { ContextExportPanel } from "@/components/context-export-panel";
import { RoadmapImportPanel } from "@/components/roadmap-import-panel";
import { Badge, Button, Panel, SectionHeading, cn } from "@/components/ui";
import { OnboardingFlow } from "@/components/onboarding-flow";
import { signOut } from "@/lib/auth";
import { notifyDecisionChanged } from "@/lib/decision";
import { api } from "@/lib/api";
import { isOnboardingCompleteFromStart } from "@/lib/onboarding";
import { getDefaultSettingsSection, getSettingsSections, type SettingsSectionId } from "@/lib/settings-view";

export default function SettingsPage() {
  const router = useRouter();
  const { pushFeedback } = useFeedback();
  const [activeSection, setActiveSection] = useState<SettingsSectionId>("onboarding");
  const [relaunchPending, setRelaunchPending] = useState(false);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [settingsPending, setSettingsPending] = useState<string | null>(null);
  const sections = getSettingsSections();

  useEffect(() => {
    void api
      .listSettings()
      .then((items) => setSettings(Object.fromEntries(items.map((item) => [item.key, item.value]))))
      .catch(() => setSettings({}));
  }, []);

  useEffect(() => {
    let cancelled = false;

    void api
      .startOnboarding()
      .then((result) => {
        if (cancelled) return;
        setActiveSection(getDefaultSettingsSection(isOnboardingCompleteFromStart(result)));
      })
      .catch(() => {
        if (cancelled) return;
        setActiveSection(getDefaultSettingsSection(false));
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const dashboardPreferences = useMemo(
    () => ({
      showCashflow: settings.dashboard_show_cashflow !== "false",
      showMomentum: settings.dashboard_show_momentum !== "false",
      showRecentUpdates: settings.dashboard_show_recent_updates !== "false",
    }),
    [settings],
  );

  async function toggleDashboardPreference(key: "dashboard_show_cashflow" | "dashboard_show_momentum" | "dashboard_show_recent_updates", next: boolean) {
    setSettingsPending(key);
    try {
      await api.upsertSetting(key, String(next));
      setSettings((current) => ({ ...current, [key]: String(next) }));
      pushFeedback({
        tone: "success",
        title: next ? "Dashboard block shown." : "Dashboard block hidden.",
      });
    } catch (error) {
      pushFeedback({
        tone: "error",
        title: "Could not update dashboard setting.",
        description: error instanceof Error ? error.message : "Try again in a moment.",
      });
    } finally {
      setSettingsPending(null);
    }
  }

  async function handleSignOut() {
    await signOut();
    if (typeof window !== "undefined") {
      window.location.assign("/login");
      return;
    }
    router.replace("/login");
  }

  async function handleRelaunchPlanning() {
    setRelaunchPending(true);
    try {
      await api.relaunchPlanning();
      notifyDecisionChanged();
      pushFeedback({
        tone: "success",
        title: "Planning memory relaunched.",
      });
    } catch (error) {
      pushFeedback({
        tone: "error",
        title: "Could not relaunch planning memory.",
        description: error instanceof Error ? error.message : "Try again in a moment.",
      });
    } finally {
      setRelaunchPending(false);
    }
  }

  return (
    <div className="space-y-4 pb-24 md:space-y-6 md:pb-6">
      <Panel className="overflow-hidden bg-[linear-gradient(135deg,rgba(15,28,22,0.97),rgba(64,105,89,0.94))] text-bg">
        <SectionHeading
          eyebrow="Settings"
          title="Choose what you want to change"
          description="The Roadmap page is the main planning surface. Settings keeps onboarding, advanced planning tools, and utility controls."
          tone="inverse"
        />
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {sections.map((section) => {
            const active = section.id === activeSection;
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  "rounded-[24px] border px-4 py-4 text-left transition duration-200",
                  active
                    ? "border-white/20 bg-white text-ink shadow-soft"
                    : "border-white/12 bg-white/10 text-white hover:bg-white/14",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className={cn("text-[10px] uppercase tracking-[0.22em]", active ? "text-muted" : "text-white/68")}>
                      {section.id.replaceAll("_", " ")}
                    </p>
                    <p className="mt-2 text-lg font-semibold tracking-tight">{section.title}</p>
                    <p className={cn("mt-2 text-sm leading-6", active ? "text-muted" : "text-white/78")}>
                      {section.description}
                    </p>
                  </div>
                  <ArrowRight className={cn("mt-1 h-4 w-4 shrink-0", active ? "text-accent" : "text-white/72")} />
                </div>
              </button>
            );
          })}
        </div>
      </Panel>

      {activeSection === "roadmap_setup" ? (
        <div className="space-y-4">
          <Panel className="space-y-4">
            <SectionHeading
              eyebrow="Planning tools"
              title="Use advanced planning tools when you want more control"
              description="The Roadmap page is where the copilot takes the lead. These tools are here when you want to review or import the plan more directly."
            />
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-[20px] border border-line bg-[rgba(244,241,233,0.82)] p-4">
                <p className="text-[10px] uppercase tracking-[0.22em] text-muted">1</p>
                <p className="mt-2 text-sm font-medium text-ink">Export the current plan</p>
                <p className="mt-2 text-sm leading-6 text-muted">Pull the live ids, statuses, income, debts, bills, accounts, and actions when you want the full planning picture in one place.</p>
              </div>
              <div className="rounded-[20px] border border-line bg-[rgba(244,241,233,0.82)] p-4">
                <p className="text-[10px] uppercase tracking-[0.22em] text-muted">2</p>
                <p className="mt-2 text-sm font-medium text-ink">Shape the plan outside the page</p>
                <p className="mt-2 text-sm leading-6 text-muted">The export includes strict shapes and allowed values so the next version of the plan stays tied to the right records.</p>
              </div>
              <div className="rounded-[20px] border border-line bg-[rgba(244,241,233,0.82)] p-4">
                <p className="text-[10px] uppercase tracking-[0.22em] text-muted">3</p>
                <p className="mt-2 text-sm font-medium text-ink">Paste and import</p>
                <p className="mt-2 text-sm leading-6 text-muted">Bring goals, steps, income plans, and allocations in together when you want direct control over the payload.</p>
              </div>
            </div>
          </Panel>
          <ContextExportPanel />
          <RoadmapImportPanel
            onImported={async () => {
              notifyDecisionChanged();
            }}
          />
        </div>
      ) : null}

      {activeSection === "onboarding" ? <OnboardingFlow /> : null}

      {activeSection === "utilities" ? (
        <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <Panel className="space-y-4">
            <SectionHeading
              eyebrow="Dashboard preferences"
              title="Choose what the dashboard keeps in view"
              description="Hide sections you do not want competing for attention on the main screen."
            />
            <div className="grid gap-3">
              {[
                {
                  key: "dashboard_show_cashflow" as const,
                  title: "Cashflow block",
                  description: "Keep the short pressure and inflow view on the dashboard.",
                  active: dashboardPreferences.showCashflow,
                },
                {
                  key: "dashboard_show_momentum" as const,
                  title: "Momentum block",
                  description: "Show the 7-day progress comparison on the dashboard.",
                  active: dashboardPreferences.showMomentum,
                },
                {
                  key: "dashboard_show_recent_updates" as const,
                  title: "Recent updates block",
                  description: "Show the latest activity feed on the dashboard.",
                  active: dashboardPreferences.showRecentUpdates,
                },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between gap-4 rounded-[20px] border border-line bg-[rgba(244,241,233,0.82)] p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-ink">{item.title}</p>
                      <Badge>{item.active ? "shown" : "hidden"}</Badge>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted">{item.description}</p>
                  </div>
                  <Button
                    variant={item.active ? "secondary" : "ghost"}
                    disabled={settingsPending === item.key}
                    onClick={() => void toggleDashboardPreference(item.key, !item.active)}
                  >
                    {item.active ? "Hide" : "Show"}
                  </Button>
                </div>
              ))}
            </div>
          </Panel>

          <Panel className="space-y-4">
            <SectionHeading
              eyebrow="Planning memory"
              title="Relaunch planning without touching core records"
              description="This clears planning state, roadmap, actions, progress history, recent updates, and transactions while preserving accounts, debts, bills, and expected income."
            />
            <div className="rounded-[20px] border border-[rgba(165,57,42,0.18)] bg-[rgba(165,57,42,0.06)] p-4">
              <p className="text-sm leading-6 text-ink">Use this when you want a clean planning restart but do not want to lose your core financial records.</p>
              <Button className="mt-4" disabled={relaunchPending} onClick={() => void handleRelaunchPlanning()}>
                <RefreshCw className="h-4 w-4" />
                {relaunchPending ? "Relaunching..." : "Relaunch planning memory"}
              </Button>
            </div>
          </Panel>

          <div className="space-y-4">
            <Panel className="space-y-4">
            <SectionHeading
              eyebrow="Planner boundary"
              title="Keep roadmap control approval-first"
              description="The copilot can draft smarter replacements, but live roadmap changes still happen only when you approve them."
            />
              <div className="rounded-[20px] border border-line bg-[rgba(244,241,233,0.82)] p-4">
                <div className="flex items-start gap-3">
                  <Sparkles className="mt-0.5 h-4 w-4 text-accent" />
                  <p className="text-sm leading-6 text-muted">Nothing silently rewrites your live roadmap or ledger truth. Drafts stay recommendation-first until you approve them.</p>
                </div>
              </div>
            </Panel>

            <Panel className="space-y-4">
              <SectionHeading
                eyebrow="Session"
                title="Leave this device"
                description="Sign out and go straight back to the login screen."
              />
              <Button
                variant="ghost"
                onClick={() => {
                  void handleSignOut();
                }}
              >
                <LogOut className="h-4 w-4" />
                Log out
              </Button>
            </Panel>
          </div>
        </div>
      ) : null}
    </div>
  );
}
