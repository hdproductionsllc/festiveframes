import type { Metadata } from "next";
// The faces the frame is set in, served from our own origin. Same stack and same
// order as /lab/school — see that page for why each layer is here.
import "../../school-fonts.css";
import { BuilderFontsDeferred } from "../../BuilderFontsDeferred";
import "../../build/build-skin.css";
import "../school/school-skin.css";
import { SchoolBuilder } from "@/components/designer/SchoolDesigner";
import { SCHOOL_SLIM_FRAME_CONFIG } from "@/lib/constants/frame";

// ─── THE FORK: /lab/slim ─────────────────────────────────────────────────────
//
// The fitment redesign, side by side with the live builder rather than replacing
// it. Nothing here is shared mutable state: it passes a different frame config and
// a different persist key, so a design made in this builder can never reach the
// one at /s/<school> and the classic geometry is untouched.
//
// What differs, and only this:
//   • ONE row at the bottom instead of two. The frame goes 7.93" -> 6.94" tall and
//     the clearance a car needs BELOW the plate goes 1.46" -> 0.47", which was the
//     worst edge on the product and the one most likely to be obstructed.
//   • The class year moves into a KEYSTONE that protrudes up into the plate
//     opening, so the two-tier lockup survives at no cost to fitment.
//   • Side panels become 2x2 / 2x3 / 2x2 — three badges with a taller feature in
//     the middle, which is exactly 7 rows.
//
// Unlinked and noindex: this is for the owner to hold against the current one and
// decide, not for a parent to find.
export const metadata: Metadata = {
  title: { absolute: "MySchoolFrame — Slim Frame (fork)" },
  openGraph: { siteName: "MySchoolFrame" },
  robots: { index: false, follow: false },
};

export default function SlimSchoolForkPage() {
  return (
    <div className="build-skin school-skin">
      <BuilderFontsDeferred />
      <SchoolBuilder frameConfig={SCHOOL_SLIM_FRAME_CONFIG} variant="slim" />
    </div>
  );
}
