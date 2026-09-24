import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
// Same three-layer stylesheet stack as /lab/school, same order, same reasons —
// see that page's header comments. The builder is ONE engine; this route only
// changes which kit seeds it.
import "../../school-fonts.css";
import "../../build/build-skin.css";
import "../../lab/school/school-skin.css";
import { SchoolKitPage } from "@/components/designer/SchoolKitPage";
import { SCHOOL_SHIPPING_VARIANT } from "@/data/school-variants";
import type { SchoolKit } from "@/data/school-kits";
import { resolveSchoolSlug, type SchoolResolution } from "@/data/school-resolve";
import { isBuilderOpen } from "@/data/school-pilot";
import { SchoolNotReady } from "@/components/school/SchoolNotReady";
import { getCachedBrand } from "@/lib/school-brand/cache";
import { assignSurfaces } from "@/lib/school-brand/apply-brand";

// ─── Per-school builder: /s/<slug> ───────────────────────────────────────────
//
// Each school's "own builder" is the shared engine opening in that school's kit:
// its colors on the frame body and banners, its mascot on the bottom bar, its own
// localStorage key.
//
// IT IS NOW NATIONAL. A slug resolves through `data/school-resolve.ts`: an
// authored kit first (27 of them, researched), then the roster (29,467 rows from
// the federal school directories, turned into a neutral thin kit), then 404. A
// roster slug for a school that already HAS an authored kit redirects to the
// authored one, so no school is ever served two pages of itself.
//
// DURING THE PILOT (2026-09-23) only the six pilot schools get the builder; every
// other resolved school gets `SchoolNotReady` — see `isBuilderOpen`, which flips
// back with the finder's own switch.
//
// NOTHING IS PRE-RENDERED. `generateStaticParams` used to list the 27 kits; with
// the roster behind the same route, keeping it would have meant a build that
// prerenders 27 pages and serves 29,440 dynamically — two code paths through the
// same component, and the DYNAMIC one is the one nobody would have looked at. The
// page also reads the brand cache per request for a thin kit, which a prerender
// cannot do. So the route is dynamic for every school, the 27 included; the pages
// are cheap server-side (a kit object and a hero) and the builder below them is a
// client bundle either way.
//
// (There is no `dynamicParams` export: it only means anything alongside a
// `generateStaticParams`, and an export that reads as load-bearing and is not is
// worse than none.)

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const r = resolveSchoolSlug(slug);
  if (r.kind === "missing") return { title: { absolute: "MySchoolFrame" } };
  // A redirect is about to happen; the crawler that follows it gets the authored
  // page's own metadata. Say nothing indexable here.
  if (r.kind === "redirect") {
    return { title: { absolute: "MySchoolFrame" }, robots: { index: false, follow: false } };
  }

  const kit = r.kit;
  // Not building this school yet (the pilot): say that, in the link preview too.
  if (!isBuilderOpen(kit.slug)) {
    const title = `${kit.shortName} — MySchoolFrame`;
    const description = `MySchoolFrame isn't open for ${kit.schoolName} yet, but you're welcome to let us know you'd like it.`;
    return {
      title: { absolute: title },
      description,
      openGraph: { siteName: "MySchoolFrame", title, description },
      robots: { index: false, follow: false },
    };
  }
  // A thin kit has no mascot — we do not know it, and "Lincoln  — MySchoolFrame"
  // with the gap where a guess would go is what naive interpolation produces.
  const title = kit.mascot
    ? `${kit.shortName} ${kit.mascot} — MySchoolFrame`
    : `${kit.shortName} — MySchoolFrame`;
  const description = kit.mascot
    ? `Design a personalized ${kit.shortName} ${kit.mascot} license-plate frame in your school's colors.`
    : `Design a personalized ${kit.shortName} license-plate frame for ${kit.city}.`;
  return {
    // `absolute` so the root layout's "| Festive Frames" template does not append
    // the other brand to a school's own page.
    title: { absolute: title },
    description,
    // The card itself is opengraph-image.tsx beside this file; this is the line
    // UNDER it, which said "Festive Frames – Custom License Plate Frames" on
    // every school link anyone shared.
    openGraph: { siteName: "MySchoolFrame", title, description },
    // Demo kits are research-guessed and the school hasn't authorized its name on a
    // public page — sales-demo only, never indexed. Flipping a kit to "verified"
    // (colors confirmed + written permission) is what opens it to search, and a
    // THIN kit can never be verified: it is generated, it names no facts, and
    // nobody has asked the school anything. 29,467 noindexed pages is also the
    // only honest answer to a crawler about pages that are stubs.
    robots: kit.status === "verified" ? undefined : { index: false, follow: false },
  };
}

/**
 * A thin kit wearing whatever colours somebody's scan found for this school.
 *
 * The kit itself stays neutral navy — that is what it IS, a school we have never
 * seen — and the override is layered on at render time from the shared cache, so
 * a parent who scans their school's website today is why the next parent opens in
 * the school's colours tomorrow. `assignSurfaces` is the SAME rule the scanner's
 * own "use these colours" button applies, not a second copy of it.
 *
 * Authored kits never come through here (see the caller): their colours were
 * researched and sometimes sampled from the school's own artwork.
 */
async function withCachedBrand(kit: SchoolKit): Promise<SchoolKit> {
  const cached = await getCachedBrand(kit.slug);
  if (!cached?.colors.length) return kit;
  const { frameColor, tileFieldColor, rimColor } = assignSurfaces(cached.colors);
  let host = cached.sourceUrl;
  try {
    host = new URL(cached.sourceUrl).host;
  } catch {
    /* a stored value we cannot parse is still worth naming as-is */
  }
  const on = new Date(cached.scannedAt).toISOString().slice(0, 10);
  return {
    ...kit,
    colors: { frame: frameColor, tileField: tileFieldColor, rim: rimColor },
    colorSource: `Scanned from ${host} on ${on}`,
  };
}

/** Town and state for the request form's prefill. A roster row carries them
 *  separately; an authored kit's `city` is "Kirkwood, MO". */
function place(r: Extract<SchoolResolution, { kind: "authored" | "roster" }>): { city: string; state: string } {
  if (r.kind === "roster") return { city: r.entry.city, state: r.entry.state };
  const m = /^(.*?),\s*([A-Za-z]{2})\s*$/.exec(r.kit.city);
  return m ? { city: m[1], state: m[2].toUpperCase() } : { city: r.kit.city, state: "" };
}

export default async function SchoolKitBuilderPage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const r = resolveSchoolSlug(slug);
  if (r.kind === "missing") notFound();
  // The school has a researched page already; this slug is its other name.
  if (r.kind === "redirect") redirect(`/s/${r.to}`);

  // THE PILOT GATE. Outside the six, no builder: a working frame in a school's
  // name claims a relationship we do not have. One switch reverts it — see
  // `isBuilderOpen`. Checked after the redirect, so a roster slug for an authored
  // school lands on that school's own URL first and is judged there.
  if (!isBuilderOpen(r.kit.slug)) {
    return <SchoolNotReady schoolName={r.kit.schoolName} {...place(r)} />;
  }

  const kit = r.kind === "roster" ? await withCachedBrand(r.kit) : r.kit;

  // The page body lives in SchoolKitPage so the slim fork can serve the SAME page
  // on a different geometry instead of a copy of it. See that component.
  //
  // THE FLUSH FRAME IS WHAT A PARENT GETS (2026-09-12). It is the only school
  // geometry that has been printed AND hung on a car — the photo of the 15 x 6.75
  // fork on a Honda Pilot is the first school frame to complete design → physical
  // part since July. The live 15.856 x 8.919 config this route used to serve is
  // the one on the 0.991 pitch that Bill had to stretch in eufyMake, and nothing
  // built from it has ever been on a car. Serving unproven geometry to parents
  // was the risk; it is retired here, not deleted (it stays at /lab/school).
  //
  // Saved designs are SAFE: the persist key is namespaced by variant, so a
  // returning visitor's live-frame design is not reinterpreted on a grid it was
  // never drawn against — they start fresh on the frame we can actually ship.
  //
  // GEOMETRY IS NOT PER-SCHOOL and a thin kit changes nothing about that: all
  // 29,467 of them render on SCHOOL_SHIPPING_VARIANT, exactly as the 27 do.
  return (
    <SchoolKitPage
      kit={kit}
      variant={SCHOOL_SHIPPING_VARIANT}
      brandScan={
        r.kind === "roster"
          ? {
              slug: kit.slug,
              heading: "Know your school's website?",
              blurb: (
                <>
                  Paste it and we&apos;ll pull {kit.shortName}&apos;s colors in — for
                  you and for everyone from {kit.shortName} after you. Nothing is added
                  to the frame until you pick it.
                </>
              ),
            }
          : undefined
      }
    />
  );
}
