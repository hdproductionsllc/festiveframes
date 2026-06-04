// ─────────────────────────────────────────────────────────────
// Purchase offer configuration (single kit vs. 2-kit bundle).
//
// PRICING IS FIXED AND FLAT:
//   - One kit is ALWAYS 3900 cents ($39).
//   - Any 2-kit bundle is ALWAYS 6900 cents ($69), regardless of
//     which two kits are chosen. There is NO dynamic bundle math,
//     NO $79 bundle, and NO per-kit discount logic.
//
// The values below are for display only. The server re-derives the
// authoritative price at checkout in a later phase; never trust a
// client-supplied amount.
// ─────────────────────────────────────────────────────────────

export type OfferSelection = "single" | "bundle";

export interface Offer {
  /** Price of a single kit, in cents. */
  singlePrice: number;
  /** Price of any 2-kit bundle, in cents. ALWAYS this, no exceptions. */
  bundlePrice: number;
  /** Which option is pre-selected in the UI. */
  defaultSelection: OfferSelection;
  /** Badge text shown on the recommended option. */
  mostPopularBadge: string;
  /** ISO 4217 currency code for Stripe and Intl formatting. */
  currency: string;
}

export const offer: Offer = {
  singlePrice: 3900,
  bundlePrice: 6900, // ALWAYS 6900 for any 2 kits, no dynamic math
  defaultSelection: "bundle",
  mostPopularBadge: "Most Popular",
  currency: "usd",
};

/**
 * Display-only price lookup, in cents.
 *   single -> 3900
 *   bundle -> 6900
 * The server re-derives the real price authoritatively at checkout.
 */
export function priceFor(selection: OfferSelection): number {
  return selection === "bundle" ? offer.bundlePrice : offer.singlePrice;
}

/**
 * Formats a cents amount as a display price string. Whole-dollar amounts drop
 * the ".00" (3900 -> "$39"); otherwise two decimals (500 -> "$5"). Use this
 * everywhere a price is shown so all prose stays in sync with this config.
 */
export function formatUsd(cents: number): string {
  const dollars = cents / 100;
  return Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}
