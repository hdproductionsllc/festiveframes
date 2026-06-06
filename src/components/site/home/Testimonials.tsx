import { copy } from "@/content/copy";

// Server Component. Maker + artist quotes (Becky, Henry). These are honestly
// attributed insider voices, NOT customer reviews, so they carry no rating
// schema. Swap in real customer reviews + AggregateRating once we have them.
export function Testimonials() {
  const { testimonials } = copy.home;

  return (
    <section className="paper-grain" aria-labelledby="testimonials-heading">
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
        <h2
          id="testimonials-heading"
          className="text-3xl font-bold uppercase tracking-tight text-brand-navy sm:text-4xl"
        >
          From the people who make it
        </h2>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t) => (
            <figure
              key={t.name}
              className="rounded-lg border border-brand-navy-soft/20 bg-brand-cream-soft p-6 sm:p-8"
            >
              <span aria-hidden="true" className="font-mkt-display text-5xl leading-none text-brand-gold">
                &ldquo;
              </span>
              <blockquote className="mt-1 text-lg leading-relaxed text-brand-ink/90">
                {t.quote}
              </blockquote>
              <figcaption className="mt-5 text-sm font-semibold text-brand-navy">
                {t.name}
                <span className="block font-normal text-brand-ink/60">{t.role}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
