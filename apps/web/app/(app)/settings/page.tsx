"use client";

import { useRouter } from "next/navigation";
import { Panel, SectionHeading } from "@/components/ui";
import { OnboardingFlow } from "@/components/onboarding-flow";
import { signOut } from "@/lib/auth";

export default function SettingsPage() {
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    if (typeof window !== "undefined") {
      window.location.assign("/login");
      return;
    }
    router.replace("/login");
  }

  return (
    <div className="space-y-4 pb-24 md:space-y-6 md:pb-6">
      <Panel>
        <SectionHeading
          eyebrow="Settings"
          title="Setup, guardrails, and app preferences"
          description="This is where you update the numbers and settings the app uses."
          action={
            <button
              type="button"
              onClick={() => {
                void handleSignOut();
              }}
              className="inline-flex min-h-[2.75rem] w-full items-center justify-center rounded-full border border-line bg-transparent px-4 py-2.5 text-sm font-medium text-ink transition duration-200 hover:-translate-y-0.5 hover:bg-black/5 sm:w-auto"
            >
              Log out
            </button>
          }
        />
      </Panel>
      <OnboardingFlow />
    </div>
  );
}
