"use client";

import { useCallback, useState } from "react";
import { copy } from "@/content/copy";
import { track } from "@/lib/analytics";
import { useBuyStore } from "./useBuyStore";

// ─────────────────────────────────────────────────────────────
// Shared checkout trigger. Builds THE CHECKOUT CONTRACT body purely
// from store state and POSTs it to /api/checkout, then redirects the
// browser to the returned Stripe Checkout url.
//
//   request:  { selection, kitIds, quantity }
//   response: 200 { url }  ->  window.location.href = url
//
// The client NEVER sends a price. The server is the pricing authority.
// On any failure we surface a single friendly message and never leak
// raw error text.
// ─────────────────────────────────────────────────────────────

interface CheckoutResponse {
  url?: string;
  error?: string;
}

export function useCheckout() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkout = useCallback(async (selectionOverride?: "single" | "bundle") => {
    if (pending) return;
    setError(null);
    setPending(true);

    // Read fresh state at click time (not stale render-time values).
    const { selectedKitId, secondKitId, quantity } = useBuyStore.getState();
    const selection = selectionOverride ?? useBuyStore.getState().selection;

    const kitIds =
      selection === "bundle" ? [selectedKitId, secondKitId] : [selectedKitId];

    // Funnel: the buy intent, fired before any network work. kitIds is a
    // comma-joined string per the analytics contract (props are primitives).
    const kitIdsCsv = kitIds.join(",");
    track("buy_click", { selection, kitIds: kitIdsCsv, page: "buy" });

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selection, kitIds, quantity }),
      });

      const data = (await res.json().catch(() => ({}))) as CheckoutResponse;

      if (!res.ok || !data.url) {
        setError(copy.buy.checkoutError);
        setPending(false);
        return;
      }

      // Funnel: confirmed redirect to Stripe, fired immediately before we
      // hand off the browser.
      track("checkout_start", { selection, kitIds: kitIdsCsv });

      // Hand off to Stripe. Leave pending=true so the button stays disabled
      // through the navigation; the page unloads on redirect.
      window.location.href = data.url;
    } catch {
      setError(copy.buy.checkoutError);
      setPending(false);
    }
  }, [pending]);

  return { checkout, pending, error };
}
