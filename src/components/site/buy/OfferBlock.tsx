"use client";

import { copy } from "@/content/copy";
import { offer, formatUsd, ALPHABET_ADDON } from "@/config/offers";
import { track } from "@/lib/analytics";
import { useBuyStore } from "./useBuyStore";
import { useCheckout } from "./useCheckout";

// Client island. The conversion core, rebuilt as a simple configurator:
// choose a pack (single or bundle), set quantity, optionally add the letter
// set, see a LIVE running total, then one Checkout button. Quantity multiplies
// the chosen pack; the letter set is a single +$10 add-on (one set). The server
// re-derives every amount, so this total is display-only and always matches.
export function OfferBlock() {
  const selection = useBuyStore((s) => s.selection);
  const setSelection = useBuyStore((s) => s.setSelection);
  const quantity = useBuyStore((s) => s.quantity);
  const setQuantity = useBuyStore((s) => s.setQuantity);
  const alphabetQty = useBuyStore((s) => s.alphabetQty);
  const setAlphabetQty = useBuyStore((s) => s.setAlphabetQty);

  const { checkout, pending, error } = useCheckout();

  const bundleSelected = selection === "bundle";
  const unitPrice = bundleSelected ? offer.bundlePrice : offer.singlePrice;
  const baseTotal = unitPrice * quantity;
  const addonTotal = ALPHABET_ADDON.priceCents * alphabetQty;
  const total = baseTotal + addonTotal;

  const unitNoun = bundleSelected ? "bundle" : "set";
  const setsTotal = bundleSelected ? quantity * 2 : quantity;
  const packTitle = bundleSelected
    ? copy.buy.offer.bundle.title
    : copy.buy.offer.single.title;

  function select(which: "single" | "bundle") {
    if (which !== selection) track("offer_selected", { selection: which });
    setSelection(which);
  }

  const cards = [
    {
      which: "single" as const,
      title: copy.buy.offer.single.title,
      price: offer.singlePrice,
      items: copy.buy.offer.single.items,
      selected: !bundleSelected,
      popular: false,
    },
    {
      which: "bundle" as const,
      title: copy.buy.offer.bundle.title,
      price: offer.bundlePrice,
      items: copy.buy.offer.bundle.items,
      selected: bundleSelected,
      popular: true,
    },
  ];

  return (
    <section className="paper-grain" aria-labelledby="offer-heading">
      <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-16">
        <h2
          id="offer-heading"
          className="text-center text-2xl font-bold uppercase tracking-tight text-brand-navy sm:text-3xl"
        >
          One set, two ways to get it.
        </h2>
        <p className="mt-3 text-center text-sm text-brand-ink/70">
          Pick a pack, set your quantity, and add the letter set if you want it.
        </p>

        {/* Selectable packs (choose, not buy) */}
        <div className="mt-8 grid items-stretch gap-6 lg:grid-cols-2">
          {cards.map((card) => (
            <button
              key={card.which}
              type="button"
              onClick={() => select(card.which)}
              aria-pressed={card.selected}
              aria-label={`Select ${card.title}, ${formatUsd(card.price)}`}
              className={`relative flex h-full flex-col rounded-xl border-2 bg-brand-cream-soft p-6 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy ${
                card.popular ? "shadow-lg" : ""
              } ${
                card.selected
                  ? "border-brand-red"
                  : "border-brand-navy/15 hover:border-brand-navy/40"
              }`}
            >
              {card.popular && (
                <span className="absolute -top-3 left-6 rounded-full bg-brand-red px-3 py-1 font-mkt-display text-xs font-bold uppercase tracking-widest text-brand-white">
                  {offer.mostPopularBadge}
                </span>
              )}
              <div className={`flex items-baseline justify-between ${card.popular ? "mt-2" : ""}`}>
                <h3 className="font-mkt-display text-xl font-bold uppercase tracking-tight text-brand-navy sm:text-2xl">
                  {card.title}
                </h3>
                <span className="font-mkt-display text-xl font-bold text-brand-navy sm:text-2xl">
                  {formatUsd(card.price)}
                </span>
              </div>
              <ul className="mt-4 flex-1 space-y-2 text-sm text-brand-ink/85">
                {card.items.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span aria-hidden="true" className="text-brand-red">
                      ✓
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              <span
                className={`mt-6 inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold uppercase tracking-wide ${
                  card.selected
                    ? "bg-brand-red text-brand-white"
                    : "border border-brand-navy text-brand-navy"
                }`}
              >
                {card.selected ? "Selected" : "Choose this"}
              </span>
            </button>
          ))}
        </div>

        {/* Configure: quantity + add-on + running total + one checkout */}
        <div className="mx-auto mt-8 max-w-md rounded-xl border border-brand-navy/15 bg-brand-cream-soft p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold uppercase tracking-wide text-brand-navy">
              Quantity
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setQuantity(quantity - 1)}
                disabled={quantity <= 1}
                aria-label="Decrease quantity"
                className="flex h-8 w-8 items-center justify-center rounded-md border border-brand-navy/30 text-lg text-brand-navy disabled:opacity-40"
              >
                −
              </button>
              <span
                aria-live="polite"
                className="w-6 text-center font-mkt-display text-lg font-bold text-brand-navy"
              >
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity(quantity + 1)}
                disabled={quantity >= 5}
                aria-label="Increase quantity"
                className="flex h-8 w-8 items-center justify-center rounded-md border border-brand-navy/30 text-lg text-brand-navy disabled:opacity-40"
              >
                +
              </button>
            </div>
          </div>
          <p className="mt-1 text-xs text-brand-ink/70">
            {quantity} {unitNoun}
            {quantity > 1 ? "s" : ""}
            {bundleSelected ? ` (${setsTotal} sets total)` : ""}
          </p>

          <div className="mt-4 flex items-start justify-between gap-3 border-t border-brand-navy/10 pt-4">
            <div className="text-sm text-brand-ink">
              A-Z &amp; 0-9 letter set{" "}
              <span className="font-semibold text-brand-navy">
                +{formatUsd(ALPHABET_ADDON.priceCents)} each
              </span>
              <span className="mt-0.5 block text-xs text-brand-ink/70">
                Add as many as you want to spell anything on the bottom bar.
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setAlphabetQty(alphabetQty - 1)}
                disabled={alphabetQty <= 0}
                aria-label="Fewer letter sets"
                className="flex h-8 w-8 items-center justify-center rounded-md border border-brand-navy/30 text-lg text-brand-navy disabled:opacity-40"
              >
                −
              </button>
              <span
                aria-live="polite"
                className="w-6 text-center font-mkt-display text-lg font-bold text-brand-navy"
              >
                {alphabetQty}
              </span>
              <button
                type="button"
                onClick={() => setAlphabetQty(alphabetQty + 1)}
                disabled={alphabetQty >= ALPHABET_ADDON.maxQty}
                aria-label="More letter sets"
                className="flex h-8 w-8 items-center justify-center rounded-md border border-brand-navy/30 text-lg text-brand-navy disabled:opacity-40"
              >
                +
              </button>
            </div>
          </div>

          <div className="mt-4 space-y-1 border-t border-brand-navy/10 pt-4 text-sm text-brand-ink/90">
            <div className="flex justify-between">
              <span>
                {quantity} x {packTitle}
              </span>
              <span>{formatUsd(baseTotal)}</span>
            </div>
            {alphabetQty > 0 && (
              <div className="flex justify-between">
                <span>{alphabetQty} x A-Z &amp; 0-9 letter set</span>
                <span>{formatUsd(addonTotal)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-brand-navy/10 pt-2 font-mkt-display text-base font-bold uppercase text-brand-navy">
              <span>Total</span>
              <span>{formatUsd(total)}</span>
            </div>
          </div>

          {/* Screen-reader-only running total. Visually hidden, announced
              politely whenever the selection, quantity, or add-on changes. */}
          <span aria-live="polite" className="sr-only">
            {quantity} {packTitle}
            {quantity > 1 ? "s" : ""}
            {alphabetQty > 0
              ? ` and ${alphabetQty} letter set${alphabetQty > 1 ? "s" : ""}`
              : ""}
            . Total {formatUsd(total)}.
          </span>

          <button
            type="button"
            onClick={() => checkout()}
            disabled={pending}
            className="mt-4 inline-flex w-full items-center justify-center rounded-md bg-brand-red px-6 py-3.5 text-base font-semibold uppercase tracking-wide text-brand-white transition-colors hover:bg-brand-red/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold disabled:opacity-70"
          >
            {pending ? "Starting checkout..." : `Checkout · ${formatUsd(total)}`}
          </button>

          <p className="mt-3 text-center text-xs text-brand-ink/70">
            {copy.buy.guarantee}
          </p>
          {error && (
            <p role="alert" className="mt-2 text-center text-sm font-medium text-brand-red">
              {error}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
