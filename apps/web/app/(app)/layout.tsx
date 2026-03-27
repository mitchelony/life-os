import { AuthGate } from "@/components/auth-gate";
import { AppShell } from "@/components/app-shell";
import { FeedbackProvider } from "@/components/feedback-provider";
import type { ReactNode } from "react";

export default function AppLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <AuthGate>
      <FeedbackProvider>
        <AppShell>{children}</AppShell>
      </FeedbackProvider>
    </AuthGate>
  );
}
