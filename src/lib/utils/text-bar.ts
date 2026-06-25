import type { BottomBarConfig, FrameConfig, PlacedTextBar, TextBarPlacement, TextBarRow } from "@/lib/types";

/**
 * Number of tile units a row holds (top or bottom rail).
 */
export function rowLength(config: FrameConfig, row: TextBarRow): number {
  return row === "top" ? config.topSlots : config.bottomSlots;
}

// ── Shared text-bar geometry & auto-fit ──────────────────────────────────────
// ONE source of truth for how big the banner text gets, used by the DOM preview
// (BottomTextBar), the print/proof render (drawTextBar) and the auto-width
// measure below. Everything is expressed as a fraction of the bar HEIGHT `h`, so
// the same text in the same bar looks identical at any zoom / resolution.

/** QR square side, as a fraction of bar height. */
export const QR_SIZE_RATIO = 0.82;
/** Gap between the QR and the text edge, as a fraction of bar height. */
export const QR_GAP_RATIO = 0.12;
/** Side padding (each side), as a fraction of bar height. */
export const SIDE_PAD_RATIO = 0.16;
/** Glyph height cap, as a fraction of bar height — breathing room for ascenders/descenders. */
export const HEIGHT_CAP_RATIO = 0.8;

/**
 * Horizontal space available for the text inside a bar of height `h`, after side
 * padding and (when present) the QR + its gap. Mirrors drawTextBar's geometry.
 */
export function textBarAvailWidth(w: number, h: number, qrEnabled: boolean): number {
  const sidePad = h * SIDE_PAD_RATIO + (qrEnabled ? h * QR_SIZE_RATIO + h * QR_GAP_RATIO : 0);
  return w - sidePad * 2;
}

/** Measured glyph height for a given em size (uses real font metrics when available). */
function glyphHeight(ctx: CanvasRenderingContext2D, text: string, fontPx: number): number {
  const m = ctx.measureText(text);
  const asc = m.actualBoundingBoxAscent;
  const desc = m.actualBoundingBoxDescent;
  if (typeof asc === "number" && typeof desc === "number" && asc + desc > 0) return asc + desc;
  return fontPx * 0.9; // fallback ≈ cap height of a 700-weight face
}

/** Width of `text` at `fontPx` including letter-spacing between glyphs. */
function measuredWidth(ctx: CanvasRenderingContext2D, text: string, fontPx: number, letterSpacing: number): number {
  return ctx.measureText(text).width + letterSpacing * Math.max(0, text.length - 1);
}

/**
 * The LARGEST font size (px) such that `text` fits within `availWidth` AND its
 * glyph height stays within `h * HEIGHT_CAP_RATIO`. Grows to fill the bar (short
 * text → big, capped by height) and shrinks for long text (capped by width).
 *
 * `fill` (0–1, the cfg.fontSize slider) scales the result DOWN from the full fit
 * — 1.0 fills the bar, lower shrinks it. The same canvas+font is used everywhere
 * so the preview, the print render and the measure all agree.
 */
export function fitTextBarFont(
  ctx: CanvasRenderingContext2D,
  text: string,
  fontFamily: string,
  letterSpacing: number,
  h: number,
  availWidth: number,
  fill: number,
): number {
  if (availWidth <= 0 || h <= 0) return 0;
  const heightCap = h * HEIGHT_CAP_RATIO * fill;
  const setFont = (px: number) => { ctx.font = `700 ${px}px ${fontFamily}`; };

  // Height-driven ceiling: scale a probe font so its glyph height hits the cap.
  const probe = h;
  setFont(probe);
  const probeGlyph = glyphHeight(ctx, text, probe) || probe * 0.9;
  let fontPx = (heightCap / probeGlyph) * probe;

  // Width clamp: shrink proportionally if the height-driven size overflows width.
  setFont(fontPx);
  const w = measuredWidth(ctx, text, fontPx, letterSpacing);
  if (w > availWidth) fontPx *= availWidth / w;

  return Math.max(1, fontPx);
}

/** Module-scoped measuring canvas so callers don't each allocate one. */
let _measureCtx: CanvasRenderingContext2D | null = null;
function measureCtx(): CanvasRenderingContext2D | null {
  if (_measureCtx) return _measureCtx;
  if (typeof document === "undefined") return null;
  _measureCtx = document.createElement("canvas").getContext("2d");
  return _measureCtx;
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
  const U = 100; // reference px per tile unit (= bar height)
  const fill = cfg.fontSize ?? 1;
  const text = cfg.text || "YOUR TEXT HERE";

  // Size the bar so the AUTO-FIT font (height-driven, before any width clamp)
  // fits without shrinking — i.e. the bar is wide enough that the fitted text
  // is height-limited, not width-limited. This keeps the freshly-placed width in
  // step with what the preview/render will actually draw.
  const ctx = measureCtx();
  let textPx: number;
  let fontPx: number;
  if (ctx) {
    // Height-driven font at this fill (ignoring width — that's what we're sizing for).
    fontPx = fitTextBarFont(ctx, text, cfg.fontFamily, cfg.letterSpacing, U, Number.POSITIVE_INFINITY, fill);
    ctx.font = `700 ${fontPx}px ${cfg.fontFamily}`;
    textPx = ctx.measureText(text).width + cfg.letterSpacing * Math.max(0, text.length - 1);
  } else {
    fontPx = U * HEIGHT_CAP_RATIO * fill;
    textPx = text.length * fontPx * 0.62 + cfg.letterSpacing * Math.max(0, text.length - 1);
  }

  // Side padding + reserved QR (both sides), matching the render geometry.
  const sidePad = U * SIDE_PAD_RATIO + (qrEnabled ? U * QR_SIZE_RATIO + U * QR_GAP_RATIO : 0);
  const totalPx = textPx + sidePad * 2;

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
