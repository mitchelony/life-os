"use client";

import React from "react";
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

type BaseProps = {
  children?: ReactNode;
  className?: string;
};

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function Panel({ children, className }: BaseProps) {
  return (
    <section
      className={cn(
        "rounded-[26px] border border-line bg-surface p-4 shadow-[0_18px_48px_rgba(20,35,29,0.07)] backdrop-blur-xl md:rounded-[30px] md:p-5",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  tone = "default",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  tone?: "default" | "inverse";
}) {
  const eyebrowClass = tone === "inverse" ? "text-white/70" : "text-muted";
  const titleClass = tone === "inverse" ? "text-white" : "text-ink";
  const descriptionClass = tone === "inverse" ? "text-white/78" : "text-muted";

  return (
    <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end sm:gap-4">
      <div className="space-y-1">
        {eyebrow ? <p className={cn("text-[10px] uppercase tracking-[0.24em] md:text-[11px] md:tracking-[0.28em]", eyebrowClass)}>{eyebrow}</p> : null}
        <h2 className={cn("text-lg font-semibold tracking-tight md:text-[1.3rem]", titleClass)}>{title}</h2>
        {description ? <p className={cn("max-w-2xl text-sm leading-6", descriptionClass)}>{description}</p> : null}
      </div>
      {action ? <div className="w-full shrink-0 sm:w-auto">{action}</div> : null}
    </div>
  );
}

const buttonStyles: Record<string, string> = {
  primary:
    "bg-ink text-bg shadow-[0_14px_30px_rgba(20,35,29,0.16)] hover:-translate-y-0.5 hover:bg-[#0f1a16]",
  secondary: "bg-accent text-white shadow-[0_12px_28px_rgba(51,95,83,0.16)] hover:-translate-y-0.5 hover:bg-[#294d43]",
  soft: "bg-accent-soft text-accent hover:bg-[rgba(51,95,83,0.2)]",
  ghost: "border border-line bg-white/60 text-ink hover:bg-white",
};

export function Button({
  children,
  className,
  variant = "primary",
  type = "button",
  ...props
}: BaseProps & {
  variant?: keyof typeof buttonStyles;
  type?: "button" | "submit" | "reset";
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition duration-200 ease-out active:scale-[0.99]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
        buttonStyles[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-[18px] border border-line bg-white/88 px-4 py-3 text-sm text-ink outline-none transition placeholder:text-muted/90 placeholder:transition-opacity focus:border-accent focus:placeholder:opacity-0",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full rounded-[18px] border border-line bg-white/88 px-4 py-3 text-sm text-ink outline-none transition placeholder:text-muted/90 placeholder:transition-opacity focus:border-accent focus:placeholder:opacity-0",
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & BaseProps) {
  return (
    <select
      className={cn(
        "w-full rounded-[18px] border border-line bg-white/88 px-4 py-3 text-sm text-ink outline-none transition focus:border-accent",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Badge({ children, className }: BaseProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-line bg-white/88 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-muted md:px-3 md:text-[11px] md:tracking-[0.22em]",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatCard({
  label,
  value,
  detail,
  className,
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-[22px] border border-line bg-[rgba(255,255,255,0.68)] p-4 md:rounded-[24px]", className)}>
      <p className="text-[10px] uppercase tracking-[0.2em] text-muted md:text-[11px] md:tracking-[0.24em]">{label}</p>
      <div className="mt-2 text-xl font-semibold tracking-tight text-ink tabular-nums md:text-[1.75rem]">{value}</div>
      {detail ? <div className="mt-1 text-xs leading-5 text-muted">{detail}</div> : null}
    </div>
  );
}

export function InlineField({
  label,
  children,
  helper,
  description,
  tone = "default",
}: {
  label: string;
  children: ReactNode;
  helper?: string;
  description?: string;
  tone?: "default" | "inverse";
}) {
  const labelClass = tone === "inverse" ? "text-white" : "text-ink";
  const helperClass = tone === "inverse" ? "text-white/72" : "text-muted";

  return (
    <label className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className={cn("text-sm font-medium", labelClass)}>{label}</span>
        {helper ? <span className={cn("text-xs", helperClass)}>{helper}</span> : null}
      </div>
      {description ? <p className={cn("text-xs leading-5", helperClass)}>{description}</p> : null}
      {children}
    </label>
  );
}

export function Segment({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="inline-flex flex-wrap rounded-[20px] border border-line bg-white/72 p-1">
      {options.map((option) => {
        const active = option === value;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={cn(
              "rounded-full px-3 py-2 text-sm transition md:px-4",
              active ? "bg-ink text-bg shadow-[0_8px_20px_rgba(20,35,29,0.12)]" : "text-muted hover:text-ink",
            )}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
