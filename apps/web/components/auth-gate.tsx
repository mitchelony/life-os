"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { hasAuthSession, watchStoredAuthSession } from "@/lib/auth";
import type { ReactNode } from "react";

export function AuthGate({ children }: Readonly<{ children: ReactNode }>) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    const sync = () => {
      const nextSignedIn = hasAuthSession();
      setSignedIn(nextSignedIn);
      setReady(true);
      if (!nextSignedIn && pathname !== "/login") {
        router.replace("/login");
      }
    };

    sync();
    return watchStoredAuthSession(sync);
  }, [pathname, router]);

  if (!ready || !signedIn) return null;
  return <>{children}</>;
}
