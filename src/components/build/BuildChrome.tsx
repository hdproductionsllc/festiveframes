"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { track } from "@/lib/analytics";
import { OnboardingPopup } from "./OnboardingPopup";

/**
 * Client-side cross-sell chrome + onboarding for /build.
 *
 * Rendered as siblings to <Designer/> so the designer's self-contained
 * full-viewport layout (min-h-screen flex flex-col) is never wrapped or
 * altered. All additions are fixed-position overlays in the dark workbench
 * theme. Fires the builder_open analytics event exactly once on mount.
 *
 * Layout choice: the designer already renders its own "Festive Frames" wordmark
 * top-left and an "Order This Design" CTA top-right. To avoid duplicating the
 * wordmark or risking its 100vh assumptions, the cross-sell additions are fixed
 * overlays anchored at the BOTTOM edge — a home link + subtle intro line at
 * bottom-left, and a persistent "Start with a kit" pill at bottom-right.
 */
export function BuildChrome() {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    track("builder_open");
  }, []);

  return (
    <>
      {/* Home link, bottom-left. */}
      <div
        className="fixed left-4 bottom-4 z-40 hidden md:flex max-w-xs flex-col gap-1"
        style={{
          left: "max(1rem, env(safe-area-inset-left))",
          bottom: "max(1rem, env(safe-area-inset-bottom))",
        }}
      >
        <Link
          href="/"
          className="w-fit text-xs font-medium text-surface-400 hover:text-surface-100
            focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold
            focus-visible:ring-offset-2 focus-visible:ring-offset-surface-900
            rounded transition-colors"
        >
          ← Festive Frames home
        </Link>
      </div>

      <OnboardingPopup />
    </>
  );
}
