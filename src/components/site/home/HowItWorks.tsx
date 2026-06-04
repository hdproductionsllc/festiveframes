import { copy } from "@/content/copy";

// Server Component. Three install/use steps:
// Install the frame once / Snap in your kit / Swap tiles forever.
export function HowItWorks() {
  const { howItWorks } = copy.home;

  return (
    <section className="paper-grain" aria-labelledby="how-it-works-heading">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <h2
          id="how-it-works-heading"
          className="text-3xl font-bold uppercase tracking-tight text-brand-navy sm:text-4xl"
        >
          How it works
        </h2>

        <ol className="mt-10 grid gap-8 sm:grid-cols-3">
          {howItWorks.map((item, i) => (
            <li key={item.step} className="relative">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-navy font-mkt-display text-lg font-bold text-brand-cream">
                  {i + 1}
                </span>
                {i < howItWorks.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="hidden h-px flex-1 bg-brand-navy-soft/30 sm:block"
                  />
                )}
              </div>
              <p className="mt-4 text-xl font-semibold leading-snug text-brand-ink">
                {item.step}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
