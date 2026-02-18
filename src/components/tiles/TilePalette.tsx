"use client";

import { SetTabs } from "./SetTabs";
import { TileGrid } from "./TileGrid";
import { ToolBar } from "@/components/designer/ToolBar";
import { QuickActions } from "@/components/designer/QuickActions";
import { PresetGallery } from "@/components/designer/PresetGallery";
import { useUIStore } from "@/stores/ui-store";
import { useDesignStore } from "@/stores/design-store";

export function TilePalette() {
  const mobilePaletteOpen = useUIStore((s) => s.mobilePaletteOpen);
  const toggleMobilePalette = useUIStore((s) => s.toggleMobilePalette);

  return (
    <>
      {/* Desktop / Tablet — fixed left panel */}
      <aside className="hidden md:flex flex-col w-[320px] flex-shrink-0 p-3 bg-surface-800/50 rounded-xl border border-surface-700/50 overflow-y-auto">
        <PaletteContent />
      </aside>

      {/* Mobile — floating button + bottom sheet */}
      <div className="md:hidden">
        <button
          onClick={toggleMobilePalette}
          className="fixed bottom-4 right-4 z-40 w-14 h-14 rounded-full bg-brand-red text-white
            flex items-center justify-center shadow-lg active:scale-95 transition-transform"
          aria-label="Open tile palette"
        >
          <span className="text-2xl">🎨</span>
        </button>

        {mobilePaletteOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/50 z-40"
              onClick={toggleMobilePalette}
            />
            {/* Bottom sheet */}
            <div className="fixed bottom-0 left-0 right-0 z-50 bg-surface-900 rounded-t-2xl border-t border-surface-700 max-h-[70vh] overflow-y-auto p-4 animate-slide-up">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-surface-200">Tile Palette</h3>
                <button
                  onClick={toggleMobilePalette}
                  className="text-surface-400 hover:text-surface-200 p-1"
                >
                  ✕
                </button>
              </div>
              <PaletteContent />
            </div>
          </>
        )}
      </div>
    </>
  );
}

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
          ? "Wings extend the frame to fill your car\u2019s plate basin"
          : "Add side extensions to fill wider plate basins"}
      </p>
    </div>
  );
}

function PaletteContent() {
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
