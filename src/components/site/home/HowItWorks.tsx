import Image from "next/image";
import { copy } from "@/content/copy";

// Server Component. Three install/use steps illustrated by the snap-on photo:
// Install the frame once / Snap in your kit / Swap tiles forever.
export function HowItWorks() {
  const { howItWorks } = copy.home;

  return (
    <section className="paper-grain" aria-labelledby="how-it-works-heading">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-12">
          {/* Snap-on photo: shows a tile going onto the frame. */}
          <div className="order-last lg:order-first">
            <div className="plate-frame">
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-md">
                <Image
                  src="/gallery/install.jpg"
                  alt="Hands snapping a decorative tile onto a Festive Frames license plate frame"
                  fill
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  className="object-cover vintage-photo"
                />
              </div>
            </div>
          </div>

          {/* Steps */}
          <div>
            <h2
              id="how-it-works-heading"
              className="text-3xl font-bold uppercase tracking-tight text-brand-navy sm:text-4xl"
            >
              How it works
            </h2>
            <ol className="mt-8 space-y-6">
              {howItWorks.map((item, i) => (
                <li key={item.step} className="flex items-start gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-navy font-mkt-display text-lg font-bold text-brand-cream">
                    {i + 1}
                  </span>
                  <p className="text-xl font-semibold leading-snug text-brand-ink">
                    {item.step}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
