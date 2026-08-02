import type { BottomTab, FrameConfig } from "@/lib/types";
import { bevelMetrics, rimMetrics } from "@/lib/utils/tile-theme";

// ─── The keystone on the bottom bar ─────────────────────────────────────────
//
// A centre section of the bottom bar that protrudes UP into the plate opening,
// carrying the tagline above the name instead of below it. It is what every
// commercial plate frame does when it needs a second line, and it is the only way
// to keep the two-tier lockup once the bottom bar is a single row.
//
// The point of it is fitment. A two-row bottom bar puts an extra 0.99" of material
// below the plate, on the part of a car most likely to be obstructed. The keystone
// grows INWARD, over the plate face, so it buys the line back for nothing: the
// frame's outer envelope does not move and the quarter test is unaffected.
//
// ONE source of the shape, because the builder draws it in CSS and the print sheet
// draws it on canvas, and this file exists so those two cannot disagree — the same
// reason `tile-theme` and `banner-tiers` exist. That is also why the rounded
// corners are SAMPLED here into plain points rather than left to each renderer's
// own curve primitive: `clip-path: path()` and `ctx.arcTo` would be two curves,
// and two curves are two chances to drift.

/** A point in whatever unit the caller is drawing in. */
export interface Pt {
  x: number;
  y: number;
}

/** How finely a rounded corner is sampled. Ten segments is smooth past 4x zoom on
 *  a phone and past 300 DPI in print, and keeps the CSS polygon short. */
const CORNER_STEPS = 10;

/** Quadratic Bézier through `ctrl`, from `a` to `b`, sampled inclusive of both. */
function corner(a: Pt, ctrl: Pt, b: Pt, steps = CORNER_STEPS): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    out.push({
      x: u * u * a.x + 2 * u * t * ctrl.x + t * t * b.x,
      y: u * u * a.y + 2 * u * t * ctrl.y + t * t * b.y,
    });
  }
  return out;
}

/**
 * The tab's OUTER edge, in local coords with the origin at the top-left of a box
 * `base` wide: from the left base corner, up the left slope, over the (optionally
 * rounded) top, and down to the right base corner.
 *
 * This is the run that carries the rim. The base corners are its endpoints and are
 * never rounded — that is where the tab meets the bar, and rounding them would
 * carve two notches out of solid material.
 */
function tabEdge(rise: number, base: number, top: number, radius: number): Pt[] {
  const inset = (base - top) / 2;
  const apexL: Pt = { x: inset, y: 0 };
  const apexR: Pt = { x: base - inset, y: 0 };
  const baseL: Pt = { x: 0, y: rise };
  const baseR: Pt = { x: base, y: rise };
  if (radius <= 0 || rise <= 0) return [baseL, apexL, apexR, baseR];

  // How far back from the vertex each edge is cut. Derived from the corner's own
  // angle, so a steep slope and a shallow one round by the same visual amount
  // instead of the shallow one flattening out.
  const slopeLen = Math.hypot(inset, rise);
  const half = Math.acos(Math.max(-1, Math.min(1, -inset / slopeLen))) / 2;
  const cut = Math.min(
    radius / Math.max(1e-6, Math.tan(half)),
    // Never eat more than the edges have to give: half the top edge, or the slope.
    top / 2,
    slopeLen,
  );
  const ux = inset / slopeLen; // unit vector, apex -> base corner
  const uy = rise / slopeLen;

  return [
    baseL,
    // Up the left slope to where the round begins, round onto the top edge…
    ...corner({ x: apexL.x - ux * cut, y: apexL.y + uy * cut }, apexL, { x: apexL.x + cut, y: 0 }),
    // …across, then round down onto the right slope.
    ...corner({ x: apexR.x - cut, y: 0 }, apexR, { x: apexR.x + ux * cut, y: apexR.y + uy * cut }),
    baseR,
  ];
}

/** The tab's outline as points, in the caller's own units, anchored to the bar. */
export interface TabPath {
  /** The full closed outline: down the left skirt, over the top, down the right. */
  points: Pt[];
  /**
   * Just the OUTER edge — the two slopes and the top, base corner to base corner.
   *
   * Stroked as the rim. Kept as its own array rather than a slice of `points`,
   * because the two magic indices that used to do that job (`slice(2, 5)`) would
   * silently stop meaning the same thing the moment the corners gained points.
   */
  rim: Pt[];
  /** Height of the tab, same units. */
  rise: number;
  /** Widths, same units. */
  base: number;
  top: number;
  /** Left edge of the tab's base, measured from `centerX - base/2`. */
  left: number;
}

/**
 * The tab's outline, given the bar's own box.
 *
 * `barTopY` is the y of the bar's top edge and `centerX` the horizontal centre,
 * both in whatever unit the caller is drawing in; `pxPerInch` converts the
 * config's inches into it. Y grows DOWNWARD, as it does in both canvas and CSS,
 * so the tab's top edge is at a SMALLER y than the bar's.
 */
export function tabPath(
  tab: BottomTab,
  centerX: number,
  barTopY: number,
  pxPerInch: number,
  /**
   * How far the shape continues DOWN past the bar's top edge, same units.
   *
   * The tab and the bar are ONE piece of material — Bill would 3D print them as
   * one part — so there must be no line where they meet. But the bar draws its own
   * rim and bevel around its whole rounded rectangle, including across the top edge
   * the tab stands on. The skirt is the tab's fill carried down over that chrome,
   * far enough to bury it, so the two read as a single continuous body. Size it
   * with `tabSkirt`.
   */
  skirt = 0,
): TabPath {
  const rise = tab.riseInches * pxPerInch;
  const base = tab.baseInches * pxPerInch;
  const top = Math.min(base, tab.topInches * pxPerInch);
  const radius = (tab.cornerRadiusInches ?? 0) * pxPerInch;
  const left = centerX - base / 2;
  const topY = barTopY - rise;
  const rim = tabEdge(rise, base, top, radius).map((p) => ({ x: left + p.x, y: topY + p.y }));
  return {
    rise,
    base,
    top,
    left,
    rim,
    // Down the left skirt, up and over the edge, down the right skirt. The base
    // itself is never a drawn line.
    points: [{ x: left, y: barTopY + skirt }, ...rim, { x: left + base, y: barTopY + skirt }],
  };
}

/**
 * A `polygon()` clip-path for the CSS side, in px, relative to the tab's own box.
 * `skirt` carries the shape down past the bar's top edge — see `tabPath`.
 *
 * `rimPx` brings the shape in by that much along the TOP and the two SLOPES only,
 * and is what the fill layer uses to leave a band of the rim layer showing behind
 * it. Below the base the shape stays FULL WIDTH, which is the whole trick: the rim
 * is an outside edge, and below the base there is no outside — the tab and the bar
 * are one piece of material there. An inner shape inset on all four sides left a
 * strip of rim running down each side of the skirt and hanging below the bar's own
 * rim as a metal stub.
 *
 * Clipping the OUTER layer to skirt 0 also removes that stub, and it is the wrong
 * fix: `clip-path` clips descendants, so it takes the fill's skirt with it and the
 * bar's rim and bevel then run straight across the tab's base. That is a seam
 * where the product needs continuity. The skirt has to survive; only the RIM must
 * stop at the base.
 */
export function tabClipPath(tab: BottomTab, pxPerInch: number, skirt = 0, rimPx = 0): string {
  const rise = tab.riseInches * pxPerInch;
  const base = tab.baseInches * pxPerInch;
  const top = Math.min(base, tab.topInches * pxPerInch);
  const radius = (tab.cornerRadiusInches ?? 0) * pxPerInch;
  const foot = rise + skirt;
  const r = Math.max(0, Math.min(rimPx, base / 2, rise));
  const px = (p: Pt) => `${p.x.toFixed(2)}px ${p.y.toFixed(2)}px`;

  if (r === 0) {
    const edge = tabEdge(rise, base, top, radius);
    return `polygon(${[{ x: 0, y: foot }, ...edge, { x: base, y: foot }].map(px).join(", ")})`;
  }
  // The same edge brought in by one rim along the top and the slopes, then flaring
  // back to full width AT the base and continuing down through the skirt.
  const inner = tabEdge(rise - r, base - 2 * r, top - 2 * r, Math.max(0, radius - r))
    .map((p) => ({ x: p.x + r, y: p.y + r }));
  return `polygon(${[
    ...inner,
    { x: base, y: rise },
    { x: base, y: foot },
    { x: 0, y: foot },
    { x: 0, y: rise },
  ].map(px).join(", ")})`;
}

/**
 * How far the tab's fill must continue DOWN past the bar's top edge to bury the
 * chrome the bar draws there, in the same px as `unit`.
 *
 * `unit` is ONE GRID CELL, which is what every edge in this product is measured
 * against — see `rimMetrics`. The bar's chrome is a surround, then the rim, then
 * the bevel inside it, and all three scale with the cell rather than with the bar,
 * so a skirt derived from the TAB's own rise only ever covered them by luck. Both
 * renderers had a version of that and both left a line: the browser buried the rim
 * and stopped half a pixel short of the bevel, the print sheet buried the rim and
 * left the bevel's last eleven pixels running straight across the tab's base.
 *
 * The tab and the bar are one piece of material. Nothing may cross the join.
 */
export function tabSkirt(unit: number): number {
  const rim = rimMetrics(unit, unit, unit);
  const bevel = bevelMetrics(unit, unit, undefined, unit);
  // Surround + rim + the bevel inside it, and one px so a rounding difference
  // between the two renderers cannot leave a hairline.
  return rim.inset + rim.width + bevel.thickness + 1;
}

/** The share of the rise the tagline may occupy. */
const TEXT_HEIGHT_RATIO = 0.78;

/**
 * The box the TAGLINE gets inside the tab.
 *
 * Measured at the TOP OF THE TEXT, not at the tab's own top edge. The tab is a
 * trapezoid, so how wide it is depends on how far down you are; taking the
 * narrowest width — the top edge — threw away real room, and on a long school name
 * the width is what binds. The text sits centred on the rise, so its top edge is
 * `(1 - ratio) / 2` of the way down and the slopes have already opened out by
 * then. The margin that remains covers the rounded corners, which cut into exactly
 * that region.
 *
 * Returned in the same units as `pxPerInch`.
 */
export function tabTextBox(tab: BottomTab, pxPerInch: number): { width: number; height: number } {
  const rise = tab.riseInches * pxPerInch;
  const base = tab.baseInches * pxPerInch;
  const top = Math.min(base, tab.topInches * pxPerInch);
  const widthAtTextTop = top + (base - top) * ((1 - TEXT_HEIGHT_RATIO) / 2);
  return {
    width: Math.max(1, widthAtTextTop * 0.92),
    height: Math.max(1, rise * TEXT_HEIGHT_RATIO),
  };
}

/** This frame's tab, or null. A frame without one draws a plain rectangular bar. */
export function frameTab(config: Pick<FrameConfig, "bottomTab">): BottomTab | null {
  const t = config.bottomTab;
  if (!t || t.riseInches <= 0 || t.baseInches <= 0) return null;
  return t;
}
