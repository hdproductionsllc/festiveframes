import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin/session";
import { listDesigns } from "@/lib/school-designs/store";
import { AdminShell, Empty, schoolName, Table, when } from "@/components/admin/AdminShell";

export const metadata: Metadata = { title: "Sent designs" };

export default async function AdminDesigns() {
  const email = await requireAdmin();
  const designs = await listDesigns(500);
  return (
    <AdminShell email={email} active="/admin/designs" title="Sent designs">
      {designs.length === 0 ? (
        <Empty>No designs yet. Every Send (and every Buy) saves one here.</Empty>
      ) : (
        <Table head={["Design", "School", "From", "Phone", "For", "Versions", "Approved", "Last change"]}>
          {designs.map((d) => (
            <tr key={d.id}>
              <td className="px-3 py-2">
                <Link className="whitespace-nowrap font-mono underline" href={`/admin/designs/${d.id}`}>{d.code}</Link>
              </td>
              <td className="px-3 py-2">{schoolName(d.school)}</td>
              <td className="px-3 py-2">{d.contact?.email ?? "—"}</td>
              <td className="px-3 py-2 whitespace-nowrap">{d.contact?.phone ?? "—"}</td>
              <td className="px-3 py-2">{d.contact?.forWhom ?? "—"}</td>
              <td className="px-3 py-2">{d.revisions}</td>
              <td className="px-3 py-2">{d.approvedRevisions ? `${d.approvedRevisions}` : "—"}</td>
              <td className="px-3 py-2 whitespace-nowrap">{when(d.updatedAt)}</td>
            </tr>
          ))}
        </Table>
      )}
    </AdminShell>
  );
}
