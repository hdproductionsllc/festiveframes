"use client";

import { minSpanFor } from "@/lib/utils/snappet";
import { useDesignStore } from "@/stores/design-store";
import { usePaletteStore } from "@/stores/palette-store";
import { useUIStore } from "@/stores/ui-store";
import { getSetPieces, resolveSurfacedSetId } from "@/data/sets";
import { playSound, type SoundName } from "@/lib/utils/sound";

interface QuickActionsProps {
  /**
   * Which sets this builder surfaces. When set (school builder), Fill All / Random
   * draw from the same set the palette shows. Omitted (/build) keeps the exact
   * prior behavior: the raw global active set.
   */
  surfacedSetIds?: readonly string[];
}

export function QuickActions({ surfacedSetIds }: QuickActionsProps = {}) {
  const selectedPieceId = usePaletteStore((s) => s.selectedPieceId);
  const activeSetId = usePaletteStore((s) => s.activeSetId);
  const soundEnabled = useUIStore((s) => s.soundEnabled);
  const { fillAll, randomFill, mirrorTopSlots, clearAll, undo, redo, canUndo, canRedo } =
    useDesignStore();

  const pieces = getSetPieces(
    surfacedSetIds ? resolveSurfacedSetId(activeSetId, surfacedSetIds) : activeSetId
  );
  // Fill All / Random write cells one at a time at 1x1, so the pool is exactly the
  // pieces whose FLOOR is 1x1 (see `minSpanFor`). Artwork floors at 2x2 because it
  // is unreadable smaller, so filling with it would produce precisely the 1x1 badges
  // that floor exists to prevent — auto-fill is for the solids and simple icons.
  const fillablePieces = pieces.filter((p) => {
    const min = minSpanFor(p);
    return min.cols === 1 && min.rows === 1;
  });

  const sfx = (name: SoundName) => { if (soundEnabled) playSound(name); };

  const handleFillAll = () => {
    // Prefer the user's selected tile — but only if it's fillable at 1x1. A piece
    // that REQUIRES its footprint can't fill single cells, so fall back to the first
    // fillable piece and always do something obvious instead of squishing it.
    const selected = selectedPieceId ? pieces.find((p) => p.id === selectedPieceId) : null;
    const selectedFills = selected ? fillablePieces.includes(selected) : false;
    const pieceId = (selectedFills ? selected!.id : fillablePieces[0]?.id) ?? null;
    if (!pieceId) return;
    const setId = pieceId.split(":")[0];
    fillAll(pieceId, setId);
    sfx("cascade");
  };

  const handleRandomFill = () => {
    if (fillablePieces.length === 0) return;
    const pieceData = fillablePieces.map((p) => ({ pieceId: p.id, setId: p.setId }));
    randomFill(pieceData);
    sfx("rattle");
  };

  const actions = [
    {
      label: "Fill All",
      icon: "🪣",
      color: "bsk-blue",
      onClick: handleFillAll,
      // Enabled as long as the set has tiles — uses your selected tile, or the
      // set's first tile if you haven't picked one yet.
      disabled: fillablePieces.length === 0,
      title: selectedPieceId
        ? "Fill every slot with your selected tile"
        : "Fill every slot with this set's first tile (tap a tile to choose)",
    },
    {
      label: "Random",
      icon: "🎲",
      color: "bsk-purple",
      onClick: handleRandomFill,
      disabled: fillablePieces.length === 0,
      title: "Random fill from current set",
    },
    {
      label: "Mirror",
      icon: "🪞",
      color: "bsk-pink",
      onClick: () => { mirrorTopSlots(); sfx("shimmer"); },
      disabled: false,
      title: "Mirror left side to right (all rails + wings)",
    },
    {
      label: "Clear",
      icon: "🗑️",
      color: "bsk-red",
      onClick: () => { clearAll(); sfx("whoosh"); },
      disabled: false,
      title: "Remove all tiles",
    },
  ];

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-1.5">
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={action.onClick}
            disabled={action.disabled}
            title={action.title}
            className={`bsk-btn ${action.color} flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-bold
              disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            <span>{action.icon}</span>
            {action.label}
          </button>
        ))}
      </div>
      <div className="flex gap-1.5">
        <button
          onClick={() => { undo(); sfx("rewind"); }}
          disabled={!canUndo()}
          title="Undo (Ctrl+Z)"
          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium
            bsk-btn bsk-cream disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ↩ Undo
        </button>
        <button
          onClick={() => { redo(); sfx("forward"); }}
          disabled={!canRedo()}
          title="Redo (Ctrl+Shift+Z)"
          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium
            bsk-btn bsk-cream disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ↪ Redo
        </button>
      </div>
    </div>
  );
}
