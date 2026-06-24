"use client";

import { useEffect, useState } from "react";
import { SetTabs } from "./SetTabs";
import { TileGrid } from "./TileGrid";
import { ToolBar } from "@/components/designer/ToolBar";
import { QuickActions } from "@/components/designer/QuickActions";
import { PresetGallery } from "@/components/designer/PresetGallery";
import { useDesignStore } from "@/stores/design-store";

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
      <SetTabs />
      <ToolBar />
      <DieCutToggle />
      <WingsToggle />
      <p className="text-surface-400 text-xs text-center px-2">
        Drag a tile onto the frame, or tap to select then tap a slot
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
          <ToolBar />
          <DieCutToggle />
          <WingsToggle />
          <QuickActions />
          <PresetGallery />
        </div>
      )}

      <div className="px-3 pt-2">
        <div className="mb-1.5 flex items-center gap-2">
          <SetTabs />
          <button
            onClick={() => setOptionsOpen((v) => !v)}
            aria-expanded={optionsOpen}
            className="ml-auto shrink-0 rounded-full bg-surface-800 px-3 py-1.5 text-xs font-semibold
              text-surface-200 active:scale-95 transition-transform"
          >
            {optionsOpen ? "Done" : "⚙ Tools"}
          </button>
        </div>
        <p className="mb-1.5 text-center text-[11px] font-medium text-surface-300">
          Tap a tile to add it — or drag it up onto your frame
        </p>
      </div>

      {/* The always-visible, thumb-friendly tile row */}
      <div className="px-3 pb-3">
        <TileGrid variant="row" />
      </div>
    </div>
  );
}

/* ──────────────────────── Shared option controls ───────────────────── */

function DieCutToggle() {
  const dieCut = useDesignStore((s) => s.dieCut);
  const toggleDieCut = useDesignStore((s) => s.toggleDieCut);

  return (
    <div className="flex gap-1 p-1 bg-surface-800 rounded-lg">
      <button
        onClick={() => { if (dieCut) toggleDieCut(); }}
        className={`
          flex-1 px-2 py-1.5 rounded-md text-sm transition-colors
          ${!dieCut
            ? "bg-brand-navy text-white"
            : "text-surface-400 hover:text-surface-200 hover:bg-surface-700/50"
          }
        `}
      >
        Standard
      </button>
      <button
        onClick={() => { if (!dieCut) toggleDieCut(); }}
        className={`
          flex-1 px-2 py-1.5 rounded-md text-sm transition-colors
          ${dieCut
            ? "bg-brand-navy text-white"
            : "text-surface-400 hover:text-surface-200 hover:bg-surface-700/50"
          }
        `}
      >
        Die Cut
      </button>
    </div>
  );
}

function WingsToggle() {
  const wings = useDesignStore((s) => s.frameConfig.wings);
  const wingColumns = useDesignStore((s) => s.frameConfig.wingColumns);
  const toggleWings = useDesignStore((s) => s.toggleWings);
  const setWingColumns = useDesignStore((s) => s.setWingColumns);

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1 p-1 bg-surface-800 rounded-lg">
        <button
          onClick={() => { if (wings) toggleWings(); }}
          className={`
            flex-1 px-2 py-1.5 rounded-md text-sm transition-colors
            ${!wings
              ? "bg-brand-navy text-white"
              : "text-surface-400 hover:text-surface-200 hover:bg-surface-700/50"
            }
          `}
        >
          Standard
        </button>
        <button
          onClick={() => { if (!wings) toggleWings(); }}
          className={`
            flex-1 px-2 py-1.5 rounded-md text-sm transition-colors
            ${wings
              ? "bg-brand-navy text-white"
              : "text-surface-400 hover:text-surface-200 hover:bg-surface-700/50"
            }
          `}
        >
          + Wings
        </button>
      </div>

      {/* Wing width stepper — only visible when wings are on */}
      {wings && (
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] text-surface-400">Wing width</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setWingColumns(wingColumns - 1)}
              disabled={wingColumns <= 1}
              className="w-6 h-6 rounded bg-surface-700 text-surface-200 text-sm flex items-center justify-center
                hover:bg-surface-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              -
            </button>
            <span className="text-xs text-surface-200 w-14 text-center font-medium">
              {wingColumns} col{wingColumns !== 1 ? "s" : ""}
            </span>
            <button
              onClick={() => setWingColumns(wingColumns + 1)}
              disabled={wingColumns >= 5}
              className="w-6 h-6 rounded bg-surface-700 text-surface-200 text-sm flex items-center justify-center
                hover:bg-surface-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              +
            </button>
          </div>
        </div>
      )}

      <p className="text-[10px] text-surface-500 text-center">
        {wings
          ? "Wings extend the frame to fill your car’s plate basin"
          : "Add side extensions to fill wider plate basins"}
      </p>
    </div>
  );
}
