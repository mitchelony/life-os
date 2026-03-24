import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center px-4">
      <div className="rounded-[28px] border border-line bg-surface p-8 shadow-soft">
        <p className="text-[11px] uppercase tracking-[0.3em] text-muted">404</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">That screen is not in the MVP.</h1>
        <p className="mt-3 text-sm leading-6 text-muted">Use the dashboard or Settings to get back into the app.</p>
        <Link href="/dashboard" className="mt-6 inline-flex rounded-full bg-ink px-4 py-2.5 text-sm font-medium text-bg">
          Open dashboard
        </Link>
      </div>
    </main>
  );
}
