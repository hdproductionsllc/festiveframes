import type { Metadata } from "next";
// The faces the FRAME is set in, served from our own origin so they cannot lose
// the race and render as something heavier. The font picker's sixty-odd optional
// Google faces used to come with them through a chain of render-blocking
// @imports; they now arrive after paint, from the component below.
import "../../school-fonts.css";
import { BuilderFontsDeferred } from "../../BuilderFontsDeferred";
// The "build skin" (cream workbench background + the bsk-panel / bsk-btn card styling)
// also lived only on /build, so the school builder's control cards rendered dark and
// low-contrast (unreadable headings). SchoolDesigner's root already has the `build-skin`
// class — this makes the styles it targets actually load.
import "../../build/build-skin.css";
// The SCHOOL skin, imported AFTER build-skin.css so it shadows it. It never edits
// that file — build-skin.css is a live-storefront stylesheet — and every rule in it
// requires the `school-skin` class below, which exists on exactly this one element
// in the whole codebase. See the header of school-skin.css for why that, rather
// than route-scoped CSS loading, is what makes /build provably unreachable.
import "./school-skin.css";
import { SchoolBuilder } from "@/components/designer/SchoolDesigner";

// Prototype of the SCHOOL / fundraising builder — a FORK of the real license-plate
// builder (real drag-drop + text editor + plate), seeded with a school frame config
// (wide 3-tile side panels via wings). Unlinked + noindex.
export const metadata: Metadata = {
  title: "MySchoolFrame — Frame Builder",
  robots: { index: false, follow: false },
};

export default function SchoolFrameLabPage() {
  // `build-skin` on the PARENT (matching /build) so the descendant rules in
  // build-skin.css (`.build-skin .bsk-panel`, the surface remaps, …) still resolve
  // — the school skin shadows them rather than replacing them, so the base layer
  // has to stay. `school-skin` is what every override selector keys off.
  return (
    <div className="build-skin school-skin">
      {/* The picker's optional faces, after paint — see the component. */}
      <BuilderFontsDeferred />
      <SchoolBuilder />
    </div>
  );
}
