"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Panel } from "@/components/ui";
import { consumeAuthCallbackFromLocation, hasAuthSession } from "@/lib/auth";
import { getAuthCallbackRecoveryAction, type AuthCallbackRecoveryAction } from "@/lib/auth-callback";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [recoveryAction, setRecoveryAction] = useState<AuthCallbackRecoveryAction | null>(null);

  useEffect(() => {
    const result = consumeAuthCallbackFromLocation();
    if (result.ok) {
      router.replace("/");
      return;
    }
    setError(result.error);
    setRecoveryAction(getAuthCallbackRecoveryAction(hasAuthSession()));
  }, [router]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl items-center px-4 py-10">
      <Panel className="w-full p-6 sm:p-8">
        <Badge>Life OS</Badge>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink">{error ? "Sign-in problem" : "Finishing sign-in"}</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          {error ? error : "Hold on for a moment while we finish your sign-in and bring you back into the app."}
        </p>
        {recoveryAction ? (
          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              onClick={() => {
                router.replace(recoveryAction.href);
              }}
            >
              {recoveryAction.label}
            </Button>
          </div>
        ) : null}
      </Panel>
    </main>
  );
}
