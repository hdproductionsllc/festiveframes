import Link from "next/link";
import Image from "next/image";
import { copy } from "@/content/copy";
import { FoundingScarcity } from "@/components/site/FoundingScarcity";

// Server Component. Homepage hero. Holds the single <h1> for the page.
// Dark navy star-field band so the cream sections below feel like daylight.
export function Hero() {
  const { heroH1, heroSubhead, primaryCta, secondaryCta, founding } = copy.home;

  return (
    <section className="star-field text-brand-cream">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:gap-12 lg:py-24">
        {/* Copy column */}
        <div>
          <FoundingScarcity dark />
          <h1 className="mt-4 font-mkt-display text-4xl font-bold uppercase leading-[1.05] tracking-tight text-brand-cream sm:text-5xl lg:text-6xl">
            {heroH1}
          </h1>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-brand-cream/85">
            {heroSubhead}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href={primaryCta.href}
              className="inline-flex items-center justify-center rounded-md bg-brand-red px-6 py-3 text-base font-semibold uppercase tracking-wide text-brand-white transition-colors hover:bg-brand-red/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold"
            >
              {founding.cta}
            </Link>
            <Link
              href={secondaryCta.href}
              className="inline-flex items-center justify-center rounded-md border border-brand-gold/70 px-6 py-3 text-base font-semibold uppercase tracking-wide text-brand-gold transition-colors hover:bg-brand-gold hover:text-brand-navy-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold"
            >
              {secondaryCta.label}
            </Link>
          </div>
        </div>

        {/* Image column. Hero photo: installed frame on a car, golden hour.
            Swap public/season/july4-2026-hero.webp to update (see tasks/IMAGE_MANIFEST.md). */}
        <div className="order-first lg:order-last">
          <div className="plate-frame">
            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-md">
              <Image
                src="/season/july4-2026-hero.png"
                alt="A Festive Frames kit snapped onto the license plate of a parked car at golden hour, red, white and blue star and firework tiles around the border"
                fill
                priority
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover vintage-photo"
              />
            </div>
          </div>
        </div>
      </div>
      <div className="candy-stripe" aria-hidden="true" />
    </section>
  );
}
