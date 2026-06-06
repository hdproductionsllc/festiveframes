import { copy } from "@/content/copy";

// Server Component. Honest founder/maker story (replaces fake customer reviews):
// real Midwest people, why they built it, and why it's good. Pairs with the
// maker testimonials directly below it.
export function WhyWeMadeIt() {
  const { story } = copy.home;

  return (
    <section className="paper-grain" aria-labelledby="story-heading">
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
        <h2
          id="story-heading"
          className="max-w-3xl text-3xl font-bold uppercase tracking-tight text-brand-navy sm:text-4xl"
        >
          {story.heading}
        </h2>
        <p className="mt-5 max-w-3xl text-lg leading-relaxed text-brand-ink/90">{story.body}</p>

        <ul className="mt-10 grid gap-6 sm:grid-cols-2">
          {story.reasons.map((r) => (
            <li
              key={r.title}
              className="rounded-lg border border-brand-navy-soft/20 bg-brand-cream-soft p-6"
            >
              <h3 className="font-mkt-display text-lg font-bold uppercase tracking-tight text-brand-navy">
                {r.title}
              </h3>
              <p className="mt-2 leading-relaxed text-brand-ink/80">{r.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
