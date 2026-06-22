"use client";

import type { CSSProperties } from "react";
import { useCheckout } from "@/components/site/buy/useCheckout";

// Sticker-styled checkout button. Reuses the SAME useCheckout hook the classic
// /buy page uses: it POSTs the selection to /api/checkout and redirects to
// Stripe. The client never sends a price — the server is the pricing authority —
// so this on-page buy is fully functional and identical to the classic flow.
// The buy store's defaults (kit = american-classic, quantity = 1) are valid, so
// no hydration is required for a one-click purchase from the homepage.
export function BuyButton({
  selection,
  label,
  className,
  style,
}: {
  selection: "single" | "bundle";
  label: string;
  className?: string;
  style?: CSSProperties;
}) {
  const { checkout, pending, error } = useCheckout();

  return (
    <>
      <button
        type="button"
        onClick={() => checkout(selection)}
        disabled={pending}
        className={className}
        style={style}
      >
        {pending ? "Starting checkout…" : label}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-center text-[13px] font-bold text-[#ed5aa0]">
          {error}
        </p>
      )}
    </>
  );
}
