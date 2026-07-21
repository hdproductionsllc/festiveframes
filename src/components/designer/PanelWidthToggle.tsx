"use client";

import { useDesignStore } from "@/stores/design-store";
import { getTotalWidthInches } from "@/lib/constants/frame";

// Side-panel width toggle for the SCHOOL builder. Each side panel is 1 inner rail
// column + the wings, so:
//   • 1 wing column  → 2-tile-wide panels (total 13.87" — roomy bed margin)
//   • 2 wing columns → 3-tile-wide panels (total 15.86" — fits the 16.5" bed, tight)
// 3 wing columns (4-wide) would be 17.84" and does NOT fit the bed, so this only
// offers 2 vs 3. Wired to setWingColumns, which migrates placed tiles (widening adds
// empty columns; narrowing drops tiles in the removed outer column). Session-level:
// the store refreshes to the owned 2-wide geometry on reload.

const OPTIONS = [
  { panelTiles: 2, wingColumns: 1 },
  { panelTiles: 3, wingColumns: 2 },
] as const;

export function PanelWidthToggle() {
  const frameConfig = useDesignStore((s) => s.frameConfig);
  const setWingColumns = useDesignStore((s) => s.setWingColumns);

  // Only meaningful on a winged (school) frame.
  if (!frameConfig.wings) return null;

  const current = frameConfig.wingColumns;
  const totalWidth = getTotalWidthInches(frameConfig);

  return (
    <div className="bsk-panel-blue rounded-xl border border-surface-700/50 bg-surface-800/50 p-4">
      <h3 className="mb-1 flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-[#1e1b17]">
        <span aria-hidden>↔️</span> Side panel width
      </h3>
      <p className="mb-3 text-[11px] font-semibold text-[#1e1b17]/60">
        Tiles per side panel (inner rail + wings). Wider fits bigger art but leaves less
        bed margin.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {OPTIONS.map((o) => {
          const active = current === o.wingColumns;
          return (
            <button
              key={o.panelTiles}
              type="button"
              aria-pressed={active}
              onClick={() => setWingColumns(o.wingColumns)}
              className={`rounded-xl border-[3px] px-3 py-3 text-sm font-extrabold uppercase tracking-wide transition-all active:translate-y-0.5 ${
                active
                  ? "border-[#1e1b17] bg-[#ed5aa0] text-white shadow-[3px_3px_0_#1e1b17]"
                  : "border-[#1e1b17]/15 bg-white text-[#1e1b17] hover:border-[#ed5aa0] hover:bg-[#ed5aa0]/10"
              }`}
            >
              {o.panelTiles} tiles
              <span className="mt-0.5 block text-[10px] font-bold normal-case tracking-normal opacity-70">
                {o.wingColumns} wing{o.wingColumns > 1 ? "s" : ""}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] font-semibold tabular-nums text-[#1e1b17]/55">
        Print width now: {totalWidth.toFixed(2)}″ / 16.5″ bed
        {current >= 2 ? " — fits, tight margin" : " — roomy margin"}
      </p>
    </div>
  );
}
