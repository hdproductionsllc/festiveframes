import { copy } from "@/content/copy";

// Server Components (no "use client"). All the static, recognition-and-trust
// sections of /buy. Pure markup sourced from copy.buy so prose never drifts.
// Nothing here mentions future tile packs/drops (that lives only on /thanks).

export function WhatsInKit() {
  const { heading, items, caption } = copy.buy.whatsInKit;
  return (
    <section className="star-field text-brand-cream" aria-labelledby="whats-in-kit-heading">
      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-16">
        <h2
          id="whats-in-kit-heading"
          className="text-2xl font-bold uppercase tracking-tight text-brand-cream sm:text-3xl"
        >
          {heading}
        </h2>
        <ul className="mt-6 space-y-3">
          {items.map((item) => (
            <li key={item} className="flex gap-3 text-base leading-relaxed text-brand-cream/85">
              <span aria-hidden="true" className="text-brand-gold">
                ★
              </span>
              {item}
            </li>
          ))}
        </ul>
        <p className="mt-6 text-base font-medium text-brand-gold">{caption}</p>
      </div>
    </section>
  );
}

export function HowItWorks() {
  const { heading, line } = copy.buy.howItWorks;
  return (
    <section className="paper-grain" aria-labelledby="how-it-works-heading">
      <div className="mx-auto max-w-3xl px-4 py-14 text-center sm:px-6 sm:py-16">
        <h2
          id="how-it-works-heading"
          className="text-2xl font-bold uppercase tracking-tight text-brand-navy sm:text-3xl"
        >
          {heading}
        </h2>
        <p className="mt-4 font-mkt-display text-xl font-bold uppercase tracking-wide text-brand-red sm:text-2xl">
          {line}
        </p>
      </div>
    </section>
  );
}

export function BuiltToLast() {
  const { heading, body } = copy.buy.builtToLast;
  return (
    <section className="star-field text-brand-cream" aria-labelledby="built-to-last-heading">
      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-16">
        <h2
          id="built-to-last-heading"
          className="text-2xl font-bold uppercase tracking-tight text-brand-cream sm:text-3xl"
        >
          {heading}
        </h2>
        <p className="mt-4 text-base leading-relaxed text-brand-cream/85">{body}</p>
      </div>
    </section>
  );
}

export function TrustStrip() {
  const { heading, caption } = copy.buy.trust;
  return (
    <section className="paper-grain" aria-labelledby="trust-heading">
      <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-16">
        <h2
          id="trust-heading"
          className="text-2xl font-bold uppercase tracking-tight text-brand-navy sm:text-3xl"
        >
          {heading}
        </h2>
        <p className="mt-3 text-base text-brand-ink/80">{caption}</p>

        {/* PLACEHOLDER: photo strip of real cars/booth at St. Louis July 4
            events, 4-6 landscape crops. No reviews, ratings, or counters. */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              role="img"
              aria-label="Festive Frames frame spotted on a car at a St. Louis July 4 event"
              className="flex aspect-square items-center justify-center rounded-md border border-brand-navy/15 bg-brand-navy-soft/10"
            >
              <span className="font-mkt-display text-[10px] font-semibold uppercase tracking-widest text-brand-navy/40">
                Event photo
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function BuyFaq() {
  const { faq } = copy.buy;
  return (
    <section className="star-field text-brand-cream" aria-labelledby="buy-faq-heading">
      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-16">
        <h2
          id="buy-faq-heading"
          className="text-2xl font-bold uppercase tracking-tight text-brand-cream sm:text-3xl"
        >
          Questions, answered
        </h2>
        <div className="mt-6 divide-y divide-brand-navy-soft/40 border-y border-brand-navy-soft/40">
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
              <p className="mt-3 leading-relaxed text-brand-cream/80">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
