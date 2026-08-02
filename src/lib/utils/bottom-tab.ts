import type { BottomTab, FrameConfig } from "@/lib/types";
import { bevelMetrics, rimMetrics } from "@/lib/utils/tile-theme";

// ─── The keystone on the bottom bar ─────────────────────────────────────────
//
// A centre section of the bottom bar that protrudes UP into the plate opening,
// carrying the tagline above the name instead of below it. It is what every
// commercial plate frame does when it needs a second line, and it is the only way
// to keep the two-tier lockup once the bottom bar is a single row.
//
// The point of it is fitment. The two-row bottom bar was the single worst edge on
// the frame: it put 1.46" of material below the plate, on the part of a car most
// likely to be obstructed. A one-row bar drops that to 0.47" and makes the frame
// symmetric, but it also leaves nowhere for the class year. The keystone grows
// INWARD, over the plate face, so it buys the line back for nothing: the frame's
// outer envelope does not move, and the quarter test is unaffected.
//
// ONE source of the shape, because the builder draws it in CSS and the print sheet
// draws it on canvas, and this file exists so those two cannot disagree — the same
// reason `tile-theme` and `banner-tiers` exist.

/** The tab's outline as points, in the caller's own units, anchored to the bar. */
export interface TabPath {
  /** Points clockwise from the bottom-left, ready for moveTo/lineTo or a polygon. */
  points: Array<{ x: number; y: number }>;
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
   * rim around its whole rounded rectangle, including across the top edge the tab
   * stands on. The skirt is the tab's fill carried down over that rim, far enough
   * to bury it, so the two read as a single continuous body.
   */
  skirt = 0,
): TabPath {
  const rise = tab.riseInches * pxPerInch;
  const base = tab.baseInches * pxPerInch;
  const top = Math.min(base, tab.topInches * pxPerInch);
  const halfB = base / 2;
  const halfT = top / 2;
  const topY = barTopY - rise;
  const footY = barTopY + skirt;
  return {
    rise,
    base,
    top,
    left: centerX - halfB,
    // Down the left skirt, up the left slope, across the top, down the right
    // slope, down the right skirt. The base itself is never a drawn edge.
    points: [
      { x: centerX - halfB, y: footY },
      { x: centerX - halfB, y: barTopY },
      { x: centerX - halfT, y: topY },
      { x: centerX + halfT, y: topY },
      { x: centerX + halfB, y: barTopY },
      { x: centerX + halfB, y: footY },
    ],
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
 * where the product needs continuity, and it is what shipped until this note was
 * written. The skirt has to survive; only the RIM must stop at the base.
 */
export function tabClipPath(tab: BottomTab, pxPerInch: number, skirt = 0, rimPx = 0): string {
  const rise = tab.riseInches * pxPerInch;
  const base = tab.baseInches * pxPerInch;
  const top = Math.min(base, tab.topInches * pxPerInch);
  const inset = (base - top) / 2;
  const foot = rise + skirt;
  const r = Math.max(0, Math.min(rimPx, base / 2, rise));
  if (r === 0) {
    return `polygon(${inset}px 0, ${base - inset}px 0, ${base}px ${rise}px, ${base}px ${foot}px, 0 ${foot}px, 0 ${rise}px)`;
  }
  // Down from the inset apex, out to the full width AT the base, then the skirt.
  return [
    `polygon(${r + inset}px ${r}px`,
    `${base - r - inset}px ${r}px`,
    `${base - r}px ${rise}px`,
    `${base}px ${rise}px`,
    `${base}px ${foot}px`,
    `0 ${foot}px`,
    `0 ${rise}px`,
    `${r}px ${rise}px)`,
  ].join(", ");
}

/**
 * The box the TAGLINE gets inside the tab.
 *
 * Inset from the sloped sides so a long line does not run into them, and given a
 * little air top and bottom. Returned in the same units as `pxPerInch`.
 */
export function tabTextBox(tab: BottomTab, pxPerInch: number): { width: number; height: number } {
  const rise = tab.riseInches * pxPerInch;
  const top = Math.min(tab.baseInches, tab.topInches) * pxPerInch;
  return {
    // The narrow (top) width less a margin either side — the widest rectangle that
    // fits clear of both slopes.
    width: Math.max(1, top * 0.92),
    height: Math.max(1, rise * 0.72),
  };
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

/** This frame's tab, or null. A frame without one draws a plain rectangular bar. */
export function frameTab(config: Pick<FrameConfig, "bottomTab">): BottomTab | null {
  const t = config.bottomTab;
  if (!t || t.riseInches <= 0 || t.baseInches <= 0) return null;
  return t;
}
