"use client";

import { useState } from "react";
import type { TilePiece } from "@/lib/types";
import { useDragTile } from "@/hooks/useDragTile";
import { usePaletteStore } from "@/stores/palette-store";
import { useUIStore } from "@/stores/ui-store";
import { useDesignStore } from "@/stores/design-store";
import { getAllSlotIds } from "@/lib/utils/slot-generator";
import { coveredSlotIds } from "@/lib/utils/text-bar";
import { TileArtwork, hasCustomArtwork, canDieCut } from "./TileArtwork";
import { playSound } from "@/lib/utils/sound";

interface PaletteTileProps {
  piece: TilePiece;
  /** "md" — desktop palette grid. "lg" — bigger thumb target for the mobile tray. */
  size?: "md" | "lg";
  /**
   * When true (mobile tray), a tap drops this tile into the next empty slot
   * instead of only selecting it — so adding a tile is one tap, no hunting for
   * a slot. The piece is also selected so a follow-up tap on a specific slot
   * still works via RailSlot.
   */
  tapToPlace?: boolean;
}

export function PaletteTile({ piece, size = "md", tapToPlace = false }: PaletteTileProps) {
  const { setNodeRef, attributes, listeners, style, isDragging } = useDragTile(piece.id);
  const selectedPieceId = usePaletteStore((s) => s.selectedPieceId);
  const selectPiece = usePaletteStore((s) => s.selectPiece);
  const soundEnabled = useUIStore((s) => s.soundEnabled);
  const dieCut = useDesignStore((s) => s.dieCut);

  const [justAdded, setJustAdded] = useState(false);

  const isSelected = selectedPieceId === piece.id;
  const hasArt = hasCustomArtwork(piece.id);
  const isDieCut = dieCut && canDieCut(piece.id);
  const art = size === "lg" ? 56 : 44;

  // Drop into the first empty, un-covered slot. Returns true if a tile landed.
  const placeInNextEmpty = (): boolean => {
    const store = useDesignStore.getState();
    const covered = new Set(coveredSlotIds(store.textBars));
    const target = getAllSlotIds(store.frameConfig).find(
      (id) => !store.slots[id] && !covered.has(id)
    );
    if (!target) return false;
    store.placeTile(target, piece.id, piece.id.split(":")[0]);
    return true;
  };

  const handleClick = () => {
    selectPiece(piece.id);
    if (tapToPlace) {
      const placed = placeInNextEmpty();
      if (placed) {
        setJustAdded(true);
        window.setTimeout(() => setJustAdded(false), 350);
        if (soundEnabled) playSound("snap");
        return;
      }
    }
    if (soundEnabled) playSound("click");
  };

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      style={style}
      className={`
        relative flex flex-col items-center gap-1 rounded-lg cursor-grab active:cursor-grabbing
        transition-all duration-150
        ${size === "lg" ? "shrink-0 p-2" : "p-1.5"}
        ${isSelected
          ? "ring-2 ring-brand-gold bg-surface-700 scale-105"
          : "hover:bg-surface-700/50"
        }
        ${justAdded ? "scale-110 ring-2 ring-emerald-400" : ""}
        ${isDragging ? "opacity-50" : ""}
      `}
      title={tapToPlace ? `Tap to add “${piece.name}” — or drag onto the frame` : piece.name}
    >
      <div
        className={`flex items-center justify-center overflow-hidden ${isDieCut ? "" : "rounded-md tile-3d"}`}
        style={{
          width: art,
          height: art,
          backgroundColor: isDieCut ? "transparent" : piece.backgroundColor,
          filter: isDieCut ? "drop-shadow(0 1px 2px rgba(0,0,0,0.5))" : undefined,
        }}
      >
        {piece.artworkUrl ? (
          <img
            src={piece.artworkUrl}
            alt={piece.name}
            className="rounded-md"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            draggable={false}
          />
        ) : hasArt ? (
          <TileArtwork pieceId={piece.id} size={art - 4} />
        ) : null}
      </div>
      <span
        className={`truncate text-center text-surface-300 ${
          size === "lg" ? "w-16 text-[11px]" : "w-full text-[10px]"
        }`}
      >
        {piece.name}
      </span>
    </div>
  );
}
