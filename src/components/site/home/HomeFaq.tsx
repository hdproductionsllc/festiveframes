import { copy } from "@/content/copy";

// Server Component. The six homepage FAQ entries rendered as native, accessible
// <details>/<summary> disclosures (no client JS). This same content is mirrored
// into FAQPage JSON-LD on the page so the markup and the structured data stay
// sourced from the one copy.ts array.
export function HomeFaq() {
  const { faq } = copy.home;

  return (
    <section id="faq" className="star-field text-brand-cream" aria-labelledby="faq-heading">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
        <h2
          id="faq-heading"
          className="text-3xl font-bold uppercase tracking-tight text-brand-cream sm:text-4xl"
        >
          Questions, answered
        </h2>

        <div className="mt-8 divide-y divide-brand-navy-soft/40 border-y border-brand-navy-soft/40">
          {faq.map((item) => (
            <details key={item.question} className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-sm text-lg font-semibold text-brand-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold">
                {item.question}
                <span
                  aria-hidden="true"
                  className="shrink-0 text-brand-gold transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="mt-3 leading-relaxed text-brand-cream/80">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
