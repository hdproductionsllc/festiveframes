import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PetBuilder } from "@/components/lab/PetBuilder";
import { PET_LAB_OPEN } from "@/config/pet-lab";

// Internal prototype of the "upload your pet → cartoonize → frame" flow. Unlinked,
// noindex, /lab (robots-disallowed). Isolated from the live tile builder.
export const metadata: Metadata = {
  title: "Pet Frame Builder — Internal Prototype",
  robots: { index: false, follow: false },
};

export default function PetFramePage() {
  if (!PET_LAB_OPEN) notFound();
  return <PetBuilder />;
}
