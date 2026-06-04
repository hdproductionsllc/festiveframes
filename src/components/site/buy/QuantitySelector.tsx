"use client";

import { useBuyStore, MIN_QTY, MAX_QTY } from "./useBuyStore";

// Small client control. Quantity 1-5, shared across both offer cards. The
// label adapts: bundles count bundles, single counts kits.
export function QuantitySelector() {
  const quantity = useBuyStore((s) => s.quantity);
  const selection = useBuyStore((s) => s.selection);
  const setQuantity = useBuyStore((s) => s.setQuantity);

  const noun = selection === "bundle" ? "bundles" : "kits";

  return (
    <div className="flex items-center justify-center gap-3">
      <span id="qty-label" className="text-sm font-medium text-brand-ink/80">
        Quantity
      </span>
      <div className="inline-flex items-center rounded-md border border-brand-navy/30">
        <button
          type="button"
          onClick={() => setQuantity(quantity - 1)}
          disabled={quantity <= MIN_QTY}
          aria-label="Decrease quantity"
          className="px-3 py-1.5 text-lg font-bold text-brand-navy disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy"
        >
          &minus;
        </button>
        <span
          aria-live="polite"
          aria-labelledby="qty-label"
          className="min-w-10 px-2 text-center font-mkt-display text-base font-bold tabular-nums text-brand-navy"
        >
          {quantity}
        </span>
        <button
          type="button"
          onClick={() => setQuantity(quantity + 1)}
          disabled={quantity >= MAX_QTY}
          aria-label="Increase quantity"
          className="px-3 py-1.5 text-lg font-bold text-brand-navy disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy"
        >
          +
        </button>
      </div>
      <span className="sr-only">{noun}</span>
    </div>
  );
}
