"use client";

import { useEffect, useState } from "react";
import { TileGrid } from "./TileGrid";
import { QuickActions } from "@/components/designer/QuickActions";
import { PresetGallery } from "@/components/designer/PresetGallery";

/** Approx. height the persistent mobile tray occupies, reserved as body padding
 *  so the page's last content (the text editor) can always scroll clear of it. */
const MOBILE_TRAY_HEIGHT = 184;

export function TilePalette() {
  return (
    <>
      {/* Desktop / Tablet — fixed left panel */}
      <aside
        data-tour="tiles"
        className="bsk-panel-blue hidden md:flex flex-col w-[320px] flex-shrink-0 p-3 bg-surface-800/50 rounded-xl border border-surface-700/50 overflow-y-auto"
      >
        <DesktopPaletteContent />
      </aside>

      {/* Mobile — persistent bottom tray (tiles always visible, no hunting) */}
      <MobileTileTray />
    </>
  );
}

/* ────────────────────────────── Desktop ────────────────────────────── */

function DesktopPaletteContent() {
  return (
    <div className="flex flex-col gap-2">
      <p className="rounded-full border-2 border-brand-gold/60 bg-brand-gold/15 px-3 py-2
        text-center text-sm font-extrabold leading-snug text-brand-gold">
        Drag a tile onto your frame. Drag one off to remove it.
      </p>
      <TileGrid />
      <QuickActions />
      <PresetGallery />
    </div>
  );
}

/* ─────────────────────────────── Mobile ────────────────────────────── */

function MobileTileTray() {
  const [optionsOpen, setOptionsOpen] = useState(false);

  // Reserve space at the bottom of the page so the fixed tray never covers the
  // text editor / last bit of content. Cleaned up on unmount.
  useEffect(() => {
    const isMobile = window.matchMedia("(max-width: 767px)");
    const apply = () => {
      document.body.style.paddingBottom = isMobile.matches
        ? `calc(${MOBILE_TRAY_HEIGHT}px + env(safe-area-inset-bottom))`
        : "";
    };
    apply();
    isMobile.addEventListener("change", apply);
    return () => {
      isMobile.removeEventListener("change", apply);
      document.body.style.paddingBottom = "";
    };
  }, []);

  return (
    <div
      data-tour="tiles"
      className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-surface-700
        bg-surface-900/95 backdrop-blur-sm shadow-[0_-8px_24px_rgba(0,0,0,0.45)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {/* Optional design tools — tucked away so the tray stays focused on tiles */}
      {optionsOpen && (
        <div className="max-h-[42vh] space-y-2 overflow-y-auto border-b border-surface-700/60 p-3">
          <QuickActions />
          <PresetGallery />
        </div>
      )}

      <div className="px-3 pt-2">
        <div className="mb-1.5 flex items-center gap-2">
          <p className="flex-1 rounded-full border-2 border-brand-gold/60 bg-brand-gold/15 px-3 py-1.5
            text-center text-[13px] font-extrabold leading-snug text-brand-gold">
            Tap a tile to add it. Tap a placed tile to remove it.
          </p>
          <button
            onClick={() => setOptionsOpen((v) => !v)}
            aria-expanded={optionsOpen}
            className="shrink-0 rounded-full bg-surface-800 px-3 py-1.5 text-xs font-semibold
              text-surface-200 active:scale-95 transition-transform"
          >
            {optionsOpen ? "Done" : "⚙ Tools"}
          </button>
        </div>
      </div>

      {/* The always-visible, thumb-friendly tile row */}
      <div className="px-3 pb-3">
        <TileGrid variant="row" />
      </div>
    </div>
  );
}
