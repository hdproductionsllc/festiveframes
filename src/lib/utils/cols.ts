// ─── Column geometry: how wide each column of the lattice is ─────────────────
//
// The twin of rows.ts, and it exists for the same reason one step later.
//
// `rows.ts` was written when the flush fork needed a row that is not a tile tall
// (the 0.75" top bar) and then a side panel on its own row lattice (three equal
// 2.25" badges down a 6.75" column). Both of those are VERTICAL. Every column in
// this product stayed exactly one tile wide, so the width arithmetic was still
// written longhand — `col * tileSize` — in the slot generator, the panel sizes,
// the snappet rects and both banner renderers.
//
// The owner's 15.5" call breaks that in all of them at once: three SQUARE side
// badges 2.25" on a side need a 2.25" column, and the column is a 1.000" rail
// plus a wing that must therefore be 1.25". The wing is the only off-pitch
// column; the rail and the whole inner frame stay on the 1" grid the printed
// part was made on.
//
// So: one module, one answer, no caller needs to know which column is the wide
// one. When the wing is a whole tile wide — every config before this one — every
// function here returns exactly what `col * tileSize` did, so the live frame and
// the July configs are byte-identical.

import type { FrameConfig } from "@/lib/types";

const EPS = 1e-9;

/** Whether this frame has wings at all. */
function hasWings(config: FrameConfig): boolean {
  return Boolean(config.wings) && config.wingColumns > 0;
}

/**
 * Width of ONE wing column, in inches.
 *
 * A wing is `wingColumns` columns filling `wingWidthInches`, so the column is the
 * quotient — 1.000" on every frame built before the 15.5" call, 1.25" on it.
 */
export function wingColWidthInches(config: FrameConfig): number {
  if (!hasWings(config)) return config.tileSizeInches;
  return config.wingWidthInches / config.wingColumns;
}

/**
 * Whether the wing columns are a different width from the tile pitch.
 *
 * The thing worth branching on: false means every column in the lattice is one
 * tile wide and the old arithmetic is exactly right.
 */
export function hasWideWing(config: FrameConfig): boolean {
  return hasWings(config) && Math.abs(wingColWidthInches(config) - config.tileSizeInches) > EPS;
}

/**
 * Width of a column on a SIDE panel, in inches, by its index out from the inner
 * frame — the same indexing the slot generator's wing loops use.
 *
 * On a side lattice the rail column joins the wings in the panel and is index 0,
 * so it keeps the tile pitch; the wing columns beyond it take the wing width.
 * Without a side lattice every index is a wing column.
 */
export function sideColWidthInches(config: FrameConfig, col: number, railShift: number): number {
  const isRail = railShift > 0 && col === 0;
  return isRail ? config.tileSizeInches : wingColWidthInches(config);
}

/**
 * Total width of a side panel, in inches: its wing columns plus, on a side
 * lattice, the rail column that belongs to the same physical part.
 *
 * This is the number Bill cuts — 2.000" before, 2.250" now — and the one the
 * badge on it is square against.
 */
export function sidePanelWidthInches(config: FrameConfig, includesRail: boolean): number {
  // A frame with no wings still has the rail cell the side piece registers on —
  // the July ring is exactly that, and returning 0 for it made the fit bridge
  // report a side piece of zero cells where it had always reported one.
  const wing = hasWings(config) ? config.wingWidthInches : 0;
  return wing + (includesRail ? config.tileSizeInches : 0);
}

/**
 * Width in inches spanned by `cols` grid columns starting at grid column `col0`.
 *
 * The one function a span needs: a 2-wide badge on the left side panel covers the
 * wing column AND the rail column beside it, which are no longer the same width,
 * so `cols * tileSize` is wrong by a quarter inch at 15.5". Columns outside the
 * wings are always the tile pitch.
 */
export function colSpanWidthInches(config: FrameConfig, col0: number, cols: number): number {
  if (!hasWideWing(config)) return cols * config.tileSizeInches;
  let total = 0;
  for (let i = 0; i < cols; i++) total += colWidthInches(config, col0 + i);
  return total;
}

/** Width of grid column `col`, in inches. */
export function colWidthInches(config: FrameConfig, col: number): number {
  if (!hasWideWing(config)) return config.tileSizeInches;
  const wingCols = config.wingColumns;
  const lastCol = wingCols + config.topSlots + wingCols - 1;
  const isWing = col < wingCols || col > lastCol - wingCols;
  return isWing ? wingColWidthInches(config) : config.tileSizeInches;
}

/** Left edge of grid column `col`, in inches from the frame's left edge. */
export function colLeftInches(config: FrameConfig, col: number): number {
  if (!hasWideWing(config)) return col * config.tileSizeInches;
  let x = 0;
  for (let i = 0; i < col; i++) x += colWidthInches(config, i);
  return x;
}

/** Total rendered width, wings included — the frame's outside dimension. */
export function totalWidthInches(config: FrameConfig): number {
  return config.widthInches + (hasWings(config) ? config.wingWidthInches * 2 : 0);
}

/**
 * The frame's PITCH in px, recovered from any one cell's rendered width.
 *
 * The on-screen renderer knows a slot's px width; the print renderer carries the
 * pitch directly as `m.tileSize`. Badge CHROME — corner radius, bevel thickness,
 * art inset — is scaled by the pitch in print, so the screen has to scale by the
 * same thing or the two disagree. It did: once wing columns became 1.25" on a
 * 1.000" pitch, a LEFT side badge's own cell was 1.25" and a RIGHT one's 1.000",
 * so the left column wore 25% fatter brass than the right column AND than the
 * print. One formula, here, so neither renderer can hold a different one.
 *
 * On a frame whose every column is one tile wide this returns `slotWidthPx`
 * unchanged, which is exactly what the screen passed before.
 */
export function pitchPxFromCell(config: FrameConfig, slotWidthPx: number, col: number): number {
  const w = colWidthInches(config, col);
  return w > 0 ? (slotWidthPx / w) * config.tileSizeInches : slotWidthPx;
}
