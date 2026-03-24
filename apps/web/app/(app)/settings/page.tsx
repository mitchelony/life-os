"use client";

import { Panel, SectionHeading } from "@/components/ui";
import { OnboardingFlow } from "@/components/onboarding-flow";

export default function SettingsPage() {
  return (
    <div className="space-y-4 pb-24 md:space-y-6 md:pb-6">
      <Panel className="hidden md:block">
        <SectionHeading
          eyebrow="Settings"
          title="Setup, guardrails, and app preferences"
          description="This is where you update the numbers and settings the app uses."
        />
      </Panel>
      <OnboardingFlow />
    </div>
  );
}
