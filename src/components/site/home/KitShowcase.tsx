import Link from "next/link";
import Image from "next/image";
import { getKit } from "@/config/kits";
import { offer, formatUsd } from "@/config/offers";
import { copy } from "@/content/copy";
import { FoundingScarcity } from "@/components/site/FoundingScarcity";

// Server Component. Single-product feature for the Freedom Frame Set (our one
// launch kit), framed as the America's-250th Founding Edition. Two-column
// image + details so one product reads as a hero, not a lonely card in a grid.
export function KitShowcase() {
  const kit = getKit("american-classic");
  const items = copy.buy.whatsInKit.items;

  return (
    <section className="star-field text-brand-cream" aria-labelledby="kit-heading">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:gap-12">
        {/* Product image — a real built design */}
        <div className="order-first lg:order-last">
          <div className="plate-frame">
            <div className="relative aspect-[1.86] w-full overflow-hidden rounded-md bg-brand-navy-soft/40">
              <Image
                src="/designs/design-250.png"
                alt="Freedom Frame Set decorated for America's 250th: a snap-on license plate frame with a 250 YEARS top bar and patriotic tiles - American flags, stars, fireworks, liberty bells, and 1776 to 2026"
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-contain"
              />
            </div>
          </div>
        </div>

        {/* Details */}
        <div>
          <FoundingScarcity dark />
          <h2
            id="kit-heading"
            className="mt-4 font-mkt-display text-3xl font-bold uppercase tracking-tight text-brand-cream sm:text-4xl"
          >
            Meet the Freedom Frame Set
          </h2>
          {kit?.identityLine && (
            <p className="mt-2 text-lg font-semibold text-brand-gold">{kit.identityLine}</p>
          )}
          <p className="mt-4 text-lg leading-relaxed text-brand-cream/85">
            Our Founding Edition for America&rsquo;s 250th. The frame installs in seconds, then 40+
            snap-on tiles, including the new firework bursts, let you restyle it for the Fourth, a
            parade, game day, or any season, as often as you like.
          </p>

          <ul className="mt-6 space-y-2.5">
            {items.map((it) => (
              <li key={it} className="flex gap-2.5 leading-relaxed text-brand-cream/85">
                <span aria-hidden="true" className="mt-1 shrink-0 text-brand-gold">★</span>
                <span>{it}</span>
              </li>
            ))}
          </ul>

          <p className="mt-6 text-lg font-semibold text-brand-cream">
            One set {formatUsd(offer.singlePrice)}
            <span className="text-brand-cream/60"> · </span>
            Two for {formatUsd(offer.bundlePrice)}
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="#get-yours"
              className="inline-flex items-center justify-center rounded-md bg-brand-red px-6 py-3 text-base font-semibold uppercase tracking-wide text-brand-white transition-colors hover:bg-brand-red/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold"
            >
              {copy.home.founding.cta}
            </Link>
            <Link
              href="/buy"
              className="inline-flex items-center justify-center rounded-md border border-brand-gold/70 px-6 py-3 text-base font-semibold uppercase tracking-wide text-brand-gold transition-colors hover:bg-brand-gold hover:text-brand-navy-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold"
            >
              See everything inside
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
