import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/session";
import { listSchoolRequests } from "@/lib/school-requests";
import { AdminShell, Empty, Table, when } from "@/components/admin/AdminShell";

export const metadata: Metadata = { title: "School requests" };

// "We don't have my school" — the best signal of which school to research next.
// The requester is never emailed automatically; reply by hand only if you choose.

export default async function AdminRequests() {
  const email = await requireAdmin();
  const requests = await listSchoolRequests(500);
  const counts = new Map<string, number>();
  for (const r of requests) {
    const k = `${r.schoolName.trim().toLowerCase()}|${r.state}`;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return (
    <AdminShell email={email} active="/admin/requests" title="School requests">
      <p className="mb-3 text-[13px] text-stone-600">
        Parents who couldn&apos;t find their school. Nobody here has been emailed; reply by hand only if you decide to.
      </p>
      {requests.length === 0 ? (
        <Empty>No requests yet.</Empty>
      ) : (
        <Table head={["When", "School", "Where", "Asked", "Email", "Note"]}>
          {requests.map((r) => (
            <tr key={r.id}>
              <td className="px-3 py-2 whitespace-nowrap">{when(r.createdAt)}</td>
              <td className="px-3 py-2 font-semibold">{r.schoolName}</td>
              <td className="px-3 py-2">{r.city}, {r.state}</td>
              <td className="px-3 py-2">{counts.get(`${r.schoolName.trim().toLowerCase()}|${r.state}`)}×</td>
              <td className="px-3 py-2">{r.email ?? "—"}</td>
              <td className="px-3 py-2 text-[13px] text-stone-600">{r.note ?? ""}</td>
            </tr>
          ))}
        </Table>
      )}
    </AdminShell>
  );
}
