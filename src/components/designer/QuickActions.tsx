"use client";

import { useDesignStore } from "@/stores/design-store";
import { usePaletteStore } from "@/stores/palette-store";
import { useUIStore } from "@/stores/ui-store";
import { getSetPieces } from "@/data/sets";
import { playSound, type SoundName } from "@/lib/utils/sound";

export function QuickActions() {
  const selectedPieceId = usePaletteStore((s) => s.selectedPieceId);
  const activeSetId = usePaletteStore((s) => s.activeSetId);
  const soundEnabled = useUIStore((s) => s.soundEnabled);
  const { fillAll, randomFill, mirrorTopSlots, clearAll, undo, redo, canUndo, canRedo } =
    useDesignStore();

  const pieces = getSetPieces(activeSetId);

  const sfx = (name: SoundName) => { if (soundEnabled) playSound(name); };

  const handleFillAll = () => {
    // Prefer the user's selected tile; otherwise gracefully fall back to the
    // active set's first piece so "Fill All" always does something obvious
    // instead of silently no-op'ing.
    const pieceId = selectedPieceId ?? pieces[0]?.id ?? null;
    if (!pieceId) return;
    const setId = pieceId.split(":")[0];
    fillAll(pieceId, setId);
    sfx("cascade");
  };

  const handleRandomFill = () => {
    if (pieces.length === 0) return;
    const pieceData = pieces.map((p) => ({ pieceId: p.id, setId: p.setId }));
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
      disabled: pieces.length === 0,
      title: selectedPieceId
        ? "Fill every slot with your selected tile"
        : "Fill every slot with this set's first tile (tap a tile to choose)",
    },
    {
      label: "Random",
      icon: "🎲",
      color: "bsk-purple",
      onClick: handleRandomFill,
      disabled: pieces.length === 0,
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
