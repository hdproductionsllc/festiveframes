"use client";

import { useDroppable } from "@dnd-kit/core";
import type { FrameSlot, PlacedTile } from "@/lib/types";
import { PlacedTileView } from "./PlacedTileView";
import { useDesignStore } from "@/stores/design-store";
import { usePaletteStore } from "@/stores/palette-store";
import { useUIStore } from "@/stores/ui-store";
import { playSound } from "@/lib/utils/sound";

interface RailSlotProps {
  slot: FrameSlot;
  placedTile: PlacedTile | undefined;
  isOver?: boolean;
}

export function RailSlot({ slot, placedTile, isOver }: RailSlotProps) {
  const { setNodeRef } = useDroppable({ id: slot.id });
  const placeTile = useDesignStore((s) => s.placeTile);
  const removeTile = useDesignStore((s) => s.removeTile);
  const selectedPieceId = usePaletteStore((s) => s.selectedPieceId);
  const activeTool = usePaletteStore((s) => s.activeTool);

  const soundEnabled = useUIStore((s) => s.soundEnabled);

  const handleClick = () => {
    if (activeTool === "eraser") {
      removeTile(slot.id);
      if (soundEnabled) playSound("pop");
    } else if (activeTool === "paint" && selectedPieceId) {
      const setId = selectedPieceId.split(":")[0];
      placeTile(slot.id, selectedPieceId, setId);
      if (soundEnabled) playSound("snap");
    }
  };

  const cursorClass =
    activeTool === "eraser" || selectedPieceId
      ? "cursor-pointer"
      : "cursor-default";

  // Slight inset so tiles sit inside the rail groove
  const inset = slot.width * 0.08;

  return (
    <div
      ref={setNodeRef}
      onClick={handleClick}
      className={`absolute transition-all duration-150 ${cursorClass}`}
      style={{
        left: slot.x,
        top: slot.y,
        width: slot.width,
        height: slot.height,
      }}
    >
      {placedTile ? (
        <div
          className={isOver ? "drop-target-glow" : ""}
          style={{
            position: "absolute",
            left: inset,
            top: inset,
            width: slot.width - inset * 2,
            height: slot.height - inset * 2,
          }}
        >
          <PlacedTileView
            pieceId={placedTile.pieceId}
            width={slot.width - inset * 2}
            height={slot.height - inset * 2}
          />
        </div>
      ) : (
        <div
          className={`w-full h-full flex items-center justify-center ${isOver ? "drop-target-glow" : ""}`}
        >
          {/* Empty slot groove */}
          <div
            className="rounded-[2px]"
            style={{
              width: slot.width - inset * 2,
              height: slot.height - inset * 2,
              background: "rgba(0,0,0,0.3)",
              boxShadow: "inset 0 2px 4px rgba(0,0,0,0.5), inset 0 -1px 1px rgba(255,255,255,0.03)",
              border: "1px solid rgba(0,0,0,0.4)",
            }}
          />
        </div>
      )}
    </div>
  );
}
