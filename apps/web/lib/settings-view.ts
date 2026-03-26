export type SettingsSectionId = "roadmap_setup" | "onboarding" | "utilities";

const settingsSections = [
  {
    id: "roadmap_setup",
    title: "Roadmap setup",
    description: "Copy your live context, let GPT draft the plan, then paste the import JSON back in one shot.",
  },
  {
    id: "onboarding",
    title: "Onboarding",
    description: "Edit the baseline accounts, obligations, debts, income, and guardrails the app starts from.",
  },
  {
    id: "utilities",
    title: "Useful settings",
    description: "Relaunch planning memory, keep planner control manual, and manage the current session.",
  },
] as const satisfies ReadonlyArray<{
  id: SettingsSectionId;
  title: string;
  description: string;
}>;

export function getSettingsSections() {
  return [...settingsSections];
}
