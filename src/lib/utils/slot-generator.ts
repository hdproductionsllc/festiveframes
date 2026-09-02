import type { FrameConfig, FrameSlot, GridCoord, SectionId, SlotZone } from "@/lib/types";
import { getTotalWidthInches } from "@/lib/constants/frame";
import { panelOf } from "@/lib/utils/panels";
import {
  baseBottomRow as baseBottomRowOf,
  gridRowCount,
  isBannerOnlyRow,
  rowHeightInches,
  rowTopInches,
  topBarHeightInches,
} from "@/lib/utils/rows";

function makeSlotId(zone: SlotZone, index: number): string {
  return `frame:${zone}-${index}`;
}

const WING_ID_PREFIXES = ["frame:wing-left-", "frame:wing-right-"] as const;

/**
 * The flat wing index encoded in a slot id, or null when the id is not a wing slot
 * (or carries no valid index). The inverse of `makeSlotId` for the two wing zones.
 *
 * Callers used to do `parseInt(id.split("-").pop())`, which assumes the id ends in a
 * bare integer — true of today's ids only by luck. Parsing off the KNOWN prefix is
 * the contract, and it can say "not a wing slot" instead of silently returning 0.
 */
export function wingSlotIndex(slotId: string): number | null {
  for (const prefix of WING_ID_PREFIXES) {
    if (!slotId.startsWith(prefix)) continue;
    const rest = slotId.slice(prefix.length);
    if (!/^\d+$/.test(rest)) return null;
    return Number(rest);
  }
  return null;
}

/**
 * Rows in ONE wing column. Banded: an optional top corner (fullWidthTopBar), the
 * side-rail rows, then the bottom row(s).
 *
 * This was previously computed inline in four places, two of which had drifted to
 * `leftSlots + 1` — ignoring both flags and so under-counting the school wing by 2
 * rows (see design-store mirrorTopSlots / setWingColumns). One definition now.
 */
export function wingRowCount(config: FrameConfig): number {
  const extraBottomRows = Math.max(0, (config.bottomRows ?? 1) - 1);
  const topRows = config.fullWidthTopBar ? 1 : 0;
  return topRows + config.leftSlots + 1 + extraBottomRows;
}

/**
 * GRID INVARIANT — the frame is a gapless integer lattice of `tileSizeInches` cells.
 *
 * Holds only when the rail steps equal the tile pitch exactly:
 *   widthInches  === tileSizeInches * topSlots                  (topStep === tileSize)
 *   heightInches === topBarHeight + tileSizeInches * (leftSlots + 1)
 *
 * The second line is `tileSizeInches * (leftSlots + 2)` on every frame whose top bar
 * is a tile tall (all of them until the flush fork): DEFAULT_FRAME_CONFIG
 * (12.883 = .991*13, 6.937 = .991*7) and SCHOOL_FRAME_CONFIG (13.874 = .991*14,
 * 7.928 = .991*8) satisfy it. The flush frame's 6.75 = 0.75 + 1.000 * 6 does too.
 * If a future config does not, the rails render with a cumulative gap and every
 * (row,col) below is a lie — `gridInvariantHolds` is exported so tests can assert it.
 */
export function gridInvariantHolds(config: FrameConfig): boolean {
  const EPS = 1e-6;
  const stack = topBarHeightInches(config) + config.tileSizeInches * (config.leftSlots + 1);
  return (
    Math.abs(config.widthInches - config.tileSizeInches * config.topSlots) < EPS &&
    Math.abs(config.heightInches - stack) < EPS
  );
}

/**
 * Generate all frame slots.
 *
 * The inner frame (top rail, left/right rails, corners) is always positioned
 * using config.widthInches. When wings are active, the container is wider and
 * the inner frame is offset rightward by the wing width. Wing tiles fill the
 * side panels outside the inner frame.
 */
export function generateSlots(
  config: FrameConfig,
  containerWidth: number
): FrameSlot[] {
  const totalWidthInches = getTotalWidthInches(config);
  const scale = containerWidth / totalWidthInches;
  const tileSize = config.tileSizeInches * scale;
  // Flag-gated school geometry — both are no-ops when unset (as on /build): a
  // full-width top rail (fills the wing top corners) and extra bottom rows (the
  // frame grows DOWNWARD by one tile per extra row, base rows stay put).
  const extraBottomRows = Math.max(0, (config.bottomRows ?? 1) - 1);
  const fullWidthTop = config.fullWidthTopBar === true;
  const hasWings = config.wings && config.wingColumns > 0;
  const wingOffset = hasWings ? config.wingWidthInches * scale : 0;
  const innerWidth = config.widthInches * scale;

  // ─── Row geometry, from ONE source ────────────────────────────────────────
  // Every row's top edge and height come from utils/rows, which is also what the
  // panel sizes, the plate area and both banner renderers read. Row 0 is the top
  // bar and may be shorter than a tile (the flush frame's 0.75"); every other row
  // is exactly one tile. These used to be `(i + 1) * leftStep`, with leftStep
  // derived from the frame height — equal to the pitch only under the old
  // invariant, and 0.958" on the flush frame, which would have put every side row
  // in the wrong place.
  const rowY = (row: number): number => rowTopInches(config, row) * scale;
  const rowH = (row: number): number => rowHeightInches(config, row) * scale;

  // ─── Grid coordinates (integers, derived from the loop indices) ──────────
  // Deliberately NOT derived by rounding x/tileSize — the indices are already
  // exact, so rounding px would only add a way to be wrong. See the GRID
  // INVARIANT note above for why these line up with the px math.
  const wingCols = hasWings ? config.wingColumns : 0; // grid cols left of the inner frame
  const baseBottomRow = baseBottomRowOf(config); // side rows occupy 1..leftSlots
  const topRows = fullWidthTop ? 1 : 0;

  /** Map a wing column's banded row index to its grid row. */
  const wingGridRow = (row: number): number => {
    if (row < topRows) return 0;
    const side = row - topRows;
    if (side < config.leftSlots) return side + 1;
    return baseBottomRow + (side - config.leftSlots);
  };

  const slots: FrameSlot[] = [];

  // ─── Top Rail ──────────────────────────────────────────
  // Tiles span inner frame edge-to-edge, offset by wing width
  const topStep = config.topSlots > 1
    ? (config.widthInches - config.tileSizeInches) / (config.topSlots - 1)
    : 0;

  for (let i = 0; i < config.topSlots; i++) {
    slots.push({
      id: makeSlotId("top", i),
      zone: "top",
      index: i,
      x: wingOffset + i * topStep * scale,
      y: 0,
      width: tileSize,
      height: rowH(0),
      row: 0,
      col: wingCols + i,
    });
  }

  // Base bottom row pinned to the BASE ring, so side rails, the base bottom row and
  // the wing bottom never move when extra rows are added below.
  const bottomY = rowY(baseBottomRow);

  // ─── Left / Right Rails ────────────────────────────────
  for (let i = 0; i < config.leftSlots; i++) {
    slots.push({
      id: makeSlotId("left", i),
      zone: "left",
      index: i,
      x: wingOffset, // inner frame left edge
      y: rowY(i + 1),
      width: tileSize,
      height: tileSize,
      row: i + 1,
      col: wingCols,
    });
  }

  // ─── Right Rail ────────────────────────────────────────
  for (let i = 0; i < config.rightSlots; i++) {
    slots.push({
      id: makeSlotId("right", i),
      zone: "right",
      index: i,
      x: wingOffset + innerWidth - tileSize, // inner frame right edge
      y: rowY(i + 1),
      width: tileSize,
      height: tileSize,
      row: i + 1,
      col: wingCols + config.topSlots - 1,
    });
  }

  // ─── Bottom Rail ───────────────────────────────────────
  // A full row of tiles, identical to the top rail (gapless, includes corners).
  const bottomStep = config.bottomSlots > 1
    ? (config.widthInches - config.tileSizeInches) / (config.bottomSlots - 1)
    : 0;

  for (let i = 0; i < config.bottomSlots; i++) {
    slots.push({
      id: makeSlotId("bottom", i),
      zone: "bottom",
      index: i,
      x: wingOffset + i * bottomStep * scale,
      y: bottomY,
      width: tileSize,
      height: tileSize,
      row: baseBottomRow,
      col: wingCols + i,
    });
  }

  // ─── Extra Bottom Rows (flag-gated) ────────────────────
  // Additional full-inner-width bottom rows BELOW the base row. Appended to the
  // "bottom" zone at indices bottomSlots.. so the base indices 0..bottomSlots-1 are
  // untouched. No-op when extraBottomRows === 0 (the /build frame).
  for (let r = 1; r <= extraBottomRows; r++) {
    const y = bottomY + r * tileSize;
    for (let i = 0; i < config.bottomSlots; i++) {
      const index = r * config.bottomSlots + i;
      slots.push({
        id: makeSlotId("bottom", index),
        zone: "bottom",
        index,
        x: wingOffset + i * bottomStep * scale,
        y,
        width: tileSize,
        height: tileSize,
        row: baseBottomRow + r,
        col: wingCols + i,
      });
    }
  }

  // ─── Wing Tiles ────────────────────────────────────────
  // Each wing has wingColumns tile columns × (leftSlots + 1) rows.
  // Rows match the left/right rail Y positions plus one at the bottom row.
  if (hasWings) {
    // Banded wing rows: an optional TOP corner (fullWidthTop), the side rows, then
    // the bottom row(s). With both flags off → topRows=0, so wingRows = leftSlots + 1
    // and every y matches the original literal exactly.
    const wingRows = wingRowCount(config);

    // Wing-left: fills from x=0 rightward, columns closest to inner frame first.
    // A wing cell sits on the same grid row as the rail cell beside it, so its y
    // and height are that row's — including the top corner, which on a flush frame
    // is the 0.75" bar's height and banner-only.
    for (let col = 0; col < config.wingColumns; col++) {
      for (let row = 0; row < wingRows; row++) {
        const flatIndex = col * wingRows + row;
        const gridRow = wingGridRow(row);
        slots.push({
          id: makeSlotId("wing-left", flatIndex),
          zone: "wing-left",
          index: flatIndex,
          x: wingOffset - (col + 1) * tileSize, // col 0 adjacent to inner frame
          y: rowY(gridRow),
          width: tileSize,
          height: rowH(gridRow),
          row: gridRow,
          col: wingCols - 1 - col, // col 0 is adjacent to the frame, so it maps rightmost
        });
      }
    }

    // Wing-right: fills from inner frame right edge outward
    for (let col = 0; col < config.wingColumns; col++) {
      for (let row = 0; row < wingRows; row++) {
        const flatIndex = col * wingRows + row;
        const gridRow = wingGridRow(row);
        slots.push({
          id: makeSlotId("wing-right", flatIndex),
          zone: "wing-right",
          index: flatIndex,
          x: wingOffset + innerWidth + col * tileSize,
          y: rowY(gridRow),
          width: tileSize,
          height: rowH(gridRow),
          row: gridRow,
          col: wingCols + config.topSlots + col,
        });
      }
    }
  }

  return slots;
}

/**
 * Get the number of slots in a given zone.
 */
function getZoneSlotCount(config: FrameConfig, zone: SlotZone): number {
  switch (zone) {
    case "top": return config.topSlots;
    case "bottom": return config.bottomSlots * (config.bottomRows ?? 1);
    case "left": return config.leftSlots;
    case "right": return config.rightSlots;
    case "wing-left":
    case "wing-right": {
      if (config.wingColumns <= 0) return 0;
      return config.wingColumns * wingRowCount(config);
    }
  }
}

/**
 * Get slot IDs for a specific zone.
 */
export function getSlotIdsByZone(
  config: FrameConfig,
  zone: SlotZone
): string[] {
  const count = getZoneSlotCount(config, zone);
  return Array.from({ length: count }, (_, i) => makeSlotId(zone, i));
}

/**
 * Get all slot IDs from a config.
 */
export function getAllSlotIds(config: FrameConfig): string[] {
  return [
    ...getSlotIdsByZone(config, "top"),
    ...getSlotIdsByZone(config, "bottom"),
    ...getSlotIdsByZone(config, "left"),
    ...getSlotIdsByZone(config, "right"),
    ...getSlotIdsByZone(config, "wing-left"),
    ...getSlotIdsByZone(config, "wing-right"),
  ];
}

// ─── Frame Grid ───────────────────────────────────────────────
//
// The unified coordinate space. Zones are six disjoint flat index spaces, so they
// cannot express a footprint spanning a zone boundary — e.g. a 2-wide snappet
// covering the wing column AND the inner rail. Every zone maps into one (row, col)
// lattice here, which is what multi-cell snappets address.
//
// Slot IDs stay the persistence key; this is pure geometry, rebuilt per layout.

export interface FrameGrid {
  rows: number;
  cols: number;
  /** The slot at a coordinate, or null for the plate hole / off-grid. */
  cellAt(row: number, col: number): FrameSlot | null;
  /** The coordinate of a slot id, or null if it isn't in this config. */
  coordOf(slotId: string): GridCoord | null;
  /** Inside the plate cut-out (no slot, and snappets may never cover it). */
  isPlate(row: number, col: number): boolean;
  /** Outside the lattice entirely. Legal for snappet OVERHANG, not for anchors. */
  isOutside(row: number, col: number): boolean;
  /** A real cell on a row that is not a tile tall (a short top bar). Frame body:
   *  no tile may anchor on it or span across it. See `isBannerOnlyRow`. */
  isBannerOnly(row: number, col: number): boolean;
  /** Which PANEL rectangle owns a cell, or null for the plate / off-grid. The
   *  panel is the printable/sellable unit; unlike a SlotZone it owns its corners.
   *  See `panelOf` in utils/panels. */
  panelAt(row: number, col: number): SectionId | null;
  /** Every generated slot, for callers that want to iterate rather than address. */
  slots: FrameSlot[];
}

/**
 * Build the grid for a config. `containerWidth` only scales the px fields carried
 * on each slot; the (row, col) lattice is scale-independent.
 */
export function buildGrid(config: FrameConfig, containerWidth = 1000): FrameGrid {
  const slots = generateSlots(config, containerWidth);

  const wingCols = config.wings && config.wingColumns > 0 ? config.wingColumns : 0;
  const cols = wingCols * 2 + config.topSlots;
  const rows = gridRowCount(config);

  const byCoord = new Map<string, FrameSlot>();
  const byId = new Map<string, GridCoord>();
  for (const s of slots) {
    byCoord.set(`${s.row}:${s.col}`, s);
    byId.set(s.id, { row: s.row, col: s.col });
  }

  const isOutside = (row: number, col: number): boolean =>
    row < 0 || col < 0 || row >= rows || col >= cols;

  // The plate cut-out: the interior of the inner frame, i.e. everything strictly
  // between the side rails and strictly between the top and base bottom rows.
  // Extra bottom rows sit BELOW the plate, so they are never part of it.
  const isPlate = (row: number, col: number): boolean => {
    if (isOutside(row, col)) return false;
    const firstInnerCol = wingCols + 1;
    const lastInnerCol = wingCols + config.topSlots - 2;
    return row >= 1 && row <= config.leftSlots && col >= firstInnerCol && col <= lastInnerCol;
  };

  // A row that is not a tile tall (the flush frame's 0.75" top bar) holds no tile,
  // anywhere along it. The cells still EXIST — they are frame body, and the side
  // parts print their full height — they just refuse every footprint.
  const isBannerOnly = (row: number, col: number): boolean =>
    !isOutside(row, col) && isBannerOnlyRow(config, row);

  return {
    rows,
    cols,
    slots,
    cellAt: (row, col) => byCoord.get(`${row}:${col}`) ?? null,
    coordOf: (slotId) => byId.get(slotId) ?? null,
    isPlate,
    isOutside,
    isBannerOnly,
    panelAt: (row, col) => panelOf(row, col, config),
  };
}
