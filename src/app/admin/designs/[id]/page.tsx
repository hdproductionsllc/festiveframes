import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/session";
import { getDesignDetail } from "@/lib/school-designs/store";
import { listSchoolOrders, type SchoolOrder } from "@/lib/school-designs/orders";
import { AdminShell, schoolName, StatusPill, when } from "@/components/admin/AdminShell";
import { RelinkButton } from "@/components/admin/RelinkButton";

export const metadata: Metadata = { title: "Design" };

export default async function AdminDesign({ params }: { params: Promise<{ id: string }> }) {
  const email = await requireAdmin();
  const { id } = await params;
  const d = await getDesignDetail(id);
  if (!d) notFound();
  const orders = (await listSchoolOrders({ limit: 5000 }).catch(() => [] as SchoolOrder[])).filter((o) => o.designId === id);

  return (
    <AdminShell email={email} active="/admin/designs" title={`Design ${d.code}`}>
      <p className="mb-4 text-[13px]">
        <Link href="/admin/designs" className="underline">← All sent designs</Link>
      </p>
      <div className="mb-6 grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-stone-200 bg-white p-4 text-[14px]">
          <p><span className="text-stone-500">School:</span> {schoolName(d.school)}</p>
          <p><span className="text-stone-500">From:</span> {d.contact?.email ?? "— (a Buy; Stripe has the contact)"}</p>
          {d.contact?.phone && <p><span className="text-stone-500">Phone:</span> {d.contact.phone}</p>}
          {d.contact?.forWhom && <p><span className="text-stone-500">For:</span> {d.contact.forWhom}</p>}
          <p><span className="text-stone-500">First saved:</span> {when(d.createdAt)}</p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-4 text-[14px]">
          <p className="font-semibold">Parent lost their link?</p>
          <p className="mb-2 text-[13px] text-stone-600">
            Issue a fresh one and send it to them yourself. Their old link stops working at once. Check it&apos;s really
            them first — the link opens and changes the design.
          </p>
          <RelinkButton designId={d.id} />
        </div>
      </div>

      {orders.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-2 text-[15px] font-semibold">Orders for this design</h2>
          <ul className="flex flex-col gap-1 text-[14px]">
            {orders.map((o) => (
              <li key={o.orderId} className="flex flex-wrap items-center gap-2">
                <StatusPill status={o.refundedAt !== null ? "refunded" : o.status} />
                <span>revision {o.revision}</span>
                <span className="text-stone-500">started {when(o.createdAt)}</span>
                {o.lastError && <span className="text-[12px] text-stone-500">— {o.lastError}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <h2 className="mb-2 text-[15px] font-semibold">Versions (newest first)</h2>
      <div className="flex flex-col gap-4">
        {d.history.map((r) => (
          <div key={r.n} className="rounded-xl border border-stone-200 bg-white p-4">
            <p className="mb-2 flex flex-wrap items-center gap-2 text-[14px]">
              <strong>Revision {r.n}</strong>
              <span className="text-stone-500">{when(r.createdAt)}</span>
              {r.approvedAt ? (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[12px] font-semibold text-emerald-800">
                  Proof approved {when(r.approvedAt)}
                </span>
              ) : (
                <span className="rounded-full bg-stone-200 px-2 py-0.5 text-[12px] text-stone-700">Not approved</span>
              )}
              <span className="text-[12px] text-stone-500">
                {r.panels} print panel{r.panels === 1 ? "" : "s"} · {r.originals} uploaded photo{r.originals === 1 ? "" : "s"}
              </span>
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/admin/artifact/${r.proof.sha256}`}
              alt={`Proof, revision ${r.n}`}
              className="h-auto w-full max-w-2xl rounded-md border border-stone-200"
              loading="lazy"
            />
          </div>
        ))}
      </div>
    </AdminShell>
  );
}
