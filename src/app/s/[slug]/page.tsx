import type { Metadata } from "next";
import { notFound } from "next/navigation";
// Same three-layer stylesheet stack as /lab/school, same order, same reasons —
// see that page's header comments. The builder is ONE engine; this route only
// changes which kit seeds it.
import "../../school-fonts.css";
import "../../build/build-skin.css";
import "../../lab/school/school-skin.css";
import { SchoolKitPage } from "@/components/designer/SchoolKitPage";
import { SCHOOL_SHIPPING_VARIANT } from "@/data/school-variants";
import { allSchoolKits, getSchoolKit } from "@/data/school-kits";

// ─── Per-school builder: /s/<slug> ───────────────────────────────────────────
//
// Each school's "own builder" is the shared engine opening in that school's kit:
// its colors on the frame body and banners, its mascot on the bottom bar, its own
// localStorage key. Adding a school is one entry in data/school-kits.ts — no new
// components, no new routes, nothing to keep in sync.

export function generateStaticParams() {
  return allSchoolKits().map((k) => ({ slug: k.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const kit = getSchoolKit(slug);
  if (!kit) return { title: { absolute: "MySchoolFrame" } };
  const title = `${kit.shortName} ${kit.mascot} — MySchoolFrame`;
  const description = `Design a personalized ${kit.shortName} ${kit.mascot} license-plate frame in your school's colors.`;
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
    // (colors confirmed + written permission) is what opens it to search.
    robots: kit.status === "verified" ? undefined : { index: false, follow: false },
  };
}

export default async function SchoolKitBuilderPage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const kit = getSchoolKit(slug);
  if (!kit) notFound();
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
  return <SchoolKitPage kit={kit} variant={SCHOOL_SHIPPING_VARIANT} />;
}
