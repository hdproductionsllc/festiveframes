"use client";

import { getPiece } from "@/data/sets";
import { TileArtImg } from "@/components/tiles/TileArtImg";
import {
  artInset,
  badgeArtworkUrl,
  artShadowCss,
  cornerRadii,
  insetRadii,
  radiusCss,
  ringCss,
  solidFill,
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
  image?: { url: string; fullResId?: string; field?: string };
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
  /** This tile's OWN colours, set while it was selected. They outrank the
   *  design-wide background/rim, which outrank the piece's designed colours.
   *  Resolved in the same order in compose-school-frame. */
  fieldOverride?: string;
  rimOverride?: string;
}

export function PlacedTileView({
  pieceId,
  width,
  height,
  animate,
  image,
  unit,
  corners,
  fieldOverride,
  rimOverride,
}: PlacedTileViewProps) {
  const dieCut = useDesignStore((s) => s.dieCut);
  const tileFieldColor = useDesignStore((s) => s.tileFieldColor);
  const rimColor = useDesignStore((s) => s.rimColor);

  // Uploaded art wears the SAME chrome as a catalogue badge — the corner radii,
  // the brass rim and the bevel — because that is what the print path draws for
  // it (compose-school-frame: field, then the photo `cover`ed over the whole
  // tile, then `drawBevel` on top). This used to return a bare 3px-rounded box
  // with a drop shadow, so a parent's photo previewed as a sticker and printed
  // as a badge, and the corner tiles' wide outside radius never showed at all.
  //
  // The rings are OVERLAYS rather than the nested boxes the badge path uses,
  // because print puts the photo under the rings (full rect, cover) where a
  // badge's art is inset past them. `mask-composite: exclude` cuts each ring's
  // middle out so the photo shows through; `ringCss`'s padding-box fill would
  // hide it.
  if (image) {
    const size = Math.min(width, height);
    const field = fieldOverride ?? tileField({ backgroundColor: image.field ?? "#FFFFFF" }, tileFieldColor);
    const edge = tileEdgeCss(size, field, width, height, unit ?? size, rimOverride ?? rimColor);
    const radii = cornerRadii(unit ?? size, corners ?? NO_CORNERS);
    const rimRadii = insetRadii(radii, edge.rimInset);
    const bevelRadii = insetRadii(rimRadii, edge.rimWidth);
    const ring = (inset: number, ringWidth: number, gradient: string, r: ReturnType<typeof cornerRadii>): React.CSSProperties => ({
      position: "absolute",
      inset,
      padding: ringWidth,
      borderRadius: radiusCss(r),
      background: gradient,
      WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
      WebkitMaskComposite: "xor",
      mask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
      maskComposite: "exclude",
      pointerEvents: "none",
    });
    return (
      <div
        className={`relative overflow-hidden ${animate ? "animate-tile-snap" : ""}`}
        style={{
          width,
          height,
          // The SAME field the print paints under this art (fieldForArtPixels at
          // crop time, white for older uploads), visible only where the photo has
          // alpha — the two renderers must show the art on the same ground.
          backgroundColor: field,
          borderRadius: radiusCss(radii),
          boxShadow: edge.outerShadow,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image.url}
          alt=""
          draggable={false}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />
        <div style={ring(edge.rimInset, edge.rimWidth, edge.brassGradient, rimRadii)} />
        <div style={ring(edge.rimInset + edge.rimWidth, edge.bevelWidth, edge.bevelGradient, bevelRadii)} />
      </div>
    );
  }

  const piece = getPiece(pieceId);
  if (!piece) return null;

  const size = Math.min(width, height);
  const isDieCut = dieCut && canDieCut(pieceId);
  // Both overrides come from the design, so the swatch you pick, the tile on the
  // frame and the printed sheet cannot disagree.
  const field = fieldOverride ?? tileField(piece, tileFieldColor);
  const edge = tileEdgeCss(size, field, width, height, unit ?? size, rimOverride ?? rimColor);
  const radii = cornerRadii(unit ?? size, corners ?? NO_CORNERS);
  // The gap between the bevel and the art, taken from the SAME helper the print path
  // uses so the two agree by construction: what artInset reserves in total, less the
  // three rings the nested boxes above already account for.
  const artAir = Math.max(
    0,
    artInset(width, height, field, unit ?? size) - edge.rimInset - edge.rimWidth - edge.bevelWidth,
  );
  const rimRadii = insetRadii(radii, edge.rimInset);
  const bevelRadii = insetRadii(rimRadii, edge.rimWidth);

  const art = piece.artworkUrl ? (
    // Served at the size the frame actually draws it. These are print masters —
    // the badges on a seeded kit frame were ~2MB of PNG for eight tiles the size
    // of a postage stamp. NOT `priority`: that emits a <link rel=preload> per
    // badge, and a badge placed from the tray after load (or re-rendered at a new
    // size) produced a preload for a srcset candidate the <img> then did not use
    // — "preloaded but not used" in the console on every tray tap. The frame is
    // in view whenever its badges render, so lazy loading fetches them at once.
    <TileArtImg
      // The twin this field calls for (ivory enamel on a field navy would vanish
      // into) — the same decision the print path makes.
      src={badgeArtworkUrl(piece, field)}
      alt={piece.name}
      width={width}
      height={height}
      // Cast shadow from the ART onto the field — the same two-layer read the
      // print path draws. Only works because the art is cut out to transparency.
      style={{
        // CONTAIN, not cover — see the print path's note. A badge is a mark on a
        // field; cropping a square logo to fit a 2x1 removes exactly the part that
        // carries the meaning.
        objectFit: "contain",
        filter: isDieCut ? undefined : artShadowCss(size),
      }}
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
            // AIR between the bevel and the art, the same gap the print path leaves.
            // Without it the art's box ended exactly at the bevel's inner edge, so
            // anything drawn out to its own bounds met the shaded band with nothing
            // in between and read as cut into. Derived from `artInset` rather than
            // restated, so the two renderers cannot drift.
            padding: artAir,
          }}
        >
          {art}
        </div>
      </div>
    </div>
  );
}
