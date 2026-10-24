import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/session";
import { allSchoolTotals, type SchoolTotals } from "@/lib/school-designs/orders";
import { listDesigns } from "@/lib/school-designs/store";
import { studentCounts } from "@/lib/school-designs/people";
import { pilotSchoolKits } from "@/data/school-pilot";
import { AdminShell, Empty, schoolName, Table, usd, when } from "@/components/admin/AdminShell";
import { isPlacement } from "@/lib/school-designs/funnel";
import { schoolBuilderUrl, schoolScanUrl } from "@/lib/school-qr";

export const metadata: Metadata = { title: "Schools" };

// One row per school with ANY activity, plus every pilot school even at zero —
// the pilot schools are the ones a club is waiting to hear about.

// Each row also carries what a club is handed: the builder link and the QR code
// (lib/school-qr), for the placement typed above the table — "card" unless staff
// name another, so every printed run is counted on its own in the funnel.

export default async function AdminSchools({ searchParams }: { searchParams: Promise<{ placement?: string }> }) {
  const email = await requireAdmin();
  const asked = (await searchParams).placement?.trim().toLowerCase();
  const placement = asked && isPlacement(asked) ? asked : "card";
  const [totals, designs, students] = await Promise.all([
    allSchoolTotals().catch(() => [] as SchoolTotals[]),
    listDesigns(5000),
    studentCounts().catch(() => []),
  ]);
  const studentsBySchool = new Map<string, number>();
  for (const s of students) studentsBySchool.set(s.school, (studentsBySchool.get(s.school) ?? 0) + s.students);
  const sends = new Map<string, number>();
  for (const d of designs) if (d.school) sends.set(d.school, (sends.get(d.school) ?? 0) + 1);
  const slugs = new Set<string>([...pilotSchoolKits().map((k) => k.slug), ...totals.map((t) => t.school), ...sends.keys()]);
  const rows = [...slugs]
    .map((slug) => ({
      slug,
      t: totals.find((x) => x.school === slug),
      sends: sends.get(slug) ?? 0,
      students: studentsBySchool.get(slug) ?? 0,
      pilot: pilotSchoolKits().some((k) => k.slug === slug),
    }))
    .sort((a, b) => (b.t?.raisedCents ?? 0) - (a.t?.raisedCents ?? 0) || b.sends - a.sends);

  return (
    <AdminShell email={email} active="/admin/schools" title="Schools">
      <p className="mb-3 text-[13px] text-stone-600">
        &ldquo;Raised&rdquo; counts paid, un-refunded orders only — a $0 coupon order credits the school nothing. It is the
        same number the school&apos;s own page shows at /s/&lt;school&gt;/raised.
      </p>
      <form method="get" className="mb-4 flex flex-wrap items-center gap-2 text-[13px] text-stone-700">
        <label htmlFor="placement">QR codes for placement</label>
        <input
          id="placement"
          name="placement"
          defaultValue={placement}
          pattern="[a-z0-9\-]{1,40}"
          className="w-40 rounded border border-stone-300 px-2 py-1"
        />
        <button className="rounded bg-stone-800 px-3 py-1 font-semibold text-white">Make codes</button>
        <span className="text-stone-500">
          e.g. card, bleachers, newsletter. Scans are counted per placement on the Funnel page.
        </span>
      </form>
      {rows.length === 0 ? (
        <Empty>No school activity yet.</Empty>
      ) : (
        <Table head={["School", "Frames sold", "Raised", "Last 30 days", "Designs sent", "Students", "Last sale", "Link + QR"]}>
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
              <td className="px-3 py-2">{r.students}</td>
              <td className="px-3 py-2">{when(r.t?.lastAt ?? null)}</td>
              <td className="px-3 py-2 text-[12px]">
                <a className="block underline" href={schoolBuilderUrl(r.slug)}>
                  {schoolBuilderUrl(r.slug).replace(/^https:\/\//, "")}
                </a>
                <span className="block text-stone-500" title="What the QR code carries">
                  QR → {schoolScanUrl(r.slug, placement).replace(/^https:\/\//, "")}
                </span>
                <a className="underline" href={`/api/admin/qr/${r.slug}/${placement}`}>SVG</a>
                {" · "}
                <a className="underline" href={`/api/admin/qr/${r.slug}/${placement}?format=png`}>PNG</a>
              </td>
            </tr>
          ))}
        </Table>
      )}
    </AdminShell>
  );
}
