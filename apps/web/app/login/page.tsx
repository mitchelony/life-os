"use client";

import { ArrowRight, Eye } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { FormEvent, ReactNode } from "react";
import { cn, Panel } from "@/components/ui";
import { hasAuthSession, signInWithPassword, signUpWithPassword, startGoogleSignIn } from "@/lib/auth";

function GoogleMark() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.229 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.96 3.04l5.657-5.657C34.047 6.053 29.288 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917Z" />
      <path fill="#FF3D00" d="M6.306 14.691 12.88 19.51C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.96 3.04l5.657-5.657C34.047 6.053 29.288 4 24 4c-7.682 0-14.41 4.337-17.694 10.691Z" />
      <path fill="#4CAF50" d="M24 44c5.186 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.145 35.091 26.715 36 24 36c-5.208 0-9.62-3.316-11.283-7.946l-6.525 5.025C9.438 39.556 16.227 44 24 44Z" />
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.05 12.05 0 0 1-4.084 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917Z" />
    </svg>
  );
}

function AuthField({
  label,
  children,
}: Readonly<{
  label: string;
  children: ReactNode;
}>) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-ink">{label}</span>
      {children}
    </label>
  );
}

const fieldClassName =
  "w-full rounded-2xl border border-line bg-white/88 px-4 py-3 text-sm text-ink outline-none transition placeholder:text-muted/70 focus:border-accent";

const previewSlides = [
  {
    eyebrow: "Spend view",
    title: "Know what is safe right now.",
    description: "See the one number that matters first, then the few things shaping it.",
    primaryLabel: "Available now",
    primaryValue: "-$239.71",
    detailRows: [
      { label: "Protected buffer", value: "$100" },
      { label: "Debt minimums", value: "$10" },
      { label: "Essentials left", value: "$25" },
    ],
  },
  {
    eyebrow: "Paycheck flow",
    title: "See what the next check needs to cover.",
    description: "Turn incoming money into a clear order instead of guessing under pressure.",
    primaryLabel: "Next paycheck",
    primaryValue: "$390.00",
    detailRows: [
      { label: "Buffer first", value: "$50" },
      { label: "Utilities", value: "$170" },
      { label: "Capital One", value: "$170" },
    ],
  },
  {
    eyebrow: "Roadmap focus",
    title: "Keep one next move in view.",
    description: "Roadmap stays focused on what gets paid first, not a noisy list of everything.",
    primaryLabel: "Focus",
    primaryValue: "Utilities catch-up",
    detailRows: [
      { label: "Target date", value: "Apr 30" },
      { label: "Status", value: "Active" },
      { label: "Next step", value: "Send first payment" },
    ],
  },
] as const;

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [activePreview, setActivePreview] = useState(0);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (hasAuthSession()) {
      router.replace("/dashboard");
    }
  }, [router]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActivePreview((current) => (current + 1) % previewSlides.length);
    }, 4200);
    return () => window.clearInterval(interval);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      if (mode === "signin") {
        await signInWithPassword(email.trim(), password);
        router.replace("/");
        return;
      }

      if (!agreed) {
        throw new Error("Please agree before creating your account");
      }

      const result = await signUpWithPassword(email.trim(), password, displayName.trim());
      if (result.needsEmailConfirmation) {
        setMessage("Your account was created. If Supabase email confirmation is on, check your inbox first, then sign in.");
        return;
      }

      router.replace("/");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to continue");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1380px] items-center px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <Panel className="w-full overflow-hidden p-0">
        <div className="grid gap-0 lg:grid-cols-[1.12fr_0.88fr]">
          <div className="relative overflow-hidden border-b border-line bg-[linear-gradient(180deg,rgba(61,111,94,0.16),rgba(255,255,255,0.38))] p-5 sm:p-6 lg:min-h-[820px] lg:border-b-0 lg:border-r lg:p-7">
            <div className="relative h-full overflow-hidden rounded-[28px] border border-line bg-[linear-gradient(180deg,rgba(61,111,94,0.24),rgba(255,255,255,0.2))] p-6 shadow-soft sm:p-7">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.3),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(61,111,94,0.16),transparent_26%)]" />
              <div className="absolute inset-x-8 top-24 h-36 rounded-[32px] bg-[radial-gradient(circle_at_top,rgba(61,111,94,0.14),transparent_70%)] blur-2xl" />

              <div className="relative z-10 flex h-full flex-col">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[2rem] font-semibold tracking-[0.18em] text-ink sm:text-[2.35rem]">LIFE OS</div>
                    <p className="mt-2 text-sm text-muted">Private money system</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push("/")}
                    className="inline-flex items-center gap-2 rounded-full border border-line bg-white/68 px-4 py-2 text-sm text-ink transition hover:bg-white"
                  >
                    Back home
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-10 max-w-lg">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-muted md:text-[11px] md:tracking-[0.28em]">Money view</p>
                  <p className="mt-4 text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
                    Clear the noise.
                    <br />
                    Keep the next move obvious.
                  </p>
                  <p className="mt-4 text-base leading-7 text-muted">
                    The preview cycles through the same patterns the app uses every day: safe-to-spend, paycheck order, and roadmap focus.
                  </p>
                </div>

                <div className="relative mt-8 flex-1 sm:mt-10">
                  <div className="relative w-full overflow-hidden rounded-[30px] border border-line bg-white/74 p-4 shadow-soft sm:p-5">
                    {previewSlides.map((slide, index) => {
                      const active = index === activePreview;
                      return (
                        <div
                          key={slide.eyebrow}
                          className={cn(
                            "transition duration-500 ease-out",
                            active ? "relative translate-y-0 opacity-100" : "pointer-events-none absolute inset-4 translate-y-4 opacity-0 sm:inset-5",
                          )}
                        >
                          <div className="rounded-[26px] border border-line bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(255,255,255,0.64))] p-5 sm:p-6">
                            <p className="text-[10px] uppercase tracking-[0.24em] text-muted md:text-[11px] md:tracking-[0.28em]">{slide.eyebrow}</p>
                            <div className="mt-5 rounded-[24px] bg-[linear-gradient(180deg,rgba(61,111,94,0.12),rgba(255,255,255,0.82))] p-5 sm:p-6">
                              <p className="max-w-sm text-2xl font-semibold leading-tight tracking-tight text-ink sm:text-3xl">{slide.title}</p>
                              <p className="mt-3 max-w-md text-sm leading-6 text-muted sm:text-base">{slide.description}</p>

                              <div className="mt-8 grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
                                <div className="rounded-[22px] border border-line bg-white/88 p-4 sm:p-5">
                                  <p className="text-[10px] uppercase tracking-[0.24em] text-muted">{slide.primaryLabel}</p>
                                  <div className="mt-3 text-3xl font-semibold tracking-tight text-ink tabular-nums sm:text-[2.6rem]">
                                    {slide.primaryValue}
                                  </div>
                                  <div className="mt-5 h-2 overflow-hidden rounded-full bg-black/5">
                                    <div
                                      className="h-full rounded-full bg-accent transition-all duration-700"
                                      style={{ width: `${68 + index * 8}%` }}
                                    />
                                  </div>
                                </div>

                                <div className="space-y-3">
                                  {slide.detailRows.map((row) => (
                                    <div key={row.label} className="rounded-[20px] border border-line bg-white/86 px-4 py-3.5">
                                      <p className="text-[10px] uppercase tracking-[0.2em] text-muted">{row.label}</p>
                                      <p className="mt-1 text-sm font-medium text-ink sm:text-base">{row.value}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-6 flex items-center gap-3">
                  {previewSlides.map((slide, index) => (
                    <button
                      key={slide.eyebrow}
                      type="button"
                      onClick={() => setActivePreview(index)}
                      className={cn(
                        "h-1.5 rounded-full transition-all",
                        index === activePreview ? "w-12 bg-accent" : "w-8 bg-black/10 hover:bg-black/20",
                      )}
                      aria-label={`Show ${slide.eyebrow}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[linear-gradient(180deg,rgba(255,255,255,0.74),rgba(255,255,255,0.56))] p-6 sm:p-8 lg:p-12 xl:p-14">
            <div className="mx-auto flex h-full max-w-[620px] items-center">
              <div className="w-full">
                <p className="text-[10px] uppercase tracking-[0.24em] text-muted md:text-[11px] md:tracking-[0.28em]">Owner Access</p>
                <h1 className="mt-4 text-4xl font-semibold tracking-tight text-ink sm:text-5xl xl:text-[3.7rem]">
                  {mode === "signin" ? "Sign in" : "Create an account"}
                </h1>
                <p className="mt-4 max-w-xl text-base leading-7 text-muted">
                  {mode === "signin" ? "Need an account?" : "Already have an account?"}{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode(mode === "signin" ? "signup" : "signin");
                      setError("");
                      setMessage("");
                    }}
                    className="font-medium text-ink underline underline-offset-4 transition hover:text-accent"
                  >
                    {mode === "signin" ? "Create one" : "Log in"}
                  </button>
                </p>

                <form className="mt-10 space-y-5 xl:mt-12 xl:space-y-6" onSubmit={handleSubmit}>
                  {mode === "signup" ? (
                    <AuthField label="Name">
                      <input
                        autoComplete="name"
                        className={fieldClassName}
                        value={displayName}
                        onChange={(event) => setDisplayName(event.target.value)}
                        placeholder="Life owner"
                      />
                    </AuthField>
                  ) : null}

                  <AuthField label="Email">
                    <input
                      autoComplete="email"
                      inputMode="email"
                      type="email"
                      className={fieldClassName}
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@example.com"
                    />
                  </AuthField>

                  <AuthField label="Password">
                    <div className="relative">
                      <input
                        autoComplete={mode === "signin" ? "current-password" : "new-password"}
                        type={showPassword ? "text" : "password"}
                        className={cn(fieldClassName, "pr-12")}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder={mode === "signin" ? "Enter your password" : "Create a password"}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((current) => !current)}
                        className="absolute inset-y-0 right-0 inline-flex w-12 items-center justify-center text-muted transition hover:text-ink"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                    </div>
                  </AuthField>

                  {mode === "signup" ? (
                    <label className="flex items-center gap-3 pt-1 text-sm text-muted">
                      <input
                        checked={agreed}
                        onChange={(event) => setAgreed(event.target.checked)}
                        type="checkbox"
                        className="h-5 w-5 rounded border border-line bg-white accent-[#102018]"
                      />
                      <span>
                        I agree to the <span className="font-medium text-ink underline underline-offset-4">Terms &amp; Conditions</span>
                      </span>
                    </label>
                  ) : null}

                  {message ? <p className="text-sm text-accent">{message}</p> : null}
                  {error ? <p className="text-sm text-[color:#9f2d2d]">{error}</p> : null}

                  <button
                    className="inline-flex w-full items-center justify-center rounded-full bg-accent px-4 py-4 text-base font-medium text-white shadow-[0_16px_28px_rgba(61,111,94,0.18)] transition hover:-translate-y-0.5 hover:bg-[#315a4c] disabled:cursor-not-allowed disabled:opacity-70"
                    disabled={saving}
                    type="submit"
                  >
                    {saving ? (mode === "signin" ? "Signing in..." : "Creating account...") : mode === "signin" ? "Sign in" : "Create account"}
                  </button>
                </form>

                <div className="mt-8 flex items-center gap-4 text-sm text-muted/80">
                  <span className="h-px flex-1 bg-black/10" />
                  <span>or continue with</span>
                  <span className="h-px flex-1 bg-black/10" />
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => {
                      setError("");
                      setMessage("");
                      try {
                        startGoogleSignIn();
                      } catch (nextError) {
                        setError(nextError instanceof Error ? nextError.message : "Unable to start Google sign-in");
                      }
                    }}
                    className="inline-flex items-center justify-center gap-3 rounded-2xl border border-line bg-white/88 px-4 py-3.5 text-sm font-medium text-ink transition hover:bg-white"
                  >
                    <GoogleMark />
                    Google
                  </button>
                  <div className="rounded-2xl border border-dashed border-line bg-white/42 px-4 py-3.5 text-sm text-muted">
                    Apple can be added later
                  </div>
                </div>

                <p className="mt-4 text-xs leading-5 text-muted">
                  Google sign-in works after you enable the Google provider and add this app’s callback URL in Supabase.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Panel>
    </main>
  );
}
