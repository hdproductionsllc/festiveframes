"use client";

import { getPiece } from "@/data/sets";
import { TileArtwork, hasCustomArtwork, canDieCut } from "@/components/tiles/TileArtwork";
import { useDesignStore } from "@/stores/design-store";

interface PlacedTileViewProps {
  pieceId: string;
  width: number;
  height: number;
  animate?: boolean;
}

export function PlacedTileView({ pieceId, width, height, animate }: PlacedTileViewProps) {
  const piece = getPiece(pieceId);
  const dieCut = useDesignStore((s) => s.dieCut);
  if (!piece) return null;

  const size = Math.min(width, height);
  const isDieCut = dieCut && canDieCut(pieceId);

  return (
    <div
      className={`rounded-[3px] overflow-hidden flex items-center justify-center ${animate ? "animate-tile-snap" : ""}`}
      style={{
        width,
        height,
        backgroundColor: isDieCut ? "transparent" : piece.backgroundColor,
        boxShadow: isDieCut
          ? "none"
          : "0 2px 6px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(0,0,0,0.1)",
        filter: isDieCut ? "drop-shadow(0 2px 3px rgba(0,0,0,0.5))" : undefined,
      }}
    >
      {piece.artworkUrl ? (
        <img
          src={piece.artworkUrl}
          alt={piece.name}
          style={{ width: "82%", height: "82%", objectFit: "contain" }}
          draggable={false}
        />
      ) : hasCustomArtwork(pieceId) ? (
        <TileArtwork pieceId={pieceId} size={size} />
      ) : null}
    </div>
  );
}
