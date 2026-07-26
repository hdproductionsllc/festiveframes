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
 * look like the same moulding rather than the big one looking flat.
 *
 * Tuned by rendering real badges and looking: at 0.075 the shaded band read as a
 * muddy grey inner frame on the WHITE fields, competing with the brass rim. Pulled
 * back so the rim carries the edge and the bevel only supplies the lift.
 */
export const BEVEL_RATIO = 0.055;

/**
 * Outer corner radius as a fraction of the short side.
 *
 * Deliberately generous. A small radius reads as a printed square with the corners
 * knocked off; a real snap-in badge is moulded, and the eye reads the roundness of
 * the corner as evidence of a physical part.
 */
export const RADIUS_RATIO = 0.1;

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
export function bevelMetrics(
  w: number,
  h: number,
  background: string = TILE_BG.navy,
  /**
   * ONE grid cell, in the same px as `w`/`h` — the reference the edge is measured
   * against. Defaults to the short side, which is right only for a single square
   * cell; every other caller must pass the real cell size.
   *
   * Sizing the edge off the element itself is what made the two-row bottom panel's
   * bevel exactly twice the one-row top bar's, and a 2x2 badge's twice a 1x1's. A
   * moulded edge is a physical thing: it is the same width wherever it appears, and
   * scaling it with the part it borders is the giveaway that it was drawn.
   */
  unit: number = Math.min(w, h),
) {
  const t = Math.max(1, Math.round(unit * BEVEL_RATIO));
  const light = luminance(background) > 0.6;
  return {
    /** Border thickness in px. */
    thickness: t,
    /** Corner radius of the outer edge — matches the printed tile's rounding. */
    radius: Math.max(2, Math.round(Math.min(w, h) * RADIUS_RATIO)),
    /** The lit (top-left) edge. */
    highlight: light ? "rgba(0,0,0,0.10)" : "rgba(255,255,255,0.45)",
    /** The falling-away (bottom-right) edge — always the darker of the two. */
    shade: light ? "rgba(0,0,0,0.22)" : "rgba(0,0,0,0.38)",
  };
}

/**
 * The bevel's colour run, as gradient stops along the upper-left light axis.
 *
 * This replaced four flat-filled trapezoids. Those mitred at 45 degrees, which put
 * a straight diagonal seam across every corner while the rim beside it curved — the
 * one detail that gave the whole badge away as drawn rather than moulded. A gradient
 * has no seam to misalign: it is filled through a band that follows the rounded
 * contour, so the corner is simply where the run passes from lit to shaded.
 *
 * The middle stops sit close together on purpose. Spread evenly the band looks
 * domed, like a tube; held flat across the top and bottom with a quick roll between
 * them, it looks faceted — a cut edge catching light, which is what a bevel is.
 */
export function bevelGradient(background: string = TILE_BG.navy): Array<[number, string]> {
  const light = luminance(background) > 0.6;
  // A raised white face cannot get brighter than white, so a light field shows its
  // depth entirely in shadow — the lit side merely shaded less. Same reasoning as
  // `bevelMetrics`, expressed as a run instead of a pair.
  return light
    ? [
        [0, "rgba(0,0,0,0.03)"],
        [0.42, "rgba(0,0,0,0.09)"],
        [0.58, "rgba(0,0,0,0.16)"],
        [1, "rgba(0,0,0,0.28)"],
      ]
    : [
        [0, "rgba(255,255,255,0.55)"],
        [0.42, "rgba(255,255,255,0.14)"],
        [0.58, "rgba(0,0,0,0.14)"],
        [1, "rgba(0,0,0,0.44)"],
      ];
}

/**
 * The bevel gradient's AXIS, as start and end points inside the box.
 *
 * Not simply corner-to-corner. A diagonal is right for a square badge, but the top
 * and bottom bars are four times wider than they are tall, and on those a
 * corner-to-corner run is overwhelmingly horizontal — it lit the left end of the
 * banner and shaded the right, when what a bevel must do is light the top edge and
 * shade the bottom one whatever the box's proportions.
 *
 * So the horizontal lean is scaled by how square the box is: a square badge keeps a
 * proper diagonal, a wide bar goes almost vertical, and everything between is
 * proportional. Both ends stay inside the box, so no part of the band clamps to a
 * flat end colour.
 */
export function bevelAxis(x: number, y: number, w: number, h: number) {
  const squareness = Math.min(w, h) / Math.max(w, h);
  // The run always spans the FULL height, so the top edge is lit and the bottom edge
  // shaded no matter the proportions. Only the sideways lean varies, and it is
  // measured against the height — never the width, or a wide bar's own length
  // dominates the axis and the gradient turns into a left-to-right wash.
  //
  // Squared rather than linear because the sideways drift a lean introduces grows
  // with the box's width: on a square this is a true corner-to-corner diagonal, and
  // it falls away fast enough that a 6:1 banner stays visibly top-lit.
  const lean = (h * squareness * squareness) / 2;
  const cx = x + w / 2;
  return { x0: cx - lean, y0: y, x1: cx + lean, y1: y + h };
}

/** The same run as a CSS `linear-gradient(...)`, on the axis `bevelAxis` describes. */
export function bevelGradientCss(
  background: string = TILE_BG.navy,
  w: number = 1,
  h: number = 1,
): string {
  const a = bevelAxis(0, 0, w, h);
  // CSS gradient angles run clockwise from "to top", which is what atan2(dx, dy) gives.
  const deg = (Math.atan2(a.x1 - a.x0, -(a.y1 - a.y0)) * 180) / Math.PI;
  const stops = bevelGradient(background)
    .map(([at, colour]) => `${colour} ${(at * 100).toFixed(0)}%`)
    .join(", ");
  return `linear-gradient(${deg.toFixed(1)}deg, ${stops})`;
}

/**
 * Every number the on-screen chrome needs, derived from the SAME functions the
 * canvas uses, so the preview and the printed sheet cannot drift.
 *
 * They had drifted badly. The screen path hardcoded a 3px corner radius, a 1px
 * brass ring flush to the edge and a 1.5px bevel, while the canvas scaled all three
 * off the tile's short side. At print size that is a 36px radius and a 21px rim; on
 * screen it was a couple of pixels of grey. The chrome was not missing from the
 * builder, it was there at a size nobody could see — which is why the exported file
 * looked right and the thing you were designing in did not.
 */
export function tileEdgeCss(
  size: number,
  background: string = TILE_BG.navy,
  /** The box's real proportions, so the bevel's lean matches the canvas. Defaults to
   *  square, which is every badge; the bars pass their actual width and height. */
  boxW: number = size,
  boxH: number = size,
  /** ONE grid cell on screen, so the edge is the same width on a 1x1 badge, a 3x3
   *  badge, the one-row top bar and the two-row bottom panel. */
  unit: number = size,
) {
  const bevel = bevelMetrics(boxW, boxH, background, unit);
  const rim = rimMetrics(boxW, boxH, unit);
  return {
    radius: bevel.radius,
    rimInset: rim.inset,
    rimWidth: rim.width,
    rimRadius: rim.radius,
    bevelWidth: bevel.thickness,
    bevelRadius: Math.max(1, bevel.radius - rim.inset - rim.width),
    bevelGradient: bevelGradientCss(background, boxW, boxH),
    brassGradient: brassGradientCss(),
    /** Hairline against the neighbouring badge, plus the lift off the frame. */
    outerShadow: [
      "inset 0 0 0 1px rgba(0,0,0,0.25)",
      `0 ${Math.max(1, Math.round(size * 0.012))}px ${Math.max(2, Math.round(size * 0.035))}px rgba(0,0,0,0.45)`,
    ].join(", "),
  };
}

// ─── Brass rim + cast shadow ────────────────────────────────────────────────

/**
 * The metallic rim. Real metal is not one colour — it reads as metal precisely
 * because it runs bright where it faces the light and dark where it turns away.
 * A flat gold line looks like a yellow stroke; these three stops, run along the
 * same upper-left light axis as the bevel, look like brass.
 */
export const BRASS = {
  /** Catching the light, top-left. */
  light: "#F0D488",
  /** Body colour. */
  mid: "#C9A227",
  /** In shade, bottom-right. */
  dark: "#7C5E15",
} as const;

/**
 * Rim thickness and inset for a tile. Thin on purpose: the rim should read as a
 * machined edge, not a gold frame. Scaled off the short side so every badge gets
 * the same weight of edge regardless of footprint.
 */
export function rimMetrics(w: number, h: number, unit: number = Math.min(w, h)) {
  // Measured against ONE CELL, never the element — same reason as the bevel. A rim
  // that thickens with the panel it borders stops reading as a machined edge.
  //
  // The inset is what makes the rim read as a rim. Flush against the edge (it used
  // to be 0.012, which rounds to a pixel or two) it looks like the tile was simply
  // printed with a gold outline. Set back far enough to leave a visible margin of
  // field OUTSIDE it, the eye reads a metal ring sitting on a surface.
  const inset = Math.max(1, Math.round(unit * 0.032));
  const width = Math.max(1, Math.round(unit * 0.018));
  return {
    width,
    inset,
    /** Concentric with the outer corner: the outer radius less how far we came in. */
    radius: Math.max(2, Math.round(Math.min(w, h) * RADIUS_RATIO) - inset),
  };
}

/**
 * How far in from the tile edge the CONTENT may start — past the rim, past the
 * bevel, plus a little air.
 *
 * Text was being cut into by the bevel because the two were sized independently:
 * padding at 6% of the short edge against a bevel band at 5.5% of it left half a
 * percent of clearance, so descenders ran straight into the shaded lip and the
 * banner read as a sticker with something printed over it. Deriving the padding
 * from the chrome instead of guessing alongside it makes that impossible.
 */
export function chromeInset(
  w: number,
  h: number,
  background: string = TILE_BG.navy,
  unit: number = Math.min(w, h),
): number {
  const rim = rimMetrics(w, h, unit);
  const bevel = bevelMetrics(w, h, background, unit);
  const air = Math.round(unit * 0.035);
  return rim.inset + rim.width + bevel.thickness + air;
}

/** The brass run as a CSS gradient, on the same upper-left light axis as the canvas. */
export function brassGradientCss(): string {
  return `linear-gradient(135deg, ${BRASS.light} 0%, ${BRASS.mid} 50%, ${BRASS.dark} 100%)`;
}

/**
 * The shadow the ARTWORK casts onto the field behind it.
 *
 * This is what sells the badge as two physical layers — art sitting ON a field —
 * rather than one flat print. It only reads because the art is cut out to
 * transparency: the shadow is thrown by the art's own silhouette, so a solid
 * square piece would just get a shadow around its border and look no different.
 * Offset down-right, matching the same upper-left light source as the bevel.
 */
export function artShadow(w: number, h: number) {
  const short = Math.min(w, h);
  return {
    blur: Math.max(1, short * 0.035),
    offsetX: Math.max(1, short * 0.012),
    offsetY: Math.max(1, short * 0.016),
    color: "rgba(0,0,0,0.38)",
  };
}

/** CSS twin of `artShadow`, for the on-screen tile's <img>. */
export function artShadowCss(size: number): string {
  const a = artShadow(size, size);
  return `drop-shadow(${a.offsetX.toFixed(1)}px ${a.offsetY.toFixed(1)}px ${a.blur.toFixed(1)}px ${a.color})`;
}

/** A flat colour expressed as a CSS image, for use as a `ringCss` fill. */
export function solidFill(colour: string): string {
  return `linear-gradient(${colour}, ${colour})`;
}

/**
 * A gradient ring, as CSS, for an element whose border is `width` and transparent.
 *
 * The two-background trick: `fill` paints the padding box, the gradient paints the
 * border box, so the gradient shows only in the border itself. A ring drawn this
 * way keeps the element's `border-radius`, which `border-image` does not — and a
 * rounded rim that squares off at the corners is exactly the tell we are trying to
 * remove.
 *
 * `fill` MUST be opaque. It is the only thing masking the gradient away from the
 * middle, so a transparent fill does not produce a thin ring — it floods the whole
 * element with the gradient. Passing `transparent` here to let a parent's gloss
 * show through turned both banners solid gold.
 */
export function ringCss(fill: string, gradient: string): string {
  return `${fill} padding-box, ${gradient} border-box`;
}

// ─── Raised banner type ─────────────────────────────────────────────────────

/**
 * The lift given to banner TEXT: a cast shadow plus a one-pixel-ish lit edge above
 * and shaded edge below, scaled to the type size.
 *
 * Flat-filled type on a bevelled, rimmed, gloss-gradient bar is the one element
 * still reading as printed-on rather than part of the moulding. The same upper-left
 * light source as everything else, so the letters sit in the same world as the badge
 * edges rather than looking pasted over them.
 *
 * `depth` stays a fraction of the font size, not a fixed pixel: at 1px a headline
 * looks flat and a tagline looks smeared.
 */
export function textEmboss(fontPx: number, textColour: string) {
  const lightText = luminance(textColour) > 0.6;
  return {
    depth: Math.max(1, fontPx * 0.022),
    // Light type cannot get lighter, so its depth comes almost entirely from the
    // shaded underside — the same reasoning as the bevel on a white field.
    highlight: lightText ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.55)",
    shade: lightText ? "rgba(0,0,0,0.55)" : "rgba(0,0,0,0.35)",
    shadow: {
      blur: Math.max(1, fontPx * 0.09),
      offsetX: Math.max(1, fontPx * 0.02),
      offsetY: Math.max(1, fontPx * 0.035),
      colour: "rgba(0,0,0,0.45)",
    },
  };
}

/** CSS twin of `textEmboss`, as a `text-shadow` stack (lit edge, shade, cast). */
export function textEmbossCss(fontPx: number, textColour: string): string {
  const e = textEmboss(fontPx, textColour);
  const d = e.depth.toFixed(2);
  const s = e.shadow;
  return [
    `${-e.depth.toFixed(2)}px ${-e.depth.toFixed(2)}px 0 ${e.highlight}`,
    `${d}px ${d}px 0 ${e.shade}`,
    `${s.offsetX.toFixed(2)}px ${s.offsetY.toFixed(2)}px ${s.blur.toFixed(2)}px ${s.colour}`,
  ].join(", ");
}

// ─── Shared panel chrome ────────────────────────────────────────────────────

/** Move a #rrggbb colour toward white (t>0) or black (t<0) by fraction |t|. */
export function shift(hex: string, t: number): string {
  const h = hex.replace("#", "");
  if (h.length !== 6) return hex;
  const to = t >= 0 ? 255 : 0;
  const a = Math.abs(t);
  const ch = [0, 2, 4].map((i) => {
    const v = parseInt(h.slice(i, i + 2), 16);
    return Math.round(v + (to - v) * a).toString(16).padStart(2, "0");
  });
  return `#${ch.join("")}`;
}

/**
 * Top and bottom stops for a panel's gloss gradient.
 *
 * The mock's banners are not flat colour — they lift slightly at the top and fall
 * away at the bottom, which is what makes them read as enamel rather than printed
 * paper. Subtle on purpose: a strong gradient looks like a web button, while a few
 * percent reads as a surface catching light. Same upper-left source as the bevel.
 */
export function glossStops(background: string): [string, string] {
  return [shift(background, 0.14), shift(background, -0.08)];
}
