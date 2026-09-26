import type { Metadata } from "next";

export const metadata: Metadata = { title: "Sign in" };

// The page the emailed sign-in link opens. Opening it spends NOTHING — the
// button does (POST /api/admin/verify). Mail filters that open links to scan
// them therefore cannot use up a one-time link before the person clicks it.

export default async function AdminVerifyPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  const token = typeof t === "string" && /^[A-Za-z0-9_-]{43}$/.test(t) ? t : null;
  return (
    <div className="flex min-h-dvh items-center justify-center bg-stone-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <p className="text-[13px] font-semibold uppercase tracking-wide text-[#1b2a4a]">MySchoolFrame · Staff</p>
        <h1 className="mt-1 text-[22px] font-semibold text-stone-900">Sign in to the dashboard</h1>
        {token ? (
          <form action="/api/admin/verify" method="post" className="mt-4">
            <input type="hidden" name="t" value={token} />
            <button type="submit" className="h-11 w-full rounded-lg bg-[#1b2a4a] text-[15px] font-semibold text-white">
              Sign in
            </button>
            <p className="mt-2 text-[13px] text-stone-600">This link works once and expires 15 minutes after it was sent.</p>
          </form>
        ) : (
          <p className="mt-3 text-[14px] text-stone-600">
            This sign-in link isn&apos;t complete. <a href="/admin/login" className="underline">Ask for a new one</a>.
          </p>
        )}
      </div>
    </div>
  );
}
