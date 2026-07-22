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
import { SchoolBuilder } from "@/components/designer/SchoolDesigner";

// Internal prototype of the SCHOOL / fundraising builder — a FORK of the real
// license-plate builder (real drag-drop + text editor + plate), seeded with a
// school frame config (wide 3-tile side panels via wings). Unlinked + noindex.
export const metadata: Metadata = {
  title: "School Frame Builder — Internal Prototype",
  robots: { index: false, follow: false },
};

export default function SchoolFrameLabPage() {
  // `build-skin` on the PARENT (matching /build) so the descendant rules in
  // build-skin.css (`.build-skin .workbench-bg` cream, `.build-skin .bsk-panel`, …)
  // apply to SchoolDesigner's root and cards.
  return (
    <div className="build-skin">
      <SchoolBuilder />
    </div>
  );
}
