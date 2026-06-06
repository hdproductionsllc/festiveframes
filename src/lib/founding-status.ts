import { unstable_cache } from "next/cache";
import { getStripe } from "@/lib/stripe";
import { FOUNDING } from "@/config/founding";

// Dynamic Founding-Edition count. FOUNDING.claimed is a real base offset
// (offline/pre-orders); on top of it we add kits sold through Stripe so the
// "X of 250 left" countdown actually ticks down on every paid order. Cached for
// 2 minutes so the homepage stays fast and we don't hammer the Stripe API.

async function countStripeKits(): Promise<number> {
  let stripe;
  try {
    stripe = getStripe();
  } catch {
    return 0; // Stripe not configured (build/preview) — fall back to the base offset.
  }
  let kits = 0;
  try {
    for await (const s of stripe.checkout.sessions.list({ limit: 100 })) {
      if (s.payment_status !== "paid") continue;
      const k = Number(s.metadata?.founding_kits ?? "0");
      if (Number.isFinite(k) && k > 0) kits += k;
    }
  } catch {
    return 0;
  }
  return kits;
}

const cachedKits = unstable_cache(countStripeKits, ["founding-kits-sold"], { revalidate: 120 });

export interface FoundingCounts {
  claimed: number;
  remaining: number;
  cap: number;
}

export async function getFoundingCounts(): Promise<FoundingCounts> {
  let sold = 0;
  try {
    sold = await cachedKits();
  } catch {
    sold = 0;
  }
  const claimed = Math.min(FOUNDING.cap, FOUNDING.claimed + sold);
  return { claimed, remaining: Math.max(0, FOUNDING.cap - claimed), cap: FOUNDING.cap };
}
