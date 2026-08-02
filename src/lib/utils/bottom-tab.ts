import type { BottomTab, FrameConfig } from "@/lib/types";

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
): TabPath {
  const rise = tab.riseInches * pxPerInch;
  const base = tab.baseInches * pxPerInch;
  const top = Math.min(base, tab.topInches * pxPerInch);
  const halfB = base / 2;
  const halfT = top / 2;
  const topY = barTopY - rise;
  return {
    rise,
    base,
    top,
    left: centerX - halfB,
    points: [
      { x: centerX - halfB, y: barTopY },
      { x: centerX - halfT, y: topY },
      { x: centerX + halfT, y: topY },
      { x: centerX + halfB, y: barTopY },
    ],
  };
}

/** A `polygon()` clip-path for the CSS side, in px, relative to the tab's own box. */
export function tabClipPath(tab: BottomTab, pxPerInch: number): string {
  const rise = tab.riseInches * pxPerInch;
  const base = tab.baseInches * pxPerInch;
  const top = Math.min(base, tab.topInches * pxPerInch);
  const inset = (base - top) / 2;
  return `polygon(${inset}px 0, ${base - inset}px 0, ${base}px ${rise}px, 0 ${rise}px)`;
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

/** This frame's tab, or null. A frame without one draws a plain rectangular bar. */
export function frameTab(config: Pick<FrameConfig, "bottomTab">): BottomTab | null {
  const t = config.bottomTab;
  if (!t || t.riseInches <= 0 || t.baseInches <= 0) return null;
  return t;
}
