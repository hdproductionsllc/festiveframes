// ─── Print resolution gate ───────────────────────────────────────────────────
//
// A customer-uploaded photo/mascot fills a school panel and is UV-PRINTED at that
// panel's physical size. Whether it prints crisply depends on ONE thing: how many
// SOURCE pixels land inside the cropped region, divided by the physical inches that
// region prints at — the effective DPI. This module is the single source of truth
// for that verdict, so the live meter in the crop modal and any later export gate
// read the exact same numbers.
//
// WHY DPI and not a flat pixel count. The older single-tile plan
// (tasks/CUSTOM_TILE_UPLOAD_PLAN.md §2) quoted "≥500 px / 300–500 / <300" — but
// those numbers are just 300/240/200 DPI multiplied by that plan's fixed 1.375"
// tile. A school panel is not 1.375": the LEFT panel is ~2" × 8", the top bar ~1"
// tall. A flat pixel threshold would call a 480 px crop "red" on a tiny bar (where
// it's a fine 480 DPI) and "green" on a tall panel (where it's a soft 60 DPI). The
// physical size drives everything, so the gate is DPI, matching this project's own
// print spec: 300 DPI target, ~240 floor, 200 DPI hard block.
//
// Pure + framework-free so it unit-tests without a DOM.

/** DPI at or above which a print is crisp. */
export const TARGET_DPI = 300;
/** DPI below which we BLOCK the upload — prints visibly soft/pixelated. */
export const BLOCK_DPI = 200;

export type ResolutionLevel = "green" | "amber" | "red";

export interface ResolutionVerdict {
  /** Effective print resolution of the cropped region, at its LIMITING axis. */
  dpi: number;
  /** The smaller cropped source dimension in pixels (the "px/side" the UX shows). */
  minSidePx: number;
  level: ResolutionLevel;
  /** True when `level === "red"` — the confirm button must stay disabled. */
  blocked: boolean;
}

/**
 * Grade a crop for print. `cropPx` is the cropped region measured in SOURCE pixels
 * (never on-screen pixels — that is the load-bearing detail: zooming in shrinks the
 * source pixels behind the same viewport, which is exactly what must lower the DPI).
 * `targetInches` is the physical size that region prints at.
 *
 * DPI is taken at the LIMITING axis (the min of the two) so a crop can't look sharp
 * on its long edge while the short edge prints soft.
 */
export function evaluateResolution(
  cropPx: { width: number; height: number },
  targetInches: { width: number; height: number },
): ResolutionVerdict {
  const wDpi = targetInches.width > 0 ? cropPx.width / targetInches.width : 0;
  const hDpi = targetInches.height > 0 ? cropPx.height / targetInches.height : 0;
  const dpi = Math.min(wDpi, hDpi);
  const minSidePx = Math.min(cropPx.width, cropPx.height);
  const level: ResolutionLevel = dpi >= TARGET_DPI ? "green" : dpi >= BLOCK_DPI ? "amber" : "red";
  return { dpi, minSidePx, level, blocked: level === "red" };
}

/** Human copy for each verdict — one place so the meter and any tooltip agree. */
export const RESOLUTION_COPY: Record<ResolutionLevel, { title: string; detail: string }> = {
  green: { title: "Great for print", detail: "This crop is sharp at full size." },
  amber: {
    title: "Usable, may look soft",
    detail: "It will print, but a higher-resolution photo (or a wider crop) looks sharper.",
  },
  red: {
    title: "Too low to print",
    detail: "Zoom out, re-crop wider, or upload a higher-resolution photo.",
  },
};
