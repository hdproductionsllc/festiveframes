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

/** Printed material OUTSIDE a panel's cell rectangle, in TILES, per side. */
export interface PanelOverhang {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

const NO_OVERHANG: PanelOverhang = { top: 0, right: 0, bottom: 0, left: 0 };

/**
 * How far a panel's PRINTED art reaches beyond the cells it owns.
 *
 * A panel is a rectangle of the lattice, and until the keystone every printed part
 * was exactly that rectangle. The keystone is not: it rises out of the bottom
 * panel, up into the plate opening, off the grid entirely — it is a shape on the
 * bar rather than a run of cells.
 *
 * That made the per-panel export silently wrong. `panelBleedBox` cropped the
 * bottom panel to its one row, so 0.595" of tab (178 px at 300 DPI) was cut clean
 * off and the printed bar came out a plain rectangle. Worse, the edge-clamp bleed
 * then replicated the crop's top row — which runs THROUGH the tab — outward, so
 * the file carried a band of the tab's fill where it should have carried the bar's.
 *
 * The cell rectangle stays the cell rectangle: `panelOf` and the placement engine
 * must keep answering in cells, because that is what they address. This is the
 * separate question of how much material the part is made of.
 */
export function panelOverhangTiles(id: SectionId, config: FrameConfig): PanelOverhang {
  const tab = config.bottomTab;
  if (id !== "bottom" || !tab || tab.riseInches <= 0 || tab.baseInches <= 0) return NO_OVERHANG;
  // Upward only. The tab grows INTO the plate opening, which is why it costs
  // nothing in fitment and why the frame's outer envelope does not move.
  return { ...NO_OVERHANG, top: tab.riseInches / config.tileSizeInches };
}

/**
 * Physical PRINT size of a panel, in inches — the denominator of the resolution
 * gate (see utils/print-resolution). A column is a wing column (tileSizeInches) or
 * an inner column (widthInches / topSlots); every row is one tile tall. On the
 * school frame the two column widths coincide (11.892" / 12 = 0.991" = tile), but
 * summing per-column keeps this correct for any geometry.
 *
 * Includes any overhang, because the gate is asking how big the PART is, and the
 * bottom panel of a keystone frame is taller than the row it sits on.
 */
export function panelSizeInches(id: SectionId, config: FrameConfig): { width: number; height: number } {
  const g = panelGeometry(config);
  const rect = panelRects(config)[id];
  const over = panelOverhangTiles(id, config);
  const innerColWidth = config.topSlots > 0 ? config.widthInches / config.topSlots : config.tileSizeInches;
  let width = 0;
  for (let c = rect.col0; c <= rect.col1; c++) {
    const isWing = c <= g.leftRailCol - 1 || c >= g.rightRailCol + 1; // pure wing columns
    width += isWing ? config.tileSizeInches : innerColWidth;
  }
  width += (over.left + over.right) * config.tileSizeInches;
  const height = (rect.row1 - rect.row0 + 1 + over.top + over.bottom) * config.tileSizeInches;
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
