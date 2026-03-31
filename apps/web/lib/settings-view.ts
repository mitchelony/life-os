export type SettingsSectionId = "roadmap_setup" | "onboarding" | "utilities";

const settingsSections = [
  {
    id: "roadmap_setup",
    title: "Planning tools",
    description: "Review or import the plan directly when you want more control than the copilot flow.",
  },
  {
    id: "onboarding",
    title: "Onboarding",
    description: "Edit the baseline accounts, obligations, debts, income, and guardrails the app starts from.",
  },
  {
    id: "utilities",
    title: "Useful settings",
    description: "Reset planning memory, keep changes approval-first, and manage the current session.",
  },
] as const satisfies ReadonlyArray<{
  id: SettingsSectionId;
  title: string;
  description: string;
}>;

export function getSettingsSections() {
  return [...settingsSections];
}

export function getDefaultSettingsSection(isOnboardingComplete: boolean): SettingsSectionId {
  return isOnboardingComplete ? "roadmap_setup" : "onboarding";
}
