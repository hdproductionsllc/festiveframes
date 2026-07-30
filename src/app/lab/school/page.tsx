import type { Metadata } from "next";
// The builder web fonts (collegiate/varsity + script + display faces) live in
// builder-fonts.css. It was previously imported ONLY on /build, so the school
// builder's font picker fell back to system fonts — collegiate faces never loaded,
// on-screen OR in the print canvas. Importing it here fixes both.
import "../../builder-fonts.css";
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
      <SchoolBuilder />
    </div>
  );
}
