import type { Metadata } from "next";
import { DirectPrintLab } from "@/components/lab/DirectPrintLab";

// Internal prototype of the V2 "direct print" frame — a PARALLEL playground that
// shares nothing with the live tile builder. Reachable only by URL (unlinked) and
// kept out of search. Concept review only.
export const metadata: Metadata = {
  title: "Direct-Print Builder — Internal Prototype",
  robots: { index: false, follow: false },
};

export default function DirectPrintLabPage() {
  return <DirectPrintLab />;
}
