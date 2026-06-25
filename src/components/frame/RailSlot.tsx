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

  // The slot is actionable when a click would do something: erasing a placed
  // tile, or painting the selected piece into an empty/occupied slot. Only then
  // do we surface a pointer cursor + hover highlight so empty slots clearly
  // invite a click instead of looking inert.
  const isActionable =
    (activeTool === "eraser" && placedTile != null) ||
    (activeTool === "paint" && selectedPieceId != null);
  const cursorClass = isActionable ? "cursor-pointer group" : "cursor-default";

  // Gapless: placed tiles fill the whole cell so neighbors butt edge-to-edge
  // (0.985" grid). Empty slots keep a hair of inset to show the recessed groove.
  const inset = placedTile ? 0 : slot.width * 0.08;

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
          {/* Empty slot groove — gets a gold hover ring when a click would place
              the selected tile here, so empty slots read as clickable targets. */}
          <div
            className={`rounded-[2px] transition-shadow ${
              isActionable ? "group-hover:ring-2 group-hover:ring-brand-gold/70" : ""
            }`}
            style={{
              width: slot.width - inset * 2,
              height: slot.height - inset * 2,
              background: "transparent",
              border: "1px solid transparent",
            }}
          />
        </div>
      )}
    </div>
  );
}
