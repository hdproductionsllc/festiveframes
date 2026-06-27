import type { Metadata } from "next";
import { PetBuilder } from "@/components/lab/PetBuilder";

// Internal prototype of the "upload your pet → cartoonize → frame" flow. Unlinked,
// noindex, /lab (robots-disallowed). Isolated from the live tile builder.
export const metadata: Metadata = {
  title: "Pet Frame Builder — Internal Prototype",
  robots: { index: false, follow: false },
};

export default function PetFramePage() {
  return <PetBuilder />;
}
