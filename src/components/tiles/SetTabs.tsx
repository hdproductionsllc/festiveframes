"use client";

import { surfacedSets } from "@/data/sets";
import { usePaletteStore } from "@/stores/palette-store";

/**
 * The tile-set picker.
 *
 * For the July 4th launch only the surfaced sets (see `SURFACED_SET_IDS`) are
 * shown — currently just the 4th-of-July set. With a single surfaced set this
 * renders as one labelled header chip and the "More tile sets" expander +
 * style filter are gone entirely, so the palette has zero clutter. If more
 * sets are surfaced post-launch this automatically becomes a horizontal strip
 * of selectable chips.
 */
export function SetTabs() {
  const activeSetId = usePaletteStore((s) => s.activeSetId);
  const setActiveSet = usePaletteStore((s) => s.setActiveSet);

  if (surfacedSets.length === 0) return null;

  // Single surfaced set → a clean, non-interactive label (nothing else to pick).
  if (surfacedSets.length === 1) {
    const set = surfacedSets[0];
    return (
      <div className="flex items-center gap-2 rounded-lg bg-surface-800 px-3 py-2 ring-1 ring-brand-gold/40">
        <span className="text-lg leading-none">{set.icon}</span>
        <span className="text-sm font-semibold text-surface-50">{set.name}</span>
        <span className="ml-auto rounded bg-brand-red/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-brand-red">
          Launch
        </span>
      </div>
    );
  }

  // Multiple surfaced sets → a simple chip strip (no expander, no filters).
  return (
    <div className="flex flex-wrap gap-1.5">
      {surfacedSets.map((set) => {
        const isActive = activeSetId === set.id;
        return (
          <button
            key={set.id}
            onClick={() => setActiveSet(set.id)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-left transition-all
              ${
                isActive
                  ? "bg-surface-600 text-surface-50 shadow-sm ring-1 ring-brand-gold/50"
                  : "bg-surface-800 text-surface-300 hover:bg-surface-700/70"
              }`}
          >
            <span className="text-base leading-none">{set.icon}</span>
            <span className="text-sm font-medium">{set.name}</span>
          </button>
        );
      })}
    </div>
  );
}
