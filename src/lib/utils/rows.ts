// ─── Row geometry: where each grid row starts and how tall it is ─────────────
//
// Until the flush-top fork every row of every frame was exactly one tile tall, and
// that assumption was written out longhand in six places: the slot generator, the
// panel part sizes, the plate area, the print composer's banner rect, the canvas's
// banner rect and the fit bench. The 0.75" top bar breaks it in all six at once.
//
// This module is the one answer. It imports ONLY types, so slot-generator, panels,
// layout, compose-school-frame and the fit bridge can all read it with no cycle,
// and none of them has to know which row is the short one. When a field is absent
// every function here reproduces the old arithmetic, so a config without
// `topBarHeightInches` renders byte-for-byte as it always did.

import type { FrameConfig } from "@/lib/types";

const EPS = 1e-9;

/** Height of grid row 0, the top bar. A tile tall unless the config says otherwise. */
export function topBarHeightInches(config: FrameConfig): number {
  return config.topBarHeightInches ?? config.tileSizeInches;
}

/** Extra full-width rows below the base bottom row (0 when `bottomRows` is 1/unset). */
export function extraBottomRows(config: FrameConfig): number {
  return Math.max(0, (config.bottomRows ?? 1) - 1);
}

/** The first bottom row: side rows occupy 1..leftSlots, so the base bottom row is next. */
export function baseBottomRow(config: FrameConfig): number {
  return config.leftSlots + 1;
}

/** Rows in the lattice: the top bar, the side rows, the base bottom row, extras. */
export function gridRowCount(config: FrameConfig): number {
  return config.leftSlots + 2 + extraBottomRows(config);
}

/** Height of a row, in inches. Only row 0 can differ from the tile pitch. */
export function rowHeightInches(config: FrameConfig, row: number): number {
  return row === 0 ? topBarHeightInches(config) : config.tileSizeInches;
}

/** Top edge of a row, in inches from the frame's top edge. */
export function rowTopInches(config: FrameConfig, row: number): number {
  if (row <= 0) return 0;
  return topBarHeightInches(config) + (row - 1) * config.tileSizeInches;
}

/**
 * A row no tile may occupy, because it is not a tile tall. A 2x2 anchored on a
 * 0.75" row would be 1.75" tall, which is not a badge; a 1x1 there would be a
 * 1 x 0.75 sliver. The top bar is text-only already (`sectionSupportsTiles`), so
 * this only ever adds a rule on the WINGS, where row 0 used to be a legal anchor.
 */
export function isBannerOnlyRow(config: FrameConfig, row: number): boolean {
  return Math.abs(rowHeightInches(config, row) - config.tileSizeInches) > EPS;
}

/**
 * How far the top bar reaches down over the plate face, in inches. Stated on the
 * config when the frame is registered deliberately (flush top); otherwise the plate
 * is centred in the base ring, which is what every earlier config meant.
 */
export function plateTopCoverInches(config: FrameConfig): number {
  if (config.plateTopCoverInches !== undefined) return config.plateTopCoverInches;
  return topBarHeightInches(config) - (config.heightInches - config.plateHeightInches) / 2;
}

/** The plate's top edge, in inches from the frame's top edge. 0 means FLUSH. */
export function plateTopInches(config: FrameConfig): number {
  return topBarHeightInches(config) - plateTopCoverInches(config);
}

// ─── The SIDE lattice ────────────────────────────────────────────────────────
//
// A frame may put its side panels (wing columns plus the rail column beside them)
// on their own rows: `wingRows` equal rows down the whole frame height. Absent, a
// side cell sits on the inner row it is beside, and these functions answer with
// the inner numbers — so a caller can always ask "side or inner?" and get the
// right row geometry without knowing which kind of frame it holds.

/** Whether the side panels count their own rows (see FrameConfig.wingRows). */
export function hasSideLattice(config: FrameConfig): boolean {
  return (config.wingRows ?? 0) > 0;
}

/** Rows down a side panel: its own count, or the inner grid's. */
export function sideRowCount(config: FrameConfig): number {
  return hasSideLattice(config) ? config.wingRows! : gridRowCount(config);
}

/** The full rendered height, extra bottom rows included. */
function renderHeightInches(config: FrameConfig): number {
  return config.heightInches + extraBottomRows(config) * config.tileSizeInches;
}

/** Height of a row, in inches, on the side lattice (`side`) or the inner one. */
export function rowHeightInchesIn(config: FrameConfig, side: boolean, row: number): number {
  if (side && hasSideLattice(config)) return renderHeightInches(config) / config.wingRows!;
  return rowHeightInches(config, row);
}

/** Top edge of a row, in inches, on the side lattice (`side`) or the inner one. */
export function rowTopInchesIn(config: FrameConfig, side: boolean, row: number): number {
  if (side && hasSideLattice(config)) return row * (renderHeightInches(config) / config.wingRows!);
  return rowTopInches(config, row);
}

/**
 * The rectangle a text banner row occupies, in inches from the frame's top edge.
 * BOTH renderers read this — the print composer's `schoolBannerRect` and the
 * canvas's bar rect were two hand-copies of the same formula, which is the exact
 * drift this product keeps finding the hard way.
 */
export function bannerRowBox(config: FrameConfig, row: "top" | "bottom"): { y: number; h: number } {
  if (row === "top") return { y: 0, h: topBarHeightInches(config) };
  return { y: rowTopInches(config, baseBottomRow(config)), h: config.tileSizeInches };
}
