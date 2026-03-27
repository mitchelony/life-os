"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { cn } from "@/components/ui";

type FeedbackTone = "success" | "error" | "info";

type FeedbackItem = {
  id: number;
  title: string;
  description?: string;
  tone: FeedbackTone;
};

type FeedbackInput = {
  title: string;
  description?: string;
  tone?: FeedbackTone;
};

type FeedbackContextValue = {
  pushFeedback: (input: FeedbackInput) => void;
};

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

const toneStyles: Record<FeedbackTone, string> = {
  success: "border-[rgba(47,107,82,0.18)] bg-[rgba(246,252,248,0.96)] text-ink",
  error: "border-[rgba(165,57,42,0.18)] bg-[rgba(255,248,246,0.98)] text-ink",
  info: "border-line bg-[rgba(255,255,255,0.96)] text-ink",
};

const toneLabelStyles: Record<FeedbackTone, string> = {
  success: "text-success",
  error: "text-[#8a3022]",
  info: "text-accent",
};

export function FeedbackProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const idRef = useRef(0);

  const removeFeedback = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const pushFeedback = useCallback(
    ({ title, description, tone = "info" }: FeedbackInput) => {
      const id = ++idRef.current;
      setItems((current) => [...current, { id, title, description, tone }]);
      window.setTimeout(() => {
        removeFeedback(id);
      }, 2800);
    },
    [removeFeedback],
  );

  const value = useMemo(() => ({ pushFeedback }), [pushFeedback]);

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(5.4rem+env(safe-area-inset-bottom))] z-[70] flex justify-center px-3 md:inset-x-auto md:bottom-5 md:right-5 md:justify-end">
        <div className="flex w-full max-w-sm flex-col gap-2">
          {items.map((item) => (
            <div
              key={item.id}
              className={cn(
                "pointer-events-auto rounded-[22px] border px-4 py-3 shadow-[0_16px_32px_rgba(20,35,29,0.12)] backdrop-blur-xl",
                toneStyles[item.tone],
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className={cn("text-[10px] font-semibold uppercase tracking-[0.22em]", toneLabelStyles[item.tone])}>{item.tone}</p>
                  <p className="mt-1 text-sm font-medium text-ink">{item.title}</p>
                  {item.description ? <p className="mt-1 text-sm leading-6 text-muted">{item.description}</p> : null}
                </div>
                <button type="button" onClick={() => removeFeedback(item.id)} className="rounded-full p-1 text-muted transition hover:bg-white/80 hover:text-ink">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error("useFeedback must be used inside FeedbackProvider");
  }
  return context;
}
