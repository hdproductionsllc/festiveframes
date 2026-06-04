import { copy } from "@/content/copy";

// Server Component. Three factual bullets (completeness + permanence anchoring).
// This is the section that carries "Install once. Swap forever." as its lede.
export function WhatItIs() {
  const { whatItIs } = copy.home;

  return (
    <section className="paper-grain" aria-labelledby="what-it-is-heading">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <h2
          id="what-it-is-heading"
          className="max-w-2xl text-3xl font-bold uppercase tracking-tight text-brand-navy sm:text-4xl"
        >
          {copy.site.tagline}
        </h2>

        <ul className="mt-10 grid gap-6 sm:grid-cols-3">
          {whatItIs.map((point, i) => (
            <li
              key={point}
              className="rounded-lg border border-brand-navy-soft/20 bg-brand-cream-soft p-6"
            >
              <span
                aria-hidden="true"
                className="font-mkt-display text-2xl font-bold text-brand-gold"
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <p className="mt-3 text-lg leading-relaxed text-brand-ink/90">
                {point}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
