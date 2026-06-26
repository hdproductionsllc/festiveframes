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

/** Hard ceiling on frames in one cart, so production can't be swamped. */
export const MAX_CART_FRAMES = 10;

/**
 * Authoritative bulk price for N total frames, in cents — PAIRS pricing:
 * every two frames is the $69 bundle, any leftover frame is $39.
 *   1 -> 3900   2 -> 6900   3 -> 10800   4 -> 13800 …
 * Used for display AND re-derived server-side at cart checkout. Never trust a
 * client-supplied amount.
 */
export function priceForFramesCents(frames: number): number {
  const n = Math.max(0, Math.floor(frames));
  return Math.floor(n / 2) * offer.bundlePrice + (n % 2) * offer.singlePrice;
}

/** Savings vs. paying the flat single price for every frame (>= 0). */
export function bulkSavingsCents(frames: number): number {
  const n = Math.max(0, Math.floor(frames));
  return Math.max(0, n * offer.singlePrice - priceForFramesCents(n));
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

/**
 * Optional checkout add-on: the full A-Z & 0-9 letter set for the bottom bar.
 * Server-priced like everything else; the client only ever sends a boolean.
 *
 * PARKED (June 2026): the letter set is not part of the current offering but
 * may come back. `enabled: false` hides the UI stepper and makes the checkout
 * API ignore any letter-set quantity. To relaunch, flip `enabled` to true —
 * all UI, pricing, and order-metadata plumbing stays intact.
 */
export const ALPHABET_ADDON = {
  enabled: false,
  priceCents: 1000,
  productName: "Full A-Z & 0-9 Letter Set",
  maxQty: 20,
};
