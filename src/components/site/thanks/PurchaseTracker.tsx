"use client";

import { useEffect, useRef } from "react";
import { track } from "@/lib/analytics";

// Tiny client island for the /thanks page. The page itself is a Server
// Component that retrieves the real Stripe session, so this island receives
// the already-derived order summary as props and fires the single funnel
// `purchase` event once, on mount. A ref guards against a double-fire from
// React re-renders / Strict Mode. It renders nothing.

interface PurchaseTrackerProps {
  selection: "single" | "bundle" | "";
  /** Comma-joined kit ids (analytics contract: props are primitives). */
  kitIds: string;
  quantity: number;
}

export function PurchaseTracker({ selection, kitIds, quantity }: PurchaseTrackerProps) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    track("purchase", { selection, kitIds, quantity });
  }, [selection, kitIds, quantity]);

  return null;
}
