import type { BottomBarConfig, FrameConfig, PlacedTextBar, TextBarPlacement, TextBarRow } from "@/lib/types";

/**
 * Number of tile units a row holds (top or bottom rail).
 */
export function rowLength(config: FrameConfig, row: TextBarRow): number {
  return row === "top" ? config.topSlots : config.bottomSlots;
}

/**
 * Auto-fit the text bar to its text, snapped UP to a whole number of tile
 * units. Measured against a fixed reference unit (not live pixels) so the
 * result is identical regardless of how the frame is zoomed on screen.
 *
 * Intentionally errs generous (padding + safety margin) so the bar is always
 * wide enough for its text — the render also shrink-fits as a final guard.
 */
export function measureTextBarUnits(
  cfg: BottomBarConfig,
  qrEnabled: boolean,
  maxUnits: number
): number {
  const U = 100; // reference px per tile unit
  const fontPx = U * (cfg.fontSize ?? 0.42);
  const text = (cfg.text || "YOUR TEXT HERE").toUpperCase();

  let textPx = text.length * fontPx * 0.62; // fallback estimate
  if (typeof document !== "undefined") {
    const ctx = document.createElement("canvas").getContext("2d");
    if (ctx) {
      ctx.font = `700 ${fontPx}px ${cfg.fontFamily}`;
      textPx = ctx.measureText(text).width;
    }
  }
  // letter-spacing sits between glyphs, scaled to the reference font size.
  textPx += cfg.letterSpacing * (fontPx / 28) * Math.max(0, text.length - 1);

  const padX = U * 0.8; // ~0.4 unit breathing room each side
  const qrPx = qrEnabled ? 2 * U : 0; // reserve QR width on BOTH sides → text stays centered
  const totalPx = (textPx + padX + qrPx) * 1.05; // 5% safety

  let units = Math.ceil(totalPx / U);
  // Force ODD width so the bar can sit perfectly centered on an odd-width row
  // (e.g. 13-wide top/bottom): (rowLen - width) must be even to split evenly.
  if (units % 2 === 0) units += 1;
  const maxOdd = maxUnits % 2 === 0 ? maxUnits - 1 : maxUnits;
  return Math.max(3, Math.min(maxOdd, units));
}

/**
 * The slot ids the given text bars cover (and therefore block for tiles).
 */
export function coveredSlotIds(bars: TextBarPlacement[]): string[] {
  const ids: string[] = [];
  for (const bar of bars) {
    for (let i = 0; i < bar.widthUnits; i++) {
      ids.push(`frame:${bar.row}-${bar.startIndex + i}`);
    }
  }
  return ids;
}

/**
 * Clamp a desired start index so the whole bar fits within the row.
 */
export function clampStartIndex(
  startIndex: number,
  widthUnits: number,
  rowLen: number
): number {
  return Math.max(0, Math.min(startIndex, rowLen - widthUnits));
}

// ── Collision logic ──────────────────────────────────────────────────────────
// A bar occupies the half-open column range [startIndex, startIndex+widthUnits)
// on its row. Two bars collide iff they share a row and their ranges intersect.
// All placement/move/resize paths route through these so overlap can't drift.

/** Do two half-open ranges [aStart, aStart+aLen) and [bStart, bStart+bLen) intersect? */
export function rangesOverlap(
  aStart: number,
  aLen: number,
  bStart: number,
  bLen: number
): boolean {
  return aStart < bStart + bLen && bStart < aStart + aLen;
}

/**
 * Can a bar of `widthUnits` sit at `startIndex` on `row` without (a) running off
 * the row or (b) overlapping any other bar on the same row? `excludeId` skips the
 * bar being moved/resized so it doesn't collide with itself.
 */
export function fitsAt(
  bars: TextBarPlacement[],
  row: TextBarRow,
  startIndex: number,
  widthUnits: number,
  rowLen: number,
  excludeId?: string
): boolean {
  if (startIndex < 0 || startIndex + widthUnits > rowLen) return false;
  for (const b of bars) {
    if (b.row !== row) continue;
    if (excludeId && (b as PlacedTextBar).id === excludeId) continue;
    if (rangesOverlap(startIndex, widthUnits, b.startIndex, b.widthUnits)) return false;
  }
  return true;
}

/**
 * Find a non-overlapping start index for a `widthUnits`-wide bar on `row`.
 * Searches outward from `preferredStart` (clamped into range), returning the
 * nearest free position, or `null` if the row can't fit the bar at all.
 */
export function findFreeStart(
  bars: TextBarPlacement[],
  row: TextBarRow,
  widthUnits: number,
  rowLen: number,
  preferredStart: number,
  excludeId?: string
): number | null {
  if (widthUnits > rowLen) return null;
  const target = clampStartIndex(preferredStart, widthUnits, rowLen);
  const maxStart = rowLen - widthUnits;
  // Expanding ring search from the preferred position → nearest free slot wins.
  for (let delta = 0; delta <= rowLen; delta++) {
    const right = target + delta;
    if (right <= maxStart && fitsAt(bars, row, right, widthUnits, rowLen, excludeId)) {
      return right;
    }
    const left = target - delta;
    if (delta > 0 && left >= 0 && fitsAt(bars, row, left, widthUnits, rowLen, excludeId)) {
      return left;
    }
  }
  return null;
}

/**
 * The widest a bar anchored at `startIndex` on `row` may grow before it hits the
 * next bar to its right (or the row edge). Used to cap auto-fit width so a bar
 * can never grow into a neighbor.
 */
export function maxWidthAt(
  bars: TextBarPlacement[],
  row: TextBarRow,
  startIndex: number,
  rowLen: number,
  excludeId?: string
): number {
  let limit = rowLen; // hard wall: the end of the row
  for (const b of bars) {
    if (b.row !== row) continue;
    if (excludeId && (b as PlacedTextBar).id === excludeId) continue;
    // Only neighbors that start at/after this bar's start can block rightward growth.
    if (b.startIndex >= startIndex && b.startIndex < limit) {
      limit = b.startIndex;
    }
  }
  return Math.max(0, limit - startIndex);
}
