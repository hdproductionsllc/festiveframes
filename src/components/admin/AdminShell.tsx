import Link from "next/link";
import { resolveSchoolKit } from "@/data/school-resolve";

// ─── The staff dashboard's frame ─────────────────────────────────────────────
// Plain on purpose: a working tool for Henry and Bill, readable on a phone, with
// nothing that could be mistaken for a customer page. Server component.

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/schools", label: "Schools" },
  { href: "/admin/designs", label: "Sent designs" },
  { href: "/admin/requests", label: "School requests" },
];

export function AdminShell({
  email,
  active,
  title,
  children,
}: {
  email: string;
  active: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-stone-50 text-stone-900">
      <header className="bg-[#1b2a4a] text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-3">
          <p className="text-[15px] font-semibold tracking-wide">MySchoolFrame · Staff</p>
          <div className="flex items-center gap-3 text-[13px]">
            <span className="opacity-80">{email}</span>
            <form action="/api/admin/logout" method="post">
              <button type="submit" className="rounded-md border border-white/40 px-2.5 py-1 hover:bg-white/10">
                Sign out
              </button>
            </form>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-2 pb-2">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={
                "whitespace-nowrap rounded-md px-3 py-1.5 text-[14px] " +
                (n.href === active ? "bg-white text-[#1b2a4a] font-semibold" : "text-white/85 hover:bg-white/10")
              }
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <h1 className="mb-4 text-[22px] font-semibold">{title}</h1>
        {children}
      </main>
    </div>
  );
}

// ─── Small shared pieces ─────────────────────────────────────────────────────

export const usd = (cents: number | null | undefined) =>
  cents == null ? "—" : `$${(cents / 100).toFixed(2)}`;

export const when = (ms: number | null | undefined) =>
  ms == null
    ? "—"
    : new Date(ms).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone: "America/Chicago",
      });

/** A school's display name from its slug (authored kit or national roster). */
export function schoolName(slug: string | null): string {
  if (!slug) return "—";
  return resolveSchoolKit(slug)?.schoolName ?? slug;
}

const STATUS_STYLE: Record<string, string> = {
  held: "bg-red-100 text-red-800",
  paid: "bg-amber-100 text-amber-900",
  sent: "bg-emerald-100 text-emerald-800",
  awaiting_payment: "bg-stone-200 text-stone-700",
  refunded: "bg-stone-200 text-stone-700 line-through",
};
const STATUS_LABEL: Record<string, string> = {
  held: "Held — look at it",
  paid: "Paid, not sent yet",
  sent: "Sent to production",
  awaiting_payment: "Checkout started",
  refunded: "Refunded",
};

export function StatusPill({ status }: { status: string }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[12px] font-semibold ${STATUS_STYLE[status] ?? "bg-stone-200"}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

export function Card({ label, value, note, tone }: { label: string; value: string | number; note?: string; tone?: "alert" }) {
  return (
    <div className={`rounded-xl border bg-white p-4 ${tone === "alert" ? "border-red-300" : "border-stone-200"}`}>
      <p className="text-[13px] text-stone-500">{label}</p>
      <p className={`mt-1 text-[26px] font-semibold ${tone === "alert" ? "text-red-700" : ""}`}>{value}</p>
      {note && <p className="mt-1 text-[12px] text-stone-500">{note}</p>}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-dashed border-stone-300 bg-white p-6 text-center text-[14px] text-stone-500">{children}</p>;
}

/** A table that scrolls sideways on a phone instead of squashing. */
export function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
      <table className="w-full min-w-[640px] text-left text-[14px]">
        <thead className="border-b border-stone-200 bg-stone-100 text-[12px] uppercase tracking-wide text-stone-500">
          <tr>
            {head.map((h) => (
              <th key={h} className="px-3 py-2 font-semibold">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">{children}</tbody>
      </table>
    </div>
  );
}
