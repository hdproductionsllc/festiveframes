"use client";

import Link from "next/link";
import { formatUsd, offer } from "@/config/offers";

/**
 * Persistent cross-sell CTA for the /build designer.
 *
 * The designer (src/components/designer/Designer.tsx) is a self-contained
 * full-viewport app (min-h-screen flex flex-col) that owns its own header and
 * layout. To avoid altering its flow or risking its 100vh assumptions, this CTA
 * is a FIXED floating pill anchored bottom-right, layered above the designer UI.
 * It uses dark-workbench styling (NOT the navy/cream marketing header, which
 * would clash) and respects the iOS safe-area inset so it is never clipped.
 */
export function StartWithKitPill() {
  return (
    <Link
      href="/buy"
      className="fixed z-40 right-4 bottom-4 inline-flex items-center gap-2
        rounded-full px-5 py-3 text-sm font-bold text-black
        bg-gradient-to-r from-brand-gold to-yellow-500
        shadow-[0_4px_20px_rgba(0,0,0,0.45)]
        hover:from-yellow-400 hover:to-yellow-500
        active:scale-95 transition-all
        focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold
        focus-visible:ring-offset-2 focus-visible:ring-offset-surface-900"
      style={{
        right: "max(1rem, env(safe-area-inset-right))",
        bottom: "max(1rem, env(safe-area-inset-bottom))",
      }}
    >
      Start with a kit - {formatUsd(offer.singlePrice)}
    </Link>
  );
}
