import Image from "next/image";
import { copy } from "@/content/copy";

// Server Component. Local-production trust band, anchored by the Festive Frames
// "Made in the USA / EST. 2026 / St. Louis" seal.
export function TrustSection() {
  return (
    <section className="paper-grain" aria-labelledby="trust-heading">
      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 sm:py-20">
        <Image
          src="/brand/seal.png"
          alt="Festive Frames, made in the USA, established 2026, St. Louis, Missouri"
          width={176}
          height={176}
          className="mx-auto mb-6 h-32 w-32 sm:h-40 sm:w-40"
        />
        <p className="font-mkt-display text-sm font-semibold uppercase tracking-[0.2em] text-brand-red">
          Made in the USA
        </p>
        <h2
          id="trust-heading"
          className="mt-3 text-3xl font-bold uppercase tracking-tight text-brand-navy sm:text-4xl"
        >
          Printed and assembled here
        </h2>
        {/* TODO-VERIFY: trust copy includes soft material/durability wording that
            still needs road, weather, and car-wash testing confirmation before
            launch. See src/content/copy.ts (home.trust). */}
        <p className="mx-auto mt-5 max-w-prose text-lg leading-relaxed text-brand-ink/90">
          {copy.home.trust}
        </p>
      </div>
    </section>
  );
}
