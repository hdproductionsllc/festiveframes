"use client";

import { getPiece } from "@/data/sets";
import {
  artShadowCss,
  cornerRadii,
  insetRadii,
  radiusCss,
  ringCss,
  solidFill,
  tileBackground,
  tileField,
  tileEdgeCss,
  NO_CORNERS,
  type CornerFlags,
} from "@/lib/utils/tile-theme";
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
  /**
   * ONE grid cell in px. The badge's edge is measured against this, not against the
   * badge, so a 3x3 wears the same thin moulding as a 1x1. Defaults to the tile's
   * own short side for callers that draw a lone tile at cell size (the drag ghost).
   */
  unit?: number;
  /**
   * Which of this badge's corners face the FRAME's outside. Those get a much wider
   * radius, so the frame reads as one rounded part instead of a grid of separately
   * rounded squares. Absent = an interior badge, ordinary radius all round.
   */
  corners?: CornerFlags;
}

export function PlacedTileView({
  pieceId,
  width,
  height,
  animate,
  image,
  unit,
  corners,
}: PlacedTileViewProps) {
  const dieCut = useDesignStore((s) => s.dieCut);
  const tileFieldColor = useDesignStore((s) => s.tileFieldColor);
  const rimColor = useDesignStore((s) => s.rimColor);

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
  // Both overrides come from the design, so the swatch you pick, the tile on the
  // frame and the printed sheet cannot disagree.
  const field = tileField(piece, tileFieldColor);
  const edge = tileEdgeCss(size, field, width, height, unit ?? size, rimColor);
  const radii = cornerRadii(unit ?? size, corners ?? NO_CORNERS);
  const rimRadii = insetRadii(radii, edge.rimInset);
  const bevelRadii = insetRadii(rimRadii, edge.rimWidth);

  const art = piece.artworkUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={piece.artworkUrl}
      alt={piece.name}
      // Cast shadow from the ART onto the field — the same two-layer read the
      // print path draws. Only works because the art is cut out to transparency.
      style={{
        width: "100%",
        height: "100%",
        // CONTAIN, not cover — see the print path's note. A badge is a mark on a
        // field; cropping a square logo to fit a 2x1 removes exactly the part that
        // carries the meaning.
        objectFit: "contain",
        filter: isDieCut ? undefined : artShadowCss(size),
      }}
      draggable={false}
    />
  ) : hasCustomArtwork(pieceId) ? (
    <TileArtwork pieceId={pieceId} size={size} />
  ) : null;

  if (isDieCut) {
    return (
      <div
        className={`overflow-hidden flex items-center justify-center ${animate ? "animate-tile-snap" : ""}`}
        style={{ width, height, filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.5))" }}
      >
        {art}
      </div>
    );
  }

  // Three layers, matching the print path outward-in: the field carrying the outer
  // hairline and lift, the inset brass ring, then the bevel band around the art.
  // Nested rather than stacked box-shadows because the rim and the bevel are now
  // real gradients following the corner, which an inset shadow cannot express.
  return (
    <div
      className={`overflow-hidden flex items-center justify-center ${animate ? "animate-tile-snap" : ""}`}
      style={{
        width,
        height,
        backgroundColor: field,
        borderRadius: radiusCss(radii),
        boxShadow: edge.outerShadow,
        padding: edge.rimInset,
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          border: `${edge.rimWidth}px solid transparent`,
          borderRadius: radiusCss(rimRadii),
          background: ringCss(solidFill(field), edge.brassGradient),
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            overflow: "hidden",
            border: `${edge.bevelWidth}px solid transparent`,
            borderRadius: radiusCss(bevelRadii),
            background: ringCss(solidFill(field), edge.bevelGradient),
          }}
        >
          {art}
        </div>
      </div>
    </div>
  );
}
