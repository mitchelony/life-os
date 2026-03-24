"use client";

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
        "rounded-[28px] border border-line bg-surface p-5 shadow-soft backdrop-blur-xl",
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
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div className="space-y-1">
        {eyebrow ? <p className="text-[11px] uppercase tracking-[0.28em] text-muted">{eyebrow}</p> : null}
        <h2 className="text-lg font-semibold tracking-tight text-ink">{title}</h2>
        {description ? <p className="max-w-2xl text-sm leading-6 text-muted">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

const buttonStyles: Record<string, string> = {
  primary:
    "bg-ink text-bg shadow-[0_16px_28px_rgba(16,32,24,0.18)] hover:-translate-y-0.5 hover:bg-[#0c1511]",
  secondary: "bg-accent text-white hover:-translate-y-0.5 hover:bg-[#315a4c]",
  soft: "bg-accent-soft text-accent hover:bg-[rgba(61,111,94,0.22)]",
  ghost: "border border-line bg-transparent text-ink hover:bg-black/5",
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
        "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition duration-200 ease-out",
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
        "w-full rounded-2xl border border-line bg-white/88 px-4 py-3 text-sm text-ink outline-none transition placeholder:text-muted/90 placeholder:transition-opacity focus:border-accent focus:placeholder:opacity-0",
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
        "w-full rounded-2xl border border-line bg-white/88 px-4 py-3 text-sm text-ink outline-none transition placeholder:text-muted/90 placeholder:transition-opacity focus:border-accent focus:placeholder:opacity-0",
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
        "w-full rounded-2xl border border-line bg-white/88 px-4 py-3 text-sm text-ink outline-none transition focus:border-accent",
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
        "inline-flex items-center gap-1 rounded-full border border-line bg-white/88 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-muted",
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
    <div className={cn("rounded-[24px] border border-line bg-white/70 p-4", className)}>
      <p className="text-[11px] uppercase tracking-[0.24em] text-muted">{label}</p>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-ink tabular-nums">{value}</div>
      {detail ? <div className="mt-1 text-xs leading-5 text-muted">{detail}</div> : null}
    </div>
  );
}

export function InlineField({
  label,
  children,
  helper,
  description,
}: {
  label: string;
  children: ReactNode;
  helper?: string;
  description?: string;
}) {
  return (
    <label className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-ink">{label}</span>
        {helper ? <span className="text-xs text-muted">{helper}</span> : null}
      </div>
      {description ? <p className="text-xs leading-5 text-muted">{description}</p> : null}
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
    <div className="inline-flex rounded-full border border-line bg-white/70 p-1">
      {options.map((option) => {
        const active = option === value;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={cn(
              "rounded-full px-4 py-2 text-sm transition",
              active ? "bg-ink text-bg shadow-sm" : "text-muted hover:text-ink",
            )}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
