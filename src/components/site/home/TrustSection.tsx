import { copy } from "@/content/copy";

// Server Component. Local-production trust band. The trust paragraph in copy.ts
// already uses soft material wording and carries the TODO-VERIFY note at the
// source. St. Louis local make is the anchor here.
export function TrustSection() {
  return (
    <section className="paper-grain" aria-labelledby="trust-heading">
      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 sm:py-20">
        <p className="font-mkt-display text-sm font-semibold uppercase tracking-[0.2em] text-brand-red">
          Made in St. Louis
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
