import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/session";
import { allSchoolTotals, type SchoolTotals } from "@/lib/school-designs/orders";
import { listDesigns } from "@/lib/school-designs/store";
import { pilotSchoolKits } from "@/data/school-pilot";
import { AdminShell, Empty, schoolName, Table, usd, when } from "@/components/admin/AdminShell";

export const metadata: Metadata = { title: "Schools" };

// One row per school with ANY activity, plus every pilot school even at zero —
// the pilot six are the ones a club is waiting to hear about.

export default async function AdminSchools() {
  const email = await requireAdmin();
  const [totals, designs] = await Promise.all([allSchoolTotals().catch(() => [] as SchoolTotals[]), listDesigns(5000)]);
  const sends = new Map<string, number>();
  for (const d of designs) if (d.school) sends.set(d.school, (sends.get(d.school) ?? 0) + 1);
  const slugs = new Set<string>([...pilotSchoolKits().map((k) => k.slug), ...totals.map((t) => t.school), ...sends.keys()]);
  const rows = [...slugs]
    .map((slug) => ({
      slug,
      t: totals.find((x) => x.school === slug),
      sends: sends.get(slug) ?? 0,
      pilot: pilotSchoolKits().some((k) => k.slug === slug),
    }))
    .sort((a, b) => (b.t?.raisedCents ?? 0) - (a.t?.raisedCents ?? 0) || b.sends - a.sends);

  return (
    <AdminShell email={email} active="/admin/schools" title="Schools">
      <p className="mb-3 text-[13px] text-stone-600">
        &ldquo;Raised&rdquo; counts paid, un-refunded orders only — a $0 coupon order credits the school nothing. It is the
        same number the school&apos;s own page shows at /s/&lt;school&gt;/raised.
      </p>
      {rows.length === 0 ? (
        <Empty>No school activity yet.</Empty>
      ) : (
        <Table head={["School", "Frames sold", "Raised", "Last 30 days", "Designs sent", "Last sale"]}>
          {rows.map((r) => (
            <tr key={r.slug}>
              <td className="px-3 py-2">
                {schoolName(r.slug)}
                {r.pilot && <span className="ml-2 rounded bg-sky-100 px-1.5 py-0.5 text-[11px] font-semibold text-sky-800">pilot</span>}
                {r.pilot && (
                  <a className="block text-[12px] text-stone-500 underline" href={`/s/${r.slug}/raised`}>
                    school&apos;s page
                  </a>
                )}
              </td>
              <td className="px-3 py-2">{r.t?.frames ?? 0}</td>
              <td className="px-3 py-2 font-semibold">{usd(r.t?.raisedCents ?? 0)}</td>
              <td className="px-3 py-2">
                {r.t?.frames30d ?? 0} · {usd(r.t?.raised30dCents ?? 0)}
              </td>
              <td className="px-3 py-2">{r.sends}</td>
              <td className="px-3 py-2">{when(r.t?.lastAt ?? null)}</td>
            </tr>
          ))}
        </Table>
      )}
    </AdminShell>
  );
}
