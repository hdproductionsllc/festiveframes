"use client";

import { useEffect } from "react";
import Image from "next/image";
import { copy } from "@/content/copy";
import { getKit } from "@/config/kits";
import { offer, priceFor, formatUsd } from "@/config/offers";
import { season } from "@/config/season";
import { useBuyStore } from "./useBuyStore";
import { useCheckout } from "./useCheckout";

// Client island. Above-the-fold hero: the selected kit's finished-look photo,
// the page h1/subhead, the current price, and the primary Buy button. This is
// also where the store hydrates from ?kit= / localStorage on first mount.
//
// Nothing but hero, headline, price, and buy button lives above the fold.
export function BuyHero({ initialKit }: { initialKit: string | null }) {
  const hydrate = useBuyStore((s) => s.hydrate);
  const selectedKitId = useBuyStore((s) => s.selectedKitId);
  const selection = useBuyStore((s) => s.selection);
  const promoClaimed = useBuyStore((s) => s.promoClaimed);

  const { checkout, pending, error } = useCheckout();

  // Hydrate exactly once from the server-provided ?kit= value.
  useEffect(() => {
    hydrate(initialKit);
  }, [hydrate, initialKit]);

  const kit = getKit(selectedKitId) ?? getKit(initialKit ?? "american-classic")!;
  const price = formatUsd(priceFor(selection));
  const selectionLabel =
    selection === "bundle"
      ? `${copy.buy.offer.bundle.title} - ${formatUsd(offer.bundlePrice)}`
      : `${kit.name} - ${formatUsd(offer.singlePrice)}`;

  return (
    <section className="star-field text-brand-cream" aria-labelledby="buy-h1">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 sm:py-16 lg:grid-cols-2 lg:gap-12">
        {/* Selected kit photo (swaps with the picker selection). */}
        <div className="order-first lg:order-last">
          <div className="plate-frame">
            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-md bg-brand-navy-soft/40">
              <Image
                src={kit.thumbnailImage}
                alt={`${kit.name} snap-on license plate frame kit on a car. ${kit.identityLine}`}
                fill
                priority
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover vintage-photo"
              />
              {kit.limited && (
                <span className="absolute left-3 top-3 rounded-sm bg-brand-gold px-2 py-1 font-mkt-display text-xs font-bold uppercase tracking-widest text-brand-navy-deep">
                  Limited
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Copy + buy column */}
        <div>
          <h1
            id="buy-h1"
            className="font-mkt-display text-4xl font-bold uppercase leading-[1.05] tracking-tight text-brand-cream sm:text-5xl"
          >
            {copy.buy.h1}
          </h1>
          <p className="mt-4 max-w-md text-lg leading-relaxed text-brand-cream/85">
            {copy.buy.subhead}
          </p>

          <p className="mt-6 font-mkt-display text-2xl font-bold uppercase tracking-tight text-brand-gold">
            {selectionLabel}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => checkout()}
              disabled={pending}
              className="inline-flex items-center justify-center rounded-md bg-brand-red px-7 py-3.5 text-base font-semibold uppercase tracking-wide text-brand-white transition-colors hover:bg-brand-red/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold disabled:opacity-70"
            >
              {pending ? "Starting checkout..." : `Buy Now - ${price}`}
            </button>

            {promoClaimed && (
              <span
                className="inline-flex items-center gap-1.5 rounded-md border border-brand-gold/70 bg-brand-gold/15 px-3 py-2 text-sm font-semibold uppercase tracking-wide text-brand-gold"
                aria-label={`Promo code ${season.promo.code} applies at checkout`}
              >
                <span aria-hidden="true">★</span>
                Code {season.promo.code} ready at checkout
              </span>
            )}
          </div>

          <p className="mt-3 text-sm text-brand-cream/75">{copy.buy.ctaSubline}</p>

          {error && (
            <p role="alert" className="mt-3 text-sm font-medium text-brand-gold">
              {error}
            </p>
          )}
        </div>
      </div>
      <div className="candy-stripe" aria-hidden="true" />
    </section>
  );
}
