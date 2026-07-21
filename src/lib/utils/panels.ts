// ─── Panels ──────────────────────────────────────────────────────────────────
//
// The sellable unit is a FRAME + a set of 4 PANELS. A repeat customer buys a fresh
// 4-panel set, so a PANEL is a first-class concept, not a rendering detail:
//   TOP + BOTTOM = banners  (inner columns only)
//   LEFT + RIGHT = fields   (photos, mascots, multi-cell snappets; own the corners)
//
// A panel is a RECTANGLE of the unified grid — NOT a SlotZone. The two disagree at
// the corners: the top ZONE is the whole top row incl. the two corner cells, but
// the top PANEL is the inner cells only; the corner cells belong to the LEFT/RIGHT
// panels, which own their full vertical extent. `panelOf` encodes that ownership,
// and it is what makes "set the LEFT panel to an image" fill the WHOLE left panel
// (all 16 cells) instead of just the one wing column the old zone mapping covered.
//
// Everything here is DERIVED from the SAME config quantities `buildGrid` uses (see
// slot-generator), so a geometry change moves the panels with the grid. This module
// imports ONLY types, so it stays a leaf that both slot-generator and sections can
// depend on without a cycle.

import type { FrameConfig, SectionId } from "@/lib/types";

/** A panel as an inclusive grid rectangle. */
export interface PanelRect {
  col0: number;
  col1: number;
  row0: number;
  row1: number;
}

/**
 * The geometric split points of the frame, from the identical formulas
 * `buildGrid` uses. `leftRailCol`/`rightRailCol` are the inner rail columns — the
 * CORNER columns the side panels own — so:
 *   LEFT  panel = cols 0 .. leftRailCol            (wing columns + left rail)
 *   RIGHT panel = cols rightRailCol .. cols-1      (right rail + wing columns)
 *   TOP    panel = inner cols, row 0
 *   BOTTOM panel = inner cols, rows baseBottomRow .. rows-1
 */
function panelGeometry(config: FrameConfig) {
  const wingCols = config.wings && config.wingColumns > 0 ? config.wingColumns : 0;
  const cols = wingCols * 2 + config.topSlots;
  const extraBottomRows = Math.max(0, (config.bottomRows ?? 1) - 1);
  const rows = config.leftSlots + 2 + extraBottomRows;
  return {
    rows,
    cols,
    leftRailCol: wingCols, // LEFT panel owns cols 0..leftRailCol
    rightRailCol: wingCols + config.topSlots - 1, // RIGHT panel owns rightRailCol..cols-1
    baseBottomRow: config.leftSlots + 1, // first bottom row (below the plate)
  };
}

/**
 * Which PANEL owns the cell at (row, col), or null for the plate hole / off-grid.
 *
 * The side panels WIN the corners: a cell in the left rail column (or a wing
 * column) is LEFT, even on the top or bottom row — so a corner is a side-panel
 * cell, never a top/bottom-banner cell. An inner column is TOP on row 0, BOTTOM on
 * the bottom rows, and the plate (null) in between.
 */
export function panelOf(row: number, col: number, config: FrameConfig): SectionId | null {
  const g = panelGeometry(config);
  if (row < 0 || col < 0 || row >= g.rows || col >= g.cols) return null;
  if (col <= g.leftRailCol) return "wing-left";
  if (col >= g.rightRailCol) return "wing-right";
  // Inner column: a banner row, or the plate hole between them.
  if (row === 0) return "top";
  if (row >= g.baseBottomRow) return "bottom";
  return null;
}

/**
 * Physical PRINT size of a panel, in inches — the denominator of the resolution
 * gate (see utils/print-resolution). A column is a wing column (tileSizeInches) or
 * an inner column (widthInches / topSlots); every row is one tile tall. On the
 * school frame the two column widths coincide (11.892" / 12 = 0.991" = tile), but
 * summing per-column keeps this correct for any geometry.
 */
export function panelSizeInches(id: SectionId, config: FrameConfig): { width: number; height: number } {
  const g = panelGeometry(config);
  const rect = panelRects(config)[id];
  const innerColWidth = config.topSlots > 0 ? config.widthInches / config.topSlots : config.tileSizeInches;
  let width = 0;
  for (let c = rect.col0; c <= rect.col1; c++) {
    const isWing = c <= g.leftRailCol - 1 || c >= g.rightRailCol + 1; // pure wing columns
    width += isWing ? config.tileSizeInches : innerColWidth;
  }
  const height = (rect.row1 - rect.row0 + 1) * config.tileSizeInches;
  return { width, height };
}

/**
 * The four panels as grid rectangles. An exact partition of the ring: the areas
 * sum to the ring's cell count with no gaps or overlaps (asserted in the tests).
 */
export function panelRects(config: FrameConfig): Record<SectionId, PanelRect> {
  const g = panelGeometry(config);
  const firstInner = g.leftRailCol + 1;
  const lastInner = g.rightRailCol - 1;
  return {
    "wing-left": { col0: 0, col1: g.leftRailCol, row0: 0, row1: g.rows - 1 },
    "wing-right": { col0: g.rightRailCol, col1: g.cols - 1, row0: 0, row1: g.rows - 1 },
    top: { col0: firstInner, col1: lastInner, row0: 0, row1: 0 },
    bottom: { col0: firstInner, col1: lastInner, row0: g.baseBottomRow, row1: g.rows - 1 },
  };
}
