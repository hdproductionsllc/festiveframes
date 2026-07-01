import type { Metadata } from "next";
import { SchoolFrameLab } from "@/components/lab/SchoolFrameLab";

// Internal prototype of the SCHOOL / fundraising frame — a bigger, ALL direct-print
// layout (no snap-in tiles): an 11-wide x 8-tall rectangle with tall 3x8 side
// panels, a thin 11-wide top bar and an 11x2 bottom banner, and a 5x5 photo in the
// middle. Parallel playground; shares nothing with the live tile builder. Reachable
// only by URL (unlinked) and kept out of search. Concept review only.
export const metadata: Metadata = {
  title: "School Frame Builder — Internal Prototype",
  robots: { index: false, follow: false },
};

export default function SchoolFrameLabPage() {
  return <SchoolFrameLab />;
}
