import Link from "next/link";
import { requireAdmin } from "@/lib/admin/session";
import { allSchoolTotals, listSchoolOrders, type SchoolOrder } from "@/lib/school-designs/orders";
import { designCode, listDesigns } from "@/lib/school-designs/store";
import { listSchoolRequests } from "@/lib/school-requests";
import { SCHOOL_CHECKOUT_OPEN } from "@/config/school-checkout";
import { AdminShell, Card, Empty, schoolName, StatusPill, Table, usd, when } from "@/components/admin/AdminShell";

// Overview: what needs a person, then how things stand. The first block is the
// point of the page — a HELD order is one the system refused to print, and a paid
// order not sent after an hour means production email is failing.

const WEEK = 7 * 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

/** The moment this request is rendered. The page is dynamic (rendered fresh on
 *  every visit, never cached), so "this week" and "over an hour" are measured
 *  from the visit itself. */
function renderedAt(): number {
  return Date.now();
}

export default async function AdminOverview() {
  const email = await requireAdmin();
  const [orders, totals, designs, requests] = await Promise.all([
    listSchoolOrders({ limit: 5000 }).catch(() => [] as SchoolOrder[]),
    allSchoolTotals().catch(() => []),
    listDesigns(5000),
    listSchoolRequests(5000),
  ]);
  const now = renderedAt();
  const held = orders.filter((o) => o.status === "held" && o.refundedAt === null);
  const stuck = orders.filter((o) => o.status === "paid" && o.paidAt !== null && now - o.paidAt > HOUR);
  const attention = [...held, ...stuck];
  const raised = totals.reduce((s, t) => s + t.raisedCents, 0);
  const frames = totals.reduce((s, t) => s + t.frames, 0);
  const raisingSchools = totals.filter((t) => t.raisedCents > 0).length;

  return (
    <AdminShell email={email} active="/admin" title="Overview">
      {!SCHOOL_CHECKOUT_OPEN && (
        <p className="mb-4 rounded-lg bg-stone-200/70 p-3 text-[13px] text-stone-700">
          School checkout is <strong>off</strong>. Parents can design and send; nobody can pay yet. Launch steps:
          tasks/checkout-launch-checklist.md.
        </p>
      )}

      <h2 className="mb-2 text-[15px] font-semibold">Needs attention</h2>
      {attention.length === 0 ? (
        <Empty>Nothing needs you right now.</Empty>
      ) : (
        <Table head={["Order", "School", "Status", "Why", "Paid"]}>
          {attention.map((o) => (
            <tr key={o.orderId}>
              <td className="px-3 py-2">
                <Link className="whitespace-nowrap font-mono underline" href={`/admin/designs/${o.designId}`}>
                  {designCode(o.designId)} r{o.revision}
                </Link>
              </td>
              <td className="px-3 py-2">{schoolName(o.school)}</td>
              <td className="px-3 py-2"><StatusPill status={o.status} /></td>
              <td className="px-3 py-2 text-[13px] text-stone-600">
                {o.status === "held" ? o.lastError ?? "Held for a check" : `Paid ${when(o.paidAt)} and not sent — check the production email. ${o.lastError ?? ""}`}
              </td>
              <td className="px-3 py-2">{when(o.paidAt)}</td>
            </tr>
          ))}
        </Table>
      )}

      <h2 className="mb-2 mt-6 text-[15px] font-semibold">How things stand</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card label="Frames sold" value={frames} note="Paid, not refunded" />
        <Card label="Raised for schools" value={usd(raised)} note={`${raisingSchools} school${raisingSchools === 1 ? "" : "s"}`} />
        <Card label="Designs sent this week" value={designs.filter((d) => now - d.updatedAt < WEEK).length} note={`${designs.length} saved in all`} />
        <Card label="School requests this week" value={requests.filter((r) => now - r.createdAt < WEEK).length} note={`${requests.length} in all`} />
      </div>

      <h2 className="mb-2 mt-6 text-[15px] font-semibold">Latest designs</h2>
      {designs.length === 0 ? (
        <Empty>No designs sent yet.</Empty>
      ) : (
        <Table head={["Design", "School", "From", "Versions", "Last change"]}>
          {designs.slice(0, 8).map((d) => (
            <tr key={d.id}>
              <td className="px-3 py-2">
                <Link className="whitespace-nowrap font-mono underline" href={`/admin/designs/${d.id}`}>{d.code}</Link>
              </td>
              <td className="px-3 py-2">{schoolName(d.school)}</td>
              <td className="px-3 py-2">{d.contact?.email ?? "— (a Buy; Stripe has it)"}</td>
              <td className="px-3 py-2">{d.revisions}</td>
              <td className="px-3 py-2">{when(d.updatedAt)}</td>
            </tr>
          ))}
        </Table>
      )}
    </AdminShell>
  );
}
