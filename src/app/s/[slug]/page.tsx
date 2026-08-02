import type { Metadata } from "next";
import { notFound } from "next/navigation";
// Same three-layer stylesheet stack as /lab/school, same order, same reasons —
// see that page's header comments. The builder is ONE engine; this route only
// changes which kit seeds it.
import "../../school-fonts.css";
import "../../build/build-skin.css";
import "../../lab/school/school-skin.css";
import { SchoolKitPage } from "@/components/designer/SchoolKitPage";
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
  return <SchoolKitPage kit={kit} />;
}
