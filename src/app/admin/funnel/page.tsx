import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin/session";
import { funnel, FUNNEL_STEPS, type FunnelRow, type FunnelStep } from "@/lib/school-designs/funnel";
import { AdminShell, Card, Empty, schoolName, Table } from "@/components/admin/AdminShell";

export const metadata: Metadata = { title: "Funnel" };

// "Of the parents who scanned, how many bought?" — per school and per QR
// placement. Scans count scans; every later step counts distinct browsers
// (anonymous; lib/school-designs/funnel).

const LABEL: Record<FunnelStep, string> = {
  scan: "Scanned",
  open: "Opened",
  engage: "Tried it",
  send: "Sent",
  checkout: "Checkout",
  paid: "Bought",
};

const pct = (n: number, of: number) => (of > 0 ? `${Math.round((n / of) * 100)}%` : "—");

export default async function AdminFunnel({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  const email = await requireAdmin();
  const { d } = await searchParams;
  const days = d === "7" ? 7 : d === "90" ? 90 : 30;
  const rows = await funnel(days).catch(() => [] as FunnelRow[]);
  const qr = rows.filter((r) => r.placement !== "direct");
  const scans = qr.reduce((s, r) => s + r.steps.scan, 0);
  const qrBought = qr.reduce((s, r) => s + r.steps.paid, 0);
  const qrSent = qr.reduce((s, r) => s + r.steps.send, 0);

  return (
    <AdminShell email={email} active="/admin/funnel" title="Funnel">
      <div className="mb-4 flex flex-wrap items-center gap-2 text-[13px]">
        {[7, 30, 90].map((n) => (
          <Link
            key={n}
            href={`/admin/funnel?d=${n}`}
            className={`rounded-md px-3 py-1.5 ${n === days ? "bg-[#1b2a4a] font-semibold text-white" : "border border-stone-300 bg-white"}`}
          >
            Last {n} days
          </Link>
        ))}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card label="QR scans" value={scans} />
        <Card label="Scan → sent a design" value={pct(qrSent, scans)} note={`${qrSent} sent`} />
        <Card label="Scan → bought" value={pct(qrBought, scans)} note={`${qrBought} bought`} />
        <Card label="Schools with activity" value={new Set(rows.map((r) => r.school)).size} />
      </div>

      <p className="mb-3 text-[13px] text-stone-600">
        Each QR code is <code>myschoolframe.com/q/&lt;school&gt;/&lt;placement&gt;</code> — the placement names where it was
        printed (card, bleachers, newsletter). &ldquo;Direct&rdquo; is everyone who arrived another way. Percentages are of the
        step before; the last column is of scans.
      </p>

      {rows.length === 0 ? (
        <Empty>No visits recorded yet in this period.</Empty>
      ) : (
        <Table head={["School", "From", ...FUNNEL_STEPS.map((s) => LABEL[s]), "Scan → bought"]}>
          {rows.map((r) => (
            <tr key={`${r.school}|${r.placement}`}>
              <td className="px-3 py-2">{schoolName(r.school)}</td>
              <td className="px-3 py-2 whitespace-nowrap">{r.placement === "direct" ? "Direct" : `QR · ${r.placement}`}</td>
              {FUNNEL_STEPS.map((s, i) => (
                <td key={s} className="px-3 py-2 whitespace-nowrap">
                  {r.placement === "direct" && s === "scan" ? "—" : r.steps[s]}
                  {i > 1 && (
                    <span className="block text-[11px] text-stone-500">{pct(r.steps[s], r.steps[FUNNEL_STEPS[i - 1]])}</span>
                  )}
                </td>
              ))}
              <td className="px-3 py-2 font-semibold">{r.placement === "direct" ? "—" : pct(r.steps.paid, r.steps.scan)}</td>
            </tr>
          ))}
        </Table>
      )}
    </AdminShell>
  );
}
