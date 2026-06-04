// ─────────────────────────────────────────────────────────────
// Lazily-initialized server-side Stripe client.
//
// We never instantiate Stripe at module load. The secret key may be
// absent during local builds and static generation, and a top-level
// `new Stripe(...)` would throw and break the build. Instead, callers
// invoke getStripe() at request time, inside try/catch, so a missing
// key degrades to a graceful runtime error instead of a build failure.
//
// SECURITY: this module is server-only. Never import it into a client
// component or expose STRIPE_SECRET_KEY to the browser.
// ─────────────────────────────────────────────────────────────

import Stripe from "stripe";

// Pin a recent, stable API version so Stripe behavior is deterministic
// across SDK upgrades and dashboard default changes.
const STRIPE_API_VERSION = "2026-05-27.dahlia";

let cachedClient: Stripe | null = null;

/**
 * Returns a singleton Stripe client built from STRIPE_SECRET_KEY.
 *
 * Throws a clear, catchable error if the key is missing so route
 * handlers can translate it into a graceful HTTP response. Never
 * called during static generation.
 */
export function getStripe(): Stripe {
  if (cachedClient) return cachedClient;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }

  cachedClient = new Stripe(secretKey, {
    apiVersion: STRIPE_API_VERSION,
    typescript: true,
  });

  return cachedClient;
}
