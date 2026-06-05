"use client";

import { copy } from "@/content/copy";
import { getKit } from "@/config/kits";
import { priceFor, formatUsd, ALPHABET_ADDON } from "@/config/offers";
import { useBuyStore } from "./useBuyStore";
import { useCheckout } from "./useCheckout";

// Client island. Always-visible mobile buy bar pinned to the bottom of the
// viewport. Shows the current selection and price and triggers checkout with
// whatever is currently selected. Hidden on large screens where the offer
// cards and hero button are always reachable.
export function StickyBuyBar() {
  const selectedKitId = useBuyStore((s) => s.selectedKitId);
  const selection = useBuyStore((s) => s.selection);
  const quantity = useBuyStore((s) => s.quantity);
  const alphabetQty = useBuyStore((s) => s.alphabetQty);
  const { checkout, pending } = useCheckout();

  const kit = getKit(selectedKitId);
  // Live total that matches exactly what the server will charge.
  const total =
    priceFor(selection) * quantity + ALPHABET_ADDON.priceCents * alphabetQty;
  const label =
    selection === "bundle"
      ? `${copy.buy.offer.bundle.title} - ${formatUsd(total)}`
      : `${kit?.name ?? "Kit"} - ${formatUsd(total)}`;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-brand-navy/20 bg-brand-cream-soft/95 backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <span className="font-mkt-display text-sm font-bold uppercase tracking-wide text-brand-navy">
          {label}
        </span>
        <button
          type="button"
          onClick={() => checkout()}
          disabled={pending}
          className="inline-flex shrink-0 items-center justify-center rounded-md bg-brand-red px-5 py-2.5 text-sm font-semibold uppercase tracking-wide text-brand-white transition-colors hover:bg-brand-red/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold disabled:opacity-70"
        >
          {pending ? "..." : `Buy Now - ${formatUsd(total)}`}
        </button>
      </div>
    </div>
  );
}
