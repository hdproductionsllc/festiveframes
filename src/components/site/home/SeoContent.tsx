import { copy } from "@/content/copy";

// Server Component. Long-form, search-intent content (SEO + answer-engine
// optimization). Plain semantic h2/h3 + paragraphs so crawlers and AI answer
// engines can extract clear, quotable statements about the product.
export function SeoContent() {
  const { seo } = copy.home;

  return (
    <section className="paper-grain" aria-labelledby="seo-heading">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
        <h2
          id="seo-heading"
          className="text-3xl font-bold uppercase tracking-tight text-brand-navy sm:text-4xl"
        >
          {seo.heading}
        </h2>
        <p className="mt-5 text-lg leading-relaxed text-brand-ink/90">{seo.intro}</p>

        <div className="mt-10 space-y-8">
          {seo.sections.map((s) => (
            <div key={s.heading}>
              <h3 className="text-xl font-bold text-brand-navy">{s.heading}</h3>
              <p className="mt-3 leading-relaxed text-brand-ink/90">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
