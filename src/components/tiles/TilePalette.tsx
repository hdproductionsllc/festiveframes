"use client";

import { useState } from "react";
import { TileGrid } from "./TileGrid";
import { ArmedBanner } from "./ArmedBanner";
import { QuickActions } from "@/components/designer/QuickActions";
import { PresetGallery } from "@/components/designer/PresetGallery";

/**
 * The tile palette is now an in-flow PANEL in the tools row beneath the canvas
 * (not a tall fixed sidebar / not a fixed mobile tray). On desktop it takes the
 * larger share of the row (~55%); on mobile it stacks full-width below the
 * canvas, keeping the big-tile tray ergonomics (armed banner, "tap a spot" cue,
 * instruction callout + ⚙ Tools below the picker).
 */
export function TilePalette() {
  return (
    <>
      {/* Desktop / Tablet — palette panel (left side of the tools row) */}
      <aside
        data-tour="tiles"
        className="bsk-panel-blue hidden md:flex flex-col w-full lg:basis-0 lg:grow-[50] min-w-0 p-3 bg-surface-800/50 rounded-xl border border-surface-700/50"
      >
        <DesktopPaletteContent />
      </aside>

      {/* Mobile — stacked tile tray (tiles always visible, no hunting) */}
      <MobileTileTray />
    </>
  );
}

/* ────────────────────────────── Desktop ────────────────────────────── */

function DesktopPaletteContent() {
  return (
    <div className="flex flex-col gap-2">
      {/* Tools + instruction sit ABOVE the tiles so the actions are the first
          thing reached, then the picker, then the armed-tile cue beside it. */}
      <QuickActions />
      <PresetGallery />
      <p className="rounded-full border-2 border-brand-gold/60 bg-brand-gold/15 px-3 py-2
        text-center text-sm font-extrabold leading-snug text-[#1e1b17]">
        Tap a tile, then tap your frame to drop it. Or drag a tile on (drag one off to remove).
      </p>
      <TileGrid />
      {/* Armed-tile callout — also surfaces here, next to the picker, so the
          "now tap the frame" instruction is visible no matter where you look. */}
      <ArmedBanner placement="tray" />
    </div>
  );
}

/* ─────────────────────────────── Mobile ────────────────────────────── */

function MobileTileTray() {
  // Tools start EXPANDED so the quick actions are visible on first render without
  // tapping the gear. The toggle still collapses them when the user wants the
  // tray focused purely on tiles.
  const [optionsOpen, setOptionsOpen] = useState(true);

  return (
    <div
      data-tour="tiles"
      className="md:hidden w-full rounded-xl border border-surface-700
        bg-surface-900/95 shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
    >
      {/* Instruction + Tools toggle — ABOVE the picker so the actions are the
          first thing in the tray. */}
      <div className="px-3 pb-1.5 pt-3">
        <div className="flex items-center gap-2">
          <p className="flex-1 rounded-full border-2 border-brand-gold/60 bg-brand-gold/15 px-3 py-1.5
            text-center text-[13px] font-extrabold leading-snug text-[#1e1b17]">
            Tap a tile, then tap your frame to drop it.
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

      {/* Optional design tools — open by default; collapsible via the gear. */}
      {optionsOpen && (
        <div className="max-h-[42vh] space-y-2 overflow-y-auto border-b border-surface-700/60 px-3 pb-3 pt-1">
          <QuickActions />
          <PresetGallery />
        </div>
      )}

      {/* Thumb-friendly tile row, BELOW the tools. */}
      <div className="px-3 pt-2">
        <TileGrid variant="row" />
      </div>

      {/* Armed-tile callout — bold "now tap your frame" cue, mobile-prominent. */}
      <div className="px-3 pb-3 pt-1.5">
        <ArmedBanner placement="tray" />
      </div>
    </div>
  );
}
