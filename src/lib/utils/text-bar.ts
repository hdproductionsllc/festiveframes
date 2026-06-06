import type { BottomBarConfig, FrameConfig, TextBarPlacement, TextBarRow } from "@/lib/types";

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
