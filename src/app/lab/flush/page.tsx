import type { Metadata } from "next";
// The faces the frame is set in, served from our own origin. Same stack and same
// order as /lab/school — see that page for why each layer is here.
import "../../school-fonts.css";
import { BuilderFontsDeferred } from "../../BuilderFontsDeferred";
import "../../build/build-skin.css";
import "../school/school-skin.css";
import "../slim/fork-bar.css";
import { SchoolBuilder } from "@/components/designer/SchoolDesigner";
import { SchoolKitPage } from "@/components/designer/SchoolKitPage";
import { allSchoolKits, getSchoolKit } from "@/data/school-kits";

// ─── THE FORK: /lab/flush — 15 x 6.75, flush on top ──────────────────────────
//
// The fitment engine's answer, beside the live builder rather than replacing it.
// Nothing here is shared mutable state: the route names a VARIANT, and the variant
// (data/school-variants) carries its own geometry, its own preset layouts and its
// own persist-key namespace, so a design made here can never reach /s/<school>.
//
// WHAT CHANGED, in one line each (see SCHOOL_FLUSH_FRAME_CONFIG for the rest):
//   TOP     flush with the plate's top edge. 0.75" tall, all of it over the plate
//           face, between the side columns, notched over the bolt holes like every
//           dealer frame. Cameras and garnish strips leave 0.26-0.4" above the
//           plate on a third of the fleet; every earlier frame hung 0.47-0.96" up
//           there.
//   BOTTOM  0.75" below the plate, 0.25" over its face, keystone for the tagline.
//           Past the 0.5" July line and the Pilot's taped 6.625" recess: the owner
//           chose the 0.75" top bar over the Pilot (a 6.5" cut read as a sliver).
//   SIDES   Bill's 2" columns, the FULL 6.75" (his part split), 1.5" outboard, cut
//           into three EQUAL 2 x 2.25 badges on their own row lattice.
//
// ?school=<slug> opens it wearing a real kit. The kit route and this one share ONE
// page body (SchoolKitPage) so they cannot drift.
//
// Unlinked and noindex: this is for the owner and Bill to hold against the live
// and slim frames and decide, not for a parent to find.
export const metadata: Metadata = {
  title: { absolute: "MySchoolFrame — Flush Frame (fork)" },
  openGraph: { siteName: "MySchoolFrame" },
  robots: { index: false, follow: false },
};

/** Which frame this is, and one click to every other version of it. */
function ForkBanner({ slug }: { slug?: string }) {
  return (
    <div className="msf-fork-bar">
      <span className="msf-fork-tag">Fork</span>
      <span className="msf-fork-note">
        Flush top. 15&Prime; &times; 6.75&Prime; on Bill&rsquo;s 1&Prime; grid: nothing above the
        plate, 0.75&Prime; below it, full-height side columns of three equal badges, a plain 0.75&Prime; top runner.
      </span>
      <nav className="msf-fork-links" aria-label="Other versions of this frame">
        <a href="/lab/flush" aria-current={slug ? undefined : "page"}>Generic</a>
        {allSchoolKits().map((k) => (
          <a
            key={k.slug}
            href={`/lab/flush?school=${k.slug}`}
            aria-current={slug === k.slug ? "page" : undefined}
          >
            {k.shortName}
          </a>
        ))}
        <a href={slug ? `/lab/slim?school=${slug}` : "/lab/slim"}>Slim fork &rarr;</a>
        <a href={slug ? `/s/${slug}` : "/lab/school"}>Live frame &rarr;</a>
      </nav>
    </div>
  );
}

export default async function FlushSchoolForkPage(
  { searchParams }: { searchParams: Promise<{ school?: string }> },
) {
  const { school } = await searchParams;
  const kit = school ? getSchoolKit(school) : undefined;

  if (kit) {
    return (
      <SchoolKitPage
        kit={kit}
        variant="flush"
        banner={<ForkBanner slug={kit.slug} />}
      />
    );
  }

  return (
    <div className="build-skin school-skin">
      <ForkBanner />
      <BuilderFontsDeferred />
      <SchoolBuilder variant="flush" />
    </div>
  );
}
