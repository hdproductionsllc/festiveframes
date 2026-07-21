import type { Metadata } from "next";
// The builder web fonts (collegiate/varsity + script + display faces) live in
// builder-fonts.css. It was previously imported ONLY on /build, so the school
// builder's font picker fell back to system fonts — collegiate faces never loaded,
// on-screen OR in the print canvas. Importing it here fixes both.
import "../../builder-fonts.css";
import { SchoolBuilder } from "@/components/designer/SchoolDesigner";

// Internal prototype of the SCHOOL / fundraising builder — a FORK of the real
// license-plate builder (real drag-drop + text editor + plate), seeded with a
// school frame config (wide 3-tile side panels via wings). Unlinked + noindex.
export const metadata: Metadata = {
  title: "School Frame Builder — Internal Prototype",
  robots: { index: false, follow: false },
};

export default function SchoolFrameLabPage() {
  return <SchoolBuilder />;
}
