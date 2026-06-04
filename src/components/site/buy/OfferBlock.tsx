"use client";

import { useState } from "react";
import { copy } from "@/content/copy";
import { getKit } from "@/config/kits";
import { offer, formatUsd, ALPHABET_ADDON } from "@/config/offers";
import { track } from "@/lib/analytics";
import { useBuyStore, ACTIVE_KITS } from "./useBuyStore";
import { useCheckout } from "./useCheckout";
import { QuantitySelector } from "./QuantitySelector";

// Client island. The conversion core: exactly two cards. Card A (single) reads
// as complete, never lesser. Card B (bundle) is preselected and visually
// dominant with the "Most Popular" badge. No save math, no strikethroughs, no
// percentages. The bundle's optional "mix kits" control reveals a second-kit
// picker (one extra tap, never required).
export function OfferBlock() {
  const selectedKitId = useBuyStore((s) => s.selectedKitId);
  const secondKitId = useBuyStore((s) => s.secondKitId);
  const selection = useBuyStore((s) => s.selection);
  const setSelection = useBuyStore((s) => s.setSelection);
  const setSecondKit = useBuyStore((s) => s.setSecondKit);
  const addAlphabet = useBuyStore((s) => s.addAlphabet);
  const setAddAlphabet = useBuyStore((s) => s.setAddAlphabet);

  const { checkout, pending, error } = useCheckout();
  const [mixOpen, setMixOpen] = useState(false);

  const selectedKit = getKit(selectedKitId);
  const bundleSelected = selection === "bundle";
  // Single-product launch: with one active kit there is no second kit to mix,
  // so the bundle is simply two of the one set and the mix control is hidden.
  const multipleKits = ACTIVE_KITS.length > 1;

  function buy(which: "single" | "bundle") {
    // Record an offer toggle only when the choice actually changes.
    if (which !== selection) {
      track("offer_selected", { selection: which });
    }
    setSelection(which);
    void checkout(which);
  }

  return (
    <section className="paper-grain" aria-labelledby="offer-heading">
      <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-16">
        <h2
          id="offer-heading"
          className="text-center text-2xl font-bold uppercase tracking-tight text-brand-navy sm:text-3xl"
        >
          One set, two ways to get it.
        </h2>

        <div className="mt-10 grid items-stretch gap-6 lg:grid-cols-2">
          {/* CARD A - single kit. Complete on its own. */}
          <div
            className={`flex h-full flex-col rounded-xl border bg-brand-cream-soft p-6 transition-colors ${
              !bundleSelected ? "border-brand-red" : "border-brand-navy/15"
            }`}
          >
            <h3 className="font-mkt-display text-xl font-bold uppercase tracking-tight text-brand-navy">
              {copy.buy.offer.single.title} - {formatUsd(offer.singlePrice)}
            </h3>
            <ul className="mt-4 flex-1 space-y-2 text-sm text-brand-ink/85">
              <li className="flex gap-2">
                <span aria-hidden="true" className="text-brand-red">
                  ✓
                </span>
                Frame
              </li>
              <li className="flex gap-2">
                <span aria-hidden="true" className="text-brand-red">
                  ✓
                </span>
                {selectedKit ? `${selectedKit.name} tile set` : "The kit's tile set"}
              </li>
              <li className="flex gap-2">
                <span aria-hidden="true" className="text-brand-red">
                  ✓
                </span>
                Starter alphabet tiles
              </li>
            </ul>
            <button
              type="button"
              onClick={() => buy("single")}
              disabled={pending}
              className="mt-6 inline-flex items-center justify-center rounded-md border border-brand-navy px-6 py-3 text-base font-semibold uppercase tracking-wide text-brand-navy transition-colors hover:bg-brand-navy hover:text-brand-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy disabled:opacity-70"
            >
              {pending && !bundleSelected ? "Starting checkout..." : copy.buy.offer.single.cta}
            </button>
          </div>

          {/* CARD B - bundle. Preselected, dominant, badged. */}
          <div
            className={`relative flex h-full flex-col rounded-xl border-2 bg-brand-cream-soft p-6 shadow-lg ${
              bundleSelected ? "border-brand-red" : "border-brand-navy/25"
            }`}
          >
            <span className="absolute -top-3 left-6 rounded-full bg-brand-red px-3 py-1 font-mkt-display text-xs font-bold uppercase tracking-widest text-brand-white">
              {offer.mostPopularBadge}
            </span>

            <h3 className="mt-2 font-mkt-display text-2xl font-bold uppercase tracking-tight text-brand-navy">
              {copy.buy.offer.bundle.title} - {formatUsd(offer.bundlePrice)}
            </h3>
            <ul className="mt-4 flex-1 space-y-2 text-sm text-brand-ink/85">
              {copy.buy.offer.bundle.items.map((item) => (
                <li key={item} className="flex gap-2">
                  <span aria-hidden="true" className="text-brand-red">
                    ✓
                  </span>
                  {item}
                </li>
              ))}
            </ul>

            {/* Optional mix-kits control. Only meaningful when there is more
                than one active kit. With a single product the bundle is simply
                two of the one set, so the control is hidden. Never required;
                default = two of the same. */}
            {multipleKits && (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => setMixOpen((v) => !v)}
                  aria-expanded={mixOpen}
                  aria-controls="mix-kit-picker"
                  className="text-sm font-semibold text-brand-navy underline underline-offset-4 hover:text-brand-red focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy"
                >
                  {copy.buy.offer.bundle.mixLabel}
                  {secondKitId !== selectedKitId ? ` (${getKit(secondKitId)?.name})` : ""}
                </button>

                {mixOpen && (
                  <div id="mix-kit-picker" className="mt-3">
                    <label
                      htmlFor="second-kit"
                      className="block text-xs font-medium uppercase tracking-wide text-brand-ink/70"
                    >
                      Second kit
                    </label>
                    <select
                      id="second-kit"
                      value={secondKitId}
                      onChange={(e) => setSecondKit(e.target.value)}
                      className="mt-1 w-full rounded-md border border-brand-navy/30 bg-brand-white px-3 py-2 text-sm text-brand-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy"
                    >
                      {ACTIVE_KITS.map((kit) => (
                        <option key={kit.id} value={kit.id}>
                          {kit.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => buy("bundle")}
              disabled={pending}
              className="mt-6 inline-flex items-center justify-center rounded-md bg-brand-red px-6 py-3 text-base font-semibold uppercase tracking-wide text-brand-white transition-colors hover:bg-brand-red/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold disabled:opacity-70"
            >
              {pending && bundleSelected ? "Starting checkout..." : copy.buy.offer.bundle.cta}
            </button>
          </div>
        </div>

        <label className="mx-auto mt-6 flex max-w-md cursor-pointer items-start gap-3 rounded-lg border border-brand-navy/15 bg-brand-cream-soft px-4 py-3 text-sm text-brand-ink">
          <input
            type="checkbox"
            checked={addAlphabet}
            onChange={(e) => setAddAlphabet(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-brand-red"
          />
          <span>
            Add the full A-Z &amp; 0-9 letter set{" "}
            <span className="font-semibold text-brand-navy">
              +{formatUsd(ALPHABET_ADDON.priceCents)}
            </span>
            <span className="mt-0.5 block text-xs text-brand-ink/70">
              Spell anything you want on the bottom bar.
            </span>
          </span>
        </label>

        <div className="mt-8">
          <QuantitySelector />
        </div>

        <p className="mt-6 text-center text-sm text-brand-ink/80">{copy.buy.guarantee}</p>

        {error && (
          <p role="alert" className="mt-3 text-center text-sm font-medium text-brand-red">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
