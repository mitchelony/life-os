"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Panel } from "@/components/ui";
import { consumeAuthCallbackFromLocation } from "@/lib/auth";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    const result = consumeAuthCallbackFromLocation();
    if (result.ok) {
      router.replace("/");
      return;
    }
    setError(result.error);
  }, [router]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl items-center px-4 py-10">
      <Panel className="w-full p-6 sm:p-8">
        <Badge>Life OS</Badge>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink">{error ? "Sign-in problem" : "Finishing sign-in"}</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          {error ? error : "Hold on for a moment while we finish your sign-in and bring you back into the app."}
        </p>
      </Panel>
    </main>
  );
}
