"use client";

import { usePaletteStore } from "@/stores/palette-store";
import { useDesignStore } from "@/stores/design-store";
import { useUIStore } from "@/stores/ui-store";
import { getSet } from "@/data/sets";
import { playSound } from "@/lib/utils/sound";

export function PresetGallery() {
  const activeSetId = usePaletteStore((s) => s.activeSetId);
  const applyPreset = useDesignStore((s) => s.applyPreset);
  const soundEnabled = useUIStore((s) => s.soundEnabled);
  const set = getSet(activeSetId);

  if (!set || set.presets.length === 0) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-surface-400 uppercase tracking-wider">
        Presets
      </h4>
      <div className="flex flex-col gap-1.5">
        {set.presets.map((preset) => (
          <button
            key={preset.id}
            onClick={() => { applyPreset(preset); if (soundEnabled) playSound("stamp"); }}
            className="flex items-center gap-2 p-2 rounded-lg w-full
              bg-surface-800 hover:bg-surface-700 transition-colors border border-surface-700/50
              hover:border-brand-gold/30"
            title={preset.description}
          >
            <div className="flex gap-0.5 flex-shrink-0">
              {Object.values(preset.slots)
                .slice(0, 4)
                .map((tile, i) => {
                  const piece = set.pieces.find((p) => p.id === tile.pieceId);
                  return (
                    <div
                      key={i}
                      className="w-4 h-4 rounded-sm text-[8px] flex items-center justify-center"
                      style={{ backgroundColor: piece?.backgroundColor ?? "#333" }}
                    >
                      {piece?.emoji}
                    </div>
                  );
                })}
            </div>
            <span className="text-xs text-surface-300 truncate text-left">
              {preset.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
