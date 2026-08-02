import type { Metadata } from "next";
// The faces the frame is set in, served from our own origin. Same stack and same
// order as /lab/school — see that page for why each layer is here.
import "../../school-fonts.css";
import { BuilderFontsDeferred } from "../../BuilderFontsDeferred";
import "../../build/build-skin.css";
import "../school/school-skin.css";
import "./fork-bar.css";
import { SchoolBuilder } from "@/components/designer/SchoolDesigner";
import { SchoolKitPage } from "@/components/designer/SchoolKitPage";
import { SCHOOL_SLIM_FRAME_CONFIG } from "@/lib/constants/frame";
import { allSchoolKits, getSchoolKit } from "@/data/school-kits";

// ─── THE FORK: /lab/slim ─────────────────────────────────────────────────────
//
// The fitment redesign, side by side with the live builder rather than replacing
// it. Nothing here is shared mutable state: it passes a different frame config and
// a different persist key, so a design made in this builder can never reach the
// one at /s/<school> and the live geometry is untouched.
//
// Same rail, same 12 x 6 window, same side cantilever. The one difference is that
// NOTHING hangs below the bottom rail:
//
//   FULL (live)   needs air 15.856" x 8.919"   bottom 1.955"
//   HALF (this)   needs air 15.856" x 7.928"   bottom 0.964"
//
// Both need the same 13.874" x 7.928" of flat SURFACE, because the rail did not
// move. HALF simply stops asking for two inches of clear air under the plate,
// which is the scarcest kind there is: a bumper valance, a step, a tow eye.
//
// The line that lived on the second bottom row moves into the KEYSTONE, a centre
// section of the bar protruding UP into the plate opening. It grows inward over
// the plate face, so it costs nothing in fitment.
//
// ?school=<slug> opens it wearing a real kit. Judging a keystone on the generic
// Wildcats frame is judging the wrong thing: what matters is how it reads under a
// real school's name, in that school's colours, beside that school's artwork. The
// kit route and this one share ONE page body (SchoolKitPage) so they cannot drift.
//
// Unlinked and noindex: this is for the owner to hold against the live one and
// decide, not for a parent to find.
export const metadata: Metadata = {
  title: { absolute: "MySchoolFrame — Slim Frame (fork)" },
  openGraph: { siteName: "MySchoolFrame" },
  robots: { index: false, follow: false },
};

/** Which frame this is, and one click to every other version of it. */
function ForkBanner({ slug }: { slug?: string }) {
  return (
    <div className="msf-fork-bar">
      <span className="msf-fork-tag">Fork</span>
      <span className="msf-fork-note">
        Half cantilever. Nothing hangs below the plate, so it needs 0.964&Prime; of air
        under it against the live frame&rsquo;s 1.955&Prime;.
      </span>
      <nav className="msf-fork-links" aria-label="Other versions of this frame">
        <a href="/lab/slim" aria-current={slug ? undefined : "page"}>Generic</a>
        {allSchoolKits().map((k) => (
          <a
            key={k.slug}
            href={`/lab/slim?school=${k.slug}`}
            aria-current={slug === k.slug ? "page" : undefined}
          >
            {k.shortName}
          </a>
        ))}
        <a href={slug ? `/s/${slug}` : "/lab/school"}>Live frame &rarr;</a>
      </nav>
    </div>
  );
}

export default async function SlimSchoolForkPage(
  { searchParams }: { searchParams: Promise<{ school?: string }> },
) {
  const { school } = await searchParams;
  const kit = school ? getSchoolKit(school) : undefined;

  // With a kit: the school's own page, on the slim geometry — the same component
  // /s/<slug> renders, so the comparison is the FRAME and nothing else. Without
  // one: the plain builder, which is what this route was and still the right thing
  // for looking at the geometry with nothing in the way.
  if (kit) {
    return (
      <SchoolKitPage
        kit={kit}
        frameConfig={SCHOOL_SLIM_FRAME_CONFIG}
        variant="slim"
        banner={<ForkBanner slug={kit.slug} />}
      />
    );
  }

  return (
    <div className="build-skin school-skin">
      <ForkBanner />
      <BuilderFontsDeferred />
      <SchoolBuilder frameConfig={SCHOOL_SLIM_FRAME_CONFIG} variant="slim" />
    </div>
  );
}
