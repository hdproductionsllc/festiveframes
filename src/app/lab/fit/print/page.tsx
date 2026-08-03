import type { Metadata } from "next";

import PrintSheet from "./PrintSheet";
import "./print-sheet.css";

// ─── /lab/fit/print — the 1:1 paper calibration sheet ────────────────────────
//
// Bill prints this at 100 percent on letter paper, cuts it out, and holds it
// against the Honda Pilot and against a real plate BEFORE anything is printed in
// plastic. Paper catches a bad geometry in five minutes; a bad print costs a day
// and a sheet of material, and per CLAUDE.md the bottom edge is the binding
// car-fit constraint, so it is the edge this sheet puts under his hands first.
//
// Everything on the template pages is sized in CSS physical inches, so the only
// scale that exists is the print dialog's. Page 1 exists to prove that dialog was
// set to 100 percent: if the ruler bar does not measure 6 inches, nothing else on
// the sheet can be trusted and it gets reprinted.
//
// The whole configuration rides in the URL query (see src/lib/fit/spec.ts), and
// page 1 prints that query string, so any sheet found on a bench can be turned
// back into the exact geometry that produced it.
//
// noindex: this is a shop tool, not a page for a customer to find.
export const metadata: Metadata = {
  title: { absolute: "Fit Bench Print Templates" },
  robots: { index: false, follow: false },
};

export default function FitPrintPage() {
  return <PrintSheet />;
}
