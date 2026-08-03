import type { Metadata } from "next";
import "./fit-bench.css";
import { FitBench } from "./FitBench";

// ─── /lab/fit — the frame fitment bench ──────────────────────────────────────
//
// Henry and Bill have been converging the physical geometry by text: a number
// goes one way, a photo of a printed part comes back, and nobody can see the
// consequence of the change until it is already cut. This page is the shared
// surface instead. Every free variable is a dial, every consequence is a live
// readout, and the whole spec round-trips through the query string, so a
// dialled-in configuration is a link either side can open.
//
// It is deliberately NOT a builder. Nothing here has art, colour or a school on
// it. See CLAUDE.md "Geometry GROUND TRUTH": only the July 4 ring ever completed
// design -> physical part, the bottom edge is the binding car-fit constraint,
// and height wanted at the bottom is bought INWARD over the plate face rather
// than downward. Those are the rules the readout flags against.
//
// Unlinked and noindex: an internal instrument, not a storefront page.
export const metadata: Metadata = {
  title: { absolute: "MySchoolFrame Fit Bench" },
  openGraph: { siteName: "MySchoolFrame" },
  robots: { index: false, follow: false },
};

export default function FitBenchPage() {
  return <FitBench />;
}
