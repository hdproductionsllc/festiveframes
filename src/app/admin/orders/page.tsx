import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin/session";
import { listSchoolOrders, type SchoolOrder } from "@/lib/school-designs/orders";
import { designCode } from "@/lib/school-designs/store";
import { AdminShell, Empty, schoolName, StatusPill, Table, usd, when } from "@/components/admin/AdminShell";

export const metadata: Metadata = { title: "Orders" };

export default async function AdminOrders() {
  const email = await requireAdmin();
  const orders = await listSchoolOrders({ limit: 500 }).catch(() => [] as SchoolOrder[]);
  return (
    <AdminShell email={email} active="/admin/orders" title="Orders">
      {orders.length === 0 ? (
        <Empty>No orders yet. An order appears here the moment a parent starts checkout.</Empty>
      ) : (
        <Table head={["Started", "Design", "School", "Status", "Paid", "To school", "Tries"]}>
          {orders.map((o) => (
            <tr key={o.orderId}>
              <td className="px-3 py-2 whitespace-nowrap">{when(o.createdAt)}</td>
              <td className="px-3 py-2">
                <Link className="whitespace-nowrap font-mono underline" href={`/admin/designs/${o.designId}`}>
                  {designCode(o.designId)} r{o.revision}
                </Link>
              </td>
              <td className="px-3 py-2">{schoolName(o.school)}</td>
              <td className="px-3 py-2">
                <StatusPill status={o.refundedAt !== null ? "refunded" : o.status} />
                {o.lastError && o.status !== "sent" && (
                  <p className="mt-1 max-w-[28ch] text-[12px] text-stone-500">{o.lastError}</p>
                )}
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                {o.paymentStatus === "no_payment_required" ? "$0 coupon" : usd(o.amountCents)}
                <span className="block text-[12px] text-stone-500">{when(o.paidAt)}</span>
              </td>
              <td className="px-3 py-2">{o.paymentStatus === "paid" && o.refundedAt === null ? usd(o.donationCents) : "—"}</td>
              <td className="px-3 py-2">{o.attempts}</td>
            </tr>
          ))}
        </Table>
      )}
    </AdminShell>
  );
}
