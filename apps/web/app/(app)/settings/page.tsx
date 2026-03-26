"use client";

import { ArrowRight, LogOut, RefreshCw, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ContextExportPanel } from "@/components/context-export-panel";
import { RoadmapImportPanel } from "@/components/roadmap-import-panel";
import { Button, Panel, SectionHeading, cn } from "@/components/ui";
import { OnboardingFlow } from "@/components/onboarding-flow";
import { signOut } from "@/lib/auth";
import { notifyDecisionChanged } from "@/lib/decision";
import { api } from "@/lib/api";
import { getSettingsSections, type SettingsSectionId } from "@/lib/settings-view";

export default function SettingsPage() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<SettingsSectionId>("roadmap_setup");
  const [relaunchPending, setRelaunchPending] = useState(false);
  const sections = getSettingsSections();

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
          description="Roadmap setup is built for easy GPT copy and paste. Onboarding edits the baseline records. Useful settings holds reset and session controls."
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
              eyebrow="Roadmap setup"
              title="Copy current context, let GPT draft, then paste the roadmap back"
              description="This flow is built for quick bulk setup. Export gives GPT the real ids and allowed values. Import takes the drafted roadmap JSON in one shot."
            />
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-[20px] border border-line bg-[rgba(244,241,233,0.82)] p-4">
                <p className="text-[10px] uppercase tracking-[0.22em] text-muted">1</p>
                <p className="mt-2 text-sm font-medium text-ink">Generate the context export</p>
                <p className="mt-2 text-sm leading-6 text-muted">Copy the exact ids, statuses, expected income, debts, obligations, accounts, and actions.</p>
              </div>
              <div className="rounded-[20px] border border-line bg-[rgba(244,241,233,0.82)] p-4">
                <p className="text-[10px] uppercase tracking-[0.22em] text-muted">2</p>
                <p className="mt-2 text-sm font-medium text-ink">Have GPT draft the roadmap JSON</p>
                <p className="mt-2 text-sm leading-6 text-muted">The export includes strict shapes and allowed values so GPT can update the right records without guessing names.</p>
              </div>
              <div className="rounded-[20px] border border-line bg-[rgba(244,241,233,0.82)] p-4">
                <p className="text-[10px] uppercase tracking-[0.22em] text-muted">3</p>
                <p className="mt-2 text-sm font-medium text-ink">Paste and import</p>
                <p className="mt-2 text-sm leading-6 text-muted">Bring goals, steps, paycheck plans, and allocations in together instead of rebuilding the roadmap one field at a time.</p>
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
              eyebrow="Planning memory"
              title="Relaunch planning without touching core records"
              description="This clears planning state, roadmap, actions, progress history, recent updates, transactions, and income history while preserving accounts, debts, and obligations."
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
                title="Keep roadmap control manual"
                description="The app can support smarter planner-owned drafts later, but live roadmap changes still happen only when you approve them."
              />
              <div className="rounded-[20px] border border-line bg-[rgba(244,241,233,0.82)] p-4">
                <div className="flex items-start gap-3">
                  <Sparkles className="mt-0.5 h-4 w-4 text-accent" />
                  <p className="text-sm leading-6 text-muted">Future cloud planning stays recommendation-first. Nothing silently rewrites your live roadmap.</p>
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
