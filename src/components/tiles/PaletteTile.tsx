"use client";

import type { TilePiece } from "@/lib/types";
import { useDragTile } from "@/hooks/useDragTile";
import { usePaletteStore } from "@/stores/palette-store";
import { useUIStore } from "@/stores/ui-store";
import { useDesignStore } from "@/stores/design-store";
import { TileArtwork, hasCustomArtwork, canDieCut } from "./TileArtwork";
import { playSound } from "@/lib/utils/sound";

interface PaletteTileProps {
  piece: TilePiece;
}

export function PaletteTile({ piece }: PaletteTileProps) {
  const { setNodeRef, attributes, listeners, style, isDragging } = useDragTile(piece.id);
  const selectedPieceId = usePaletteStore((s) => s.selectedPieceId);
  const selectPiece = usePaletteStore((s) => s.selectPiece);
  const soundEnabled = useUIStore((s) => s.soundEnabled);
  const dieCut = useDesignStore((s) => s.dieCut);

  const isSelected = selectedPieceId === piece.id;
  const hasArt = hasCustomArtwork(piece.id);
  const isDieCut = dieCut && canDieCut(piece.id);

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={() => { selectPiece(piece.id); if (soundEnabled) playSound("click"); }}
      style={style}
      className={`
        relative flex flex-col items-center gap-1 p-1.5 rounded-lg cursor-grab active:cursor-grabbing
        transition-all duration-150
        ${isSelected
          ? "ring-2 ring-brand-gold bg-surface-700 scale-105"
          : "hover:bg-surface-700/50"
        }
        ${isDragging ? "opacity-50" : ""}
      `}
      title={piece.name}
    >
      <div
        className={`flex items-center justify-center overflow-hidden ${isDieCut ? "" : "rounded-md tile-3d"}`}
        style={{
          width: 44,
          height: 44,
          backgroundColor: isDieCut ? "transparent" : piece.backgroundColor,
          filter: isDieCut ? "drop-shadow(0 1px 2px rgba(0,0,0,0.5))" : undefined,
        }}
      >
        {piece.artworkUrl ? (
          <img
            src={piece.artworkUrl}
            alt={piece.name}
            className="rounded-md"
            style={{ width: "82%", height: "82%", objectFit: "contain" }}
            draggable={false}
          />
        ) : hasArt ? (
          <TileArtwork pieceId={piece.id} size={40} />
        ) : null}
      </div>
      <span className="text-[10px] text-surface-300 truncate w-full text-center">
        {piece.name}
      </span>
    </div>
  );
}
