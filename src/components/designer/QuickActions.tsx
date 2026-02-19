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
    if (!selectedPieceId) return;
    const setId = selectedPieceId.split(":")[0];
    fillAll(selectedPieceId, setId);
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
      onClick: handleFillAll,
      disabled: !selectedPieceId,
      title: "Fill all slots with selected tile",
    },
    {
      label: "Random",
      icon: "🎲",
      onClick: handleRandomFill,
      disabled: pieces.length === 0,
      title: "Random fill from current set",
    },
    {
      label: "Mirror",
      icon: "🪞",
      onClick: () => { mirrorTopSlots(); sfx("shimmer"); },
      disabled: false,
      title: "Mirror left side to right (all rails + wings)",
    },
    {
      label: "Clear",
      icon: "🗑️",
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
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium
              bg-surface-800 text-surface-300 hover:bg-surface-700 hover:text-surface-100
              disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
            bg-surface-800 text-surface-300 hover:bg-surface-700 hover:text-surface-100
            disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          ↩ Undo
        </button>
        <button
          onClick={() => { redo(); sfx("forward"); }}
          disabled={!canRedo()}
          title="Redo (Ctrl+Shift+Z)"
          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium
            bg-surface-800 text-surface-300 hover:bg-surface-700 hover:text-surface-100
            disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          ↪ Redo
        </button>
      </div>
    </div>
  );
}
