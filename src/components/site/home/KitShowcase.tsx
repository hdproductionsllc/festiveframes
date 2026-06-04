import Link from "next/link";
import Image from "next/image";
import { getActiveKits } from "@/config/kits";
import { offer, formatUsd } from "@/config/offers";

// Server Component. One card per active kit. Card headings double as SEO
// phrases (patriotic / funny / St. Louis pride / game day / family road trip /
// July 4 limited edition license plate frame kit). Cards share one photo
// framing so they read as a single product family. The limited kit shows a
// "Limited" badge. Each card links to /buy?kit=<id> for selection persistence.
export function KitShowcase() {
  const kits = getActiveKits();

  return (
    <section className="star-field text-brand-cream" aria-labelledby="kits-heading">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="max-w-2xl">
          <h2
            id="kits-heading"
            className="text-3xl font-bold uppercase tracking-tight text-brand-cream sm:text-4xl"
          >
            Six kits, each one already someone.
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-brand-cream/80">
            Pick the kit that reads like you. Every kit is{" "}
            {formatUsd(offer.singlePrice)} and arrives complete. Add a second
            kit for {formatUsd(offer.bundlePrice)}.
          </p>
        </div>

        <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {kits.map((kit) => (
            <li
              key={kit.id}
              className="group flex flex-col overflow-hidden rounded-lg border border-brand-navy-soft/50 bg-brand-navy-soft/30"
            >
              {/* Thumbnail.
                  PLACEHOLDER: catalog thumbnail per kit, 800x1000 (4:5 portrait).
                  Consistent framing across all cards so they read as one family. */}
              <div className="relative aspect-[4/5] overflow-hidden bg-brand-navy-soft/50">
                <Image
                  src={kit.thumbnailImage}
                  alt={`${kit.name} snap-on license plate frame kit on a car. ${kit.identityLine}`}
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover vintage-photo transition-transform duration-300 group-hover:scale-[1.03]"
                />
                {kit.limited && (
                  <span className="absolute left-3 top-3 rounded-sm bg-brand-gold px-2 py-1 font-mkt-display text-xs font-bold uppercase tracking-widest text-brand-navy-deep">
                    Limited
                  </span>
                )}
              </div>

              <div className="flex flex-1 flex-col p-5">
                <h3 className="font-mkt-display text-xl font-bold uppercase tracking-tight text-brand-cream">
                  {kit.name}
                </h3>
                <p className="mt-2 text-sm font-medium text-brand-gold">
                  {kit.identityLine}
                </p>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-brand-cream/80">
                  {kit.cardLine}
                </p>

                <Link
                  href={`/buy?kit=${kit.id}`}
                  className="mt-5 inline-flex items-center gap-1 self-start rounded-md border border-brand-gold/70 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-brand-gold transition-colors hover:bg-brand-gold hover:text-brand-navy-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold"
                  aria-label={`Shop the ${kit.name}`}
                >
                  Shop this kit
                  <span aria-hidden="true">&rarr;</span>
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
