import type { TilePiece } from "@/lib/types";

// ─── Snap-in badge look ─────────────────────────────────────────────────────
//
// One place that decides how a tile READS — its background and its edge — so the
// on-screen builder and the printed sheet cannot drift apart. They had drifted:
// the print path filled every tile hard white and used `piece.backgroundColor`
// only as a missing-art fallback, while the screen path honoured it. Any piece
// with transparent art and a coloured background therefore previewed one way and
// printed another.

/**
 * The STANDARD background palette. A cohesive set reads as one product; per-piece
 * one-off colours read as a sticker sheet. Every tile background must come from
 * here, so the whole frame stays within one scheme.
 */
export const TILE_BG = {
  /** Deep navy — the default field. Light and mid-tone art sits on this. */
  navy: "#1B2A4A",
  /** Clean white — for art that is itself dark (a black chess knight, navy type). */
  white: "#FFFFFF",
  /** Mid blue — a lighter field for variety without leaving the scheme. */
  blue: "#2C5AA0",
  /** Deep crimson — accent, used sparingly. */
  crimson: "#9E1B32",
} as const;

export type TileBg = (typeof TILE_BG)[keyof typeof TILE_BG];

/**
 * Relative luminance (0–1) of a #rrggbb colour, sRGB-weighted. Used to decide
 * whether art needs a light or dark field behind it.
 */
export function luminance(hex: string): number {
  const h = hex.replace("#", "");
  if (h.length !== 6) return 0.5;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * The background a tile actually paints — the ONE answer both renderers ask for.
 *
 * A piece's own `backgroundColor` wins when it is already part of the standard
 * palette (or the piece is a deliberate solid colour block). Anything else is
 * snapped to the nearest standard field, so a stray one-off colour cannot break
 * the scheme. Die-cut printing has no field at all: the art is cut to shape and
 * the frame shows through.
 */
export function tileBackground(piece: Pick<TilePiece, "backgroundColor">): string {
  const own = piece.backgroundColor?.toUpperCase();
  const standard = Object.values(TILE_BG).map((c) => c.toUpperCase());
  if (own && standard.includes(own)) return own;
  // Off-palette: keep the light/dark relationship the artist intended, but express
  // it in the scheme's own colours.
  return own && luminance(own) > 0.6 ? TILE_BG.white : TILE_BG.navy;
}

// ─── Faux bevel ─────────────────────────────────────────────────────────────

/**
 * Bevel thickness as a FRACTION of the tile's short side, so a 1x1 and a 3x3 badge
 * look like the same moulding rather than the big one looking flat. Tuned against
 * the product mock: thick enough to read as a raised edge at ~1in, thin enough not
 * to eat the art.
 */
export const BEVEL_RATIO = 0.075;

/**
 * Bevel geometry for a tile rect — pure, so it is testable without a canvas.
 *
 * The edge colours ADAPT to the field, because a fixed pair only works on a dark
 * one. A white highlight on a white badge is invisible, which left the top-left
 * looking flat while the bottom-right had an edge — worse than no bevel. That is
 * also physically right: a raised white face cannot get brighter than white, so a
 * light badge shows its depth entirely through shading, with the lit side merely
 * shaded LESS than the falling-away side.
 */
export function bevelMetrics(w: number, h: number, background: string = TILE_BG.navy) {
  const t = Math.max(1, Math.round(Math.min(w, h) * BEVEL_RATIO));
  const light = luminance(background) > 0.6;
  return {
    /** Border thickness in px. */
    thickness: t,
    /** Corner radius of the outer edge — matches the printed tile's rounding. */
    radius: Math.max(2, Math.round(Math.min(w, h) * 0.06)),
    /** The lit (top-left) edge. */
    highlight: light ? "rgba(0,0,0,0.10)" : "rgba(255,255,255,0.45)",
    /** The falling-away (bottom-right) edge — always the darker of the two. */
    shade: light ? "rgba(0,0,0,0.30)" : "rgba(0,0,0,0.38)",
  };
}

/**
 * The CSS that gives an on-screen tile the same raised edge the print path draws.
 * Kept here rather than inline in the component so the two stay in step: an inset
 * highlight along the top-left and an inset shade along the bottom-right read as a
 * light source from above-left, plus a small drop shadow to lift the badge off the
 * frame.
 */
export function bevelBoxShadow(background: string = TILE_BG.navy): string {
  const light = luminance(background) > 0.6;
  return [
    `inset 1.5px 1.5px 0 ${light ? "rgba(0,0,0,0.10)" : "rgba(255,255,255,0.45)"}`,
    `inset -1.5px -1.5px 0 ${light ? "rgba(0,0,0,0.30)" : "rgba(0,0,0,0.38)"}`,
    "inset 0 0 0 1px rgba(0,0,0,0.25)",
    "0 2px 5px rgba(0,0,0,0.45)",
  ].join(", ");
}
