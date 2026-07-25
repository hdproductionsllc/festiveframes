"use client";

import { getPiece } from "@/data/sets";
import { artShadowCss, bevelBoxShadow, rimCss, tileBackground } from "@/lib/utils/tile-theme";
import { TileArtwork, hasCustomArtwork, canDieCut } from "@/components/tiles/TileArtwork";
import { useDesignStore } from "@/stores/design-store";

interface PlacedTileViewProps {
  pieceId: string;
  width: number;
  height: number;
  animate?: boolean;
  /** UPLOADED customer art. When set, the snappet renders this image (objectFit
   *  cover) instead of a set piece — the single render branch that unifies uploaded
   *  art with the snappet engine. Absent on every /build tile, so that path is the
   *  set-piece render below, byte-for-byte. */
  image?: { url: string; fullResId?: string };
}

export function PlacedTileView({ pieceId, width, height, animate, image }: PlacedTileViewProps) {
  const dieCut = useDesignStore((s) => s.dieCut);

  // Uploaded art: render the image itself, sized to the snappet rect. `cover` fills
  // the footprint at the image's aspect; a native-aspect placement (the default on
  // upload) shows the whole photo with no crop.
  if (image) {
    return (
      <div
        className="rounded-[3px] overflow-hidden flex items-center justify-center"
        style={{
          width,
          height,
          boxShadow:
            "0 2px 6px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(0,0,0,0.1)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image.url}
          alt=""
          draggable={false}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>
    );
  }

  const piece = getPiece(pieceId);
  if (!piece) return null;

  const size = Math.min(width, height);
  const isDieCut = dieCut && canDieCut(pieceId);

  return (
    <div
      className={`rounded-[3px] overflow-hidden flex items-center justify-center ${animate ? "animate-tile-snap" : ""}`}
      style={{
        width,
        height,
        // Same two answers the PRINT path uses (tile-theme), so the preview and the
        // sheet cannot disagree: the standard field colour, and the raised bevel edge.
        backgroundColor: isDieCut ? "transparent" : tileBackground(piece),
        boxShadow: isDieCut ? "none" : `${rimCss()}, ${bevelBoxShadow(tileBackground(piece))}`,
        filter: isDieCut ? "drop-shadow(0 2px 3px rgba(0,0,0,0.5))" : undefined,
      }}
    >
      {piece.artworkUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={piece.artworkUrl}
          alt={piece.name}
          // Cast shadow from the ART onto the field — the same two-layer read the
          // print path draws. Only works because the art is cut out to transparency.
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: isDieCut ? undefined : artShadowCss(size),
          }}
          draggable={false}
        />
      ) : hasCustomArtwork(pieceId) ? (
        <TileArtwork pieceId={pieceId} size={size} />
      ) : null}
    </div>
  );
}
