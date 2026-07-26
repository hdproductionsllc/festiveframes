// ─── Multi-cell snappets ─────────────────────────────────────────────────────
//
// A snappet is a tile that occupies MORE than one grid cell (2x2, 2x4, 11x2 …).
// It is stored the way the text bar is stored: ONE record at ONE anchor key plus
// a size, expanded to its covered cells on demand. See `TextBarPlacement` /
// `coveredSlotIds` in text-bar.ts — the proven precedent in this codebase.
//
//   text bar : { row, startIndex, widthUnits }  → coveredSlotIds(bars)
//   snappet  : slots[anchorSlotId].span         → coveredBySnappets(slots, grid)
//
// Why an anchor + span rather than writing the tile into every covered slot id:
// the covered cells are DERIVED. Persisting them would let the two representations
// disagree after a config change (the frame's geometry is not persisted — see the
// note on FrameSlot.row/col), and a partially-deleted footprint would be an
// unrepresentable-but-storable state. Anchor + span cannot desync.
//
// `span` is OPTIONAL on PlacedTile: absent means 1x1. Every function here returns
// exactly today's answer for a design in which no tile carries a span, which is
// what keeps /build unchanged by construction.

import type {
  FrameSlot,
  GridCoord,
  PlacedTile,
  SectionId,
  SectionState,
  TilePiece,
  TileSpan,
} from "@/lib/types";
import type { FrameGrid } from "@/lib/utils/slot-generator";
import { panelSuppressed } from "@/lib/utils/sections";

const ONE_BY_ONE: TileSpan = { cols: 1, rows: 1 };

// The reserved piece identity for UPLOADED customer art. A snappet carrying an
// `image` renders that image, but it still needs a pieceId/setId so every existing
// path that keys on them (the tile tally, drag data, collision) resolves without a
// null-check. `getPiece("upload")` is intentionally undefined — the `image` field,
// not the piece, is what draws — so the tally simply counts it as its own part.
export const UPLOAD_PIECE_ID = "upload";
export const UPLOAD_SET_ID = "upload";

/** The footprint of a placed tile. Absent/invalid span = 1x1 (the default tile). */
export function tileSpan(tile: Pick<PlacedTile, "span"> | null | undefined): TileSpan {
  const span = tile?.span;
  if (!span) return ONE_BY_ONE;
  const cols = Math.max(1, Math.floor(span.cols));
  const rows = Math.max(1, Math.floor(span.rows));
  return { cols, rows };
}

/** True when a span covers more than the anchor cell. The 1x1 fast-path predicate. */
export function isMultiCell(span: TileSpan): boolean {
  return span.cols > 1 || span.rows > 1;
}

/** True when ANY tile in the design is a multi-cell snappet. Lets 1x1-only designs
 *  (every design on /build) skip the expansion work entirely. */
export function hasAnySpan(slots: Record<string, PlacedTile>): boolean {
  for (const tile of Object.values(slots)) {
    if (isMultiCell(tileSpan(tile))) return true;
  }
  return false;
}

/**
 * The grid coordinates a footprint occupies, anchored at its TOP-LEFT cell and
 * growing right/down. Always returns the anchor first, and exactly one coord for
 * a 1x1. Coords may fall outside the grid — that is legal overhang, and it is the
 * CALLER's job (canPlace / coveredBySnappets) to decide what that means.
 */
export function occupiedCoords(anchor: GridCoord, span: TileSpan): GridCoord[] {
  const { cols, rows } = span;
  const coords: GridCoord[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      coords.push({ row: anchor.row + r, col: anchor.col + c });
    }
  }
  return coords;
}

/**
 * Map every slot id HIDDEN UNDER a snappet to the anchor slot id covering it.
 * The anchor's own id is NOT a key — it holds the tile, it isn't covered by it.
 *
 * Only cells that EXIST are emitted: a footprint hanging past the outer edge has
 * coords with no slot, and there is no id to block. Empty map for an all-1x1
 * design, which is why every consumer of it is inert on /build.
 */
export function coveredBySnappets(
  slots: Record<string, PlacedTile>,
  grid: FrameGrid,
): Map<string, string> {
  const covered = new Map<string, string>();
  for (const [anchorId, tile] of Object.entries(slots)) {
    const span = tileSpan(tile);
    if (!isMultiCell(span)) continue;
    const anchor = grid.coordOf(anchorId);
    if (!anchor) continue; // stale id from another config — nothing to cover
    for (const coord of occupiedCoords(anchor, span)) {
      const cell = grid.cellAt(coord.row, coord.col);
      if (!cell || cell.id === anchorId) continue; // overhang, plate hole, or self
      covered.set(cell.id, anchorId);
    }
  }
  return covered;
}

/**
 * The tiles that will actually RENDER, given the current section modes.
 *
 * A tile whose ANCHOR cell sits in a section switched to text/image is hidden by
 * that section's overlay — so it must not be treated as covering anything either.
 * Feeding this (rather than the raw design) to `coveredBySnappets` keeps the two
 * views of one snappet in agreement: a snappet that paints nothing blanks nothing.
 * Deriving `covered` from all slots while drawing anchors from the visible ones
 * left dead, chrome-less, unclickable cells wherever a hidden snappet's footprint
 * reached into a zone that was still in tiles mode.
 *
 * Note this HIDES rather than deletes, matching how suppression already works for
 * ordinary 1x1 tiles: switching a section to text and back restores its tiles
 * untouched, so a snappet must survive the same round trip.
 *
 * Nothing is filtered when `sections` is empty, so /build gets the raw design back.
 */
export function visibleAnchorSlots(
  slots: Record<string, PlacedTile>,
  grid: FrameGrid,
  sections: Partial<Record<SectionId, SectionState>>,
): Record<string, PlacedTile> {
  const visible: Record<string, PlacedTile> = {};
  for (const [id, tile] of Object.entries(slots)) {
    const coord = grid.coordOf(id);
    const cell = coord ? grid.cellAt(coord.row, coord.col) : null;
    // Suppression is by PANEL, not by zone: an anchor in a corner cell is hidden by
    // its SIDE panel. `grid.panelAt` owns that mapping, so no config is threaded here.
    if (cell && panelSuppressed(grid.panelAt(cell.row, cell.col), sections)) continue;
    visible[id] = tile;
  }
  return visible;
}

/**
 * The pixel rect a snappet draws into: its anchor slot's origin, sized by the
 * span. The analogue of FrameCanvas's `barRect` — the grid is gapless (see the
 * GRID INVARIANT in slot-generator), so N cells is exactly N * tileSize with no
 * accumulated step error. A 1x1 returns the anchor slot's own rect.
 */
export function snappetRect(
  anchor: Pick<FrameSlot, "x" | "y">,
  span: TileSpan,
  tileSize: number,
): { x: number; y: number; width: number; height: number } {
  return {
    x: anchor.x,
    y: anchor.y,
    width: span.cols * tileSize,
    height: span.rows * tileSize,
  };
}

export type PlacementRejection = "plate" | "suppressed" | "offgrid" | "bar" | "panel";

export interface PlacementResult {
  ok: boolean;
  reason?: PlacementRejection;
  /** Anchor slot ids this placement would REPLACE. Overlap is legal (it evicts,
   *  matching moveTile's "dropping on an occupied cell replaces it" contract), so
   *  this is an outcome, not a rejection. Empty when nothing is displaced. */
  evicts: string[];
}

/**
 * Everything a placement decision depends on, in ONE value.
 *
 * This is a parameter object rather than four positional arguments for a reason:
 * a rule input that a caller can forget to pass is a rule that will silently stop
 * being enforced. `barCovered` was exactly that bug — canPlace had no notion of
 * text bars, so a multi-cell footprint could be seated underneath a banner while
 * every 1x1 path correctly refused. Making the field REQUIRED here means the
 * compiler, not a reviewer, is what keeps the gate complete.
 */
export interface PlacementContext {
  grid: FrameGrid;
  /** The design's tiles, keyed by ANCHOR id. Spans are expanded internally. */
  slots: Record<string, PlacedTile>;
  sections: Partial<Record<SectionId, SectionState>>;
  /**
   * Slot ids hidden under a text bar (`coveredSlotIds(textBars)`). A bar REPLACES
   * the tiles it covers — there are no hidden layers — so no footprint may reach
   * into one. Pass an empty set for a design with no bars.
   */
  barCovered: ReadonlySet<string>;
}

/**
 * May a footprint of `span` sit at `anchor`?
 *
 * The rules (locked with the product owner):
 *   - the ANCHOR must be a real cell            → else `offgrid`
 *   - covered coords OUTSIDE the grid are FINE  → legal overhang past the outer edge
 *   - covered coords in the PLATE hole are not  → `plate` (never cover the plate)
 *   - every covered coord must lie in the SAME PANEL as the anchor → else `panel`
 *     (a panel is the printable unit; a footprint may not straddle two of them.
 *      This subsumes the side-panel 2-column width cap, yet still allows the legal
 *      2-wide that spans a wing column + its inner rail — both are the LEFT panel.)
 *   - covered coords in a section-suppressed PANEL are not → `suppressed`
 *     (that panel is one direct-print piece right now, not tiles — see sections.ts)
 *   - covered coords hidden under a TEXT BAR are not → `bar`
 *   - OVERLAP with another tile is allowed and EVICTS it (reported in `evicts`)
 *
 * `excludeId` is the tile being moved, so it never collides with itself.
 */
export function canPlace(
  ctx: PlacementContext,
  anchor: GridCoord,
  span: TileSpan,
  excludeId?: string,
): PlacementResult {
  const { grid, slots, sections, barCovered } = ctx;
  const anchorCell = grid.cellAt(anchor.row, anchor.col);
  if (!anchorCell) return { ok: false, reason: "offgrid", evicts: [] };
  // The panel the anchor sits in. A real cell always belongs to exactly one panel
  // (the plate has no cell, so it never anchors), and the whole footprint is
  // confined to it.
  const anchorPanel = grid.panelAt(anchor.row, anchor.col);

  const coords = occupiedCoords(anchor, span);

  for (const coord of coords) {
    if (grid.isPlate(coord.row, coord.col)) {
      return { ok: false, reason: "plate", evicts: [] };
    }
    const cell = grid.cellAt(coord.row, coord.col);
    if (!cell) continue; // overhang — no cell, nothing to violate
    if (grid.panelAt(coord.row, coord.col) !== anchorPanel) {
      return { ok: false, reason: "panel", evicts: [] };
    }
    if (panelSuppressed(anchorPanel, sections)) {
      return { ok: false, reason: "suppressed", evicts: [] };
    }
    if (barCovered.has(cell.id)) {
      return { ok: false, reason: "bar", evicts: [] };
    }
  }

  // Anything already occupying one of these cells gets displaced. Test the OTHER
  // tiles' footprints against ours so a big snappet two cells away is caught too.
  const wanted = new Set(coords.map((c) => `${c.row}:${c.col}`));
  const evicts: string[] = [];
  for (const [id, tile] of Object.entries(slots)) {
    if (id === excludeId) continue;
    const other = grid.coordOf(id);
    if (!other) continue;
    const hit = occupiedCoords(other, tileSpan(tile)).some((c) =>
      wanted.has(`${c.row}:${c.col}`),
    );
    if (hit) evicts.push(id);
  }

  return { ok: true, evicts };
}

// ─── Dragging a footprint ────────────────────────────────────────────────────
//
// Everything above answers "may this footprint sit HERE". This section answers
// the drag-time question: given the ONE cell dnd-kit reports under the pointer,
// where does the footprint actually land, and is that landing legal?
//
// The single-cell input is deliberate. Every droppable on the frame is 1x1 and
// must stay 1x1: DndProvider derives its "dragged off the frame → remove" margin
// from the winning droppable's size (`bestTile * 0.75`), so an anchor droppable
// sized to an 11x2 span would inflate that margin to most of the frame and you
// could never drag a tile off to delete it. The footprint is therefore RESOLVED
// here, from a slot id — exactly the way a text bar resolves a whole run from the
// one column the pointer is over.

/**
 * Which cell OF THE FOOTPRINT the pointer went down on, as an offset from the
 * footprint's top-left anchor. Grabbing an 11x2 banner by its right end must not
 * teleport it 10 cells to the left on the first pointer move, so the drop resolver
 * subtracts this from the hovered cell to recover the anchor.
 *
 * {dr: 0, dc: 0} for a palette drag: a brand-new tile has no grabbed cell, so the
 * hovered cell IS its top-left — the convention the whole resolver is written to.
 */
export interface GrabOffset {
  dr: number;
  dc: number;
}

export const NO_GRAB: GrabOffset = { dr: 0, dc: 0 };

/**
 * The grabbed cell of a footprint, from a pointer position and the footprint's
 * on-screen rect. Split out of the component so it is testable without a DOM: it
 * is pure arithmetic on the rect, and it CLAMPS into the footprint so a pointer
 * on the rect's outer edge (or a rounding overshoot) can never name a cell the
 * footprint does not contain.
 */
export function grabOffsetIn(
  rect: { left: number; top: number; width: number; height: number },
  point: { x: number; y: number },
  span: TileSpan,
): GrabOffset {
  const clamp = (v: number, max: number) => Math.min(Math.max(0, v), max);
  const cellW = rect.width / span.cols;
  const cellH = rect.height / span.rows;
  return {
    dr: cellH > 0 ? clamp(Math.floor((point.y - rect.top) / cellH), span.rows - 1) : 0,
    dc: cellW > 0 ? clamp(Math.floor((point.x - rect.left) / cellW), span.cols - 1) : 0,
  };
}

/**
 * Where a dragged footprint will land, and whether it may.
 *
 * `anchorSlotId` is ALWAYS a real slot id, so a caller can position the preview
 * from the same slot rect the placed tile will use — including on a rejection,
 * where the preview has to be drawn somewhere in order to read as "not here".
 */
export interface SnappetPreview {
  anchorSlotId: string;
  anchorRow: number;
  anchorCol: number;
  cols: number;
  rows: number;
  valid: boolean;
  /** Why it was rejected. Undefined when `valid`. */
  reason?: PlacementRejection;
  /** Anchors this drop would displace (see PlacementResult.evicts). */
  evicts: string[];
}

export interface SnappetDropRequest {
  /** The 1x1 droppable under the pointer — dnd-kit's `over.id`. */
  overSlotId: string;
  span: TileSpan;
  /** Which cell of the footprint the pointer holds. Omit for a palette drag. */
  grab?: GrabOffset;
  /** The tile being MOVED, so it never collides with its own current footprint. */
  excludeId?: string;
  /**
   * Treat `span` as a PREFERENCE rather than a requirement: if nothing that big is
   * seatable here, fall back through progressively smaller footprints (see
   * `spanLadder`) and place the largest that fits.
   *
   * Set for a PALETTE drag, where the span came from the piece's `defaultSpan` and
   * the user never chose it — a 2x2 dragged at a one-row banner should land 2x1
   * rather than refuse. NOT set when MOVING a placed snappet: there the size is the
   * user's own decision and moving it must never silently shrink it.
   */
  shrinkToFit?: boolean;
  /**
   * Size the footprint to the PANEL rather than to the piece's declared span, which
   * is then read only as an ASPECT hint (a 2x2 means "square art", not "two cells").
   *
   * This is what makes a wider wing produce a bigger tile: square art in a 2-wide
   * side panel wants 2x2, but the same art in a 3-wide panel wants 3x3. Delegates to
   * `suggestSnappetSize` — the same routine the photo-upload path uses via
   * `panelSnappetPlacement` — so a dragged tile and an uploaded photo of the same
   * shape land at the same size in the same panel.
   *
   * Requires `shrinkToFit`, which walks the result down when the panel is occupied.
   */
  growToPanel?: boolean;
  /**
   * Floor for `shrinkToFit`. A badge shrunk to 1x1 is unreadable, so art pieces pass
   * MIN_ART_SPAN here and the ladder never proposes anything smaller (see
   * `minSpanFor`). Absent = 1x1, i.e. the old behaviour.
   */
  minSpan?: TileSpan;
}

/**
 * The full extent (cols x rows) of the panel containing `coord`, ignoring occupancy.
 *
 * Occupancy is deliberately NOT considered: this answers "how big could art be in
 * this panel", and `spanLadder` + `canPlace` then walk that down to what is actually
 * seatable. Null when the coord isn't in a panel.
 */
function panelExtent(
  grid: PlacementContext["grid"],
  coord: GridCoord,
): { cols: number; rows: number } | null {
  const panelId = grid.panelAt(coord.row, coord.col);
  if (!panelId) return null;
  const inPanel = grid.slots.filter((s) => grid.panelAt(s.row, s.col) === panelId);
  if (inPanel.length === 0) return null;
  const cols = Math.max(...inPanel.map((s) => s.col)) - Math.min(...inPanel.map((s) => s.col)) + 1;
  const rows = Math.max(...inPanel.map((s) => s.row)) - Math.min(...inPanel.map((s) => s.row)) + 1;
  return { cols, rows };
}

/**
 * A preferred footprint and every smaller one it may fall back to, largest first.
 *
 * Ordered by area descending so the first seatable candidate is always the biggest
 * available; ties (2x1 vs 1x2) break wider-first, which suits this frame because its
 * tight panels are the one-row top/bottom banners, where keeping width is what
 * preserves the art. Always ends at 1x1, so a ladder is never empty.
 */
export const MIN_ART_SPAN: TileSpan = { cols: 2, rows: 2 };

/**
 * The smallest footprint a piece may be reduced to.
 *
 * Real artwork - especially the lockups with text - is unreadable at a single
 * 0.991in cell, so a badge floors at 2x2. Two kinds of piece are exempt: a plain
 * 1x1 (a solid colour block has no detail to lose) and a `spanRequired` calibration
 * tile, whose whole point is one exact non-square footprint.
 */
export function minSpanFor(
  piece: Pick<TilePiece, "defaultSpan" | "spanRequired"> | null | undefined,
  /**
   * The BUILDER's floor, under every piece it places.
   *
   * This is the half that was missing. A floor keyed off `defaultSpan` only ever
   * lifted Becky's artwork, because nothing else carries that field — so solids,
   * icons and uploaded photos all still landed at 1x1 no matter what the builder
   * wanted. How small a badge may be is a property of the PRODUCT, not of the piece:
   * the school frame's cell is 0.991in and nothing reads at that size, whatever is
   * printed on it. `/build` passes nothing and keeps a 1x1 floor, which is its whole
   * product.
   */
  floor: TileSpan = { cols: 1, rows: 1 },
): TileSpan {
  // A calibration tile's footprint is exact — its whole purpose is one specific
  // non-square size, so no floor may push it around.
  if (piece?.spanRequired) return { cols: 1, rows: 1 };
  const own = piece?.defaultSpan ? MIN_ART_SPAN : { cols: 1, rows: 1 };
  return {
    cols: Math.max(own.cols, floor.cols),
    rows: Math.max(own.rows, floor.rows),
  };
}

export function spanLadder(span: TileSpan, min: TileSpan = { cols: 1, rows: 1 }): TileSpan[] {
  const { cols, rows } = tileSpan({ span });
  const lo = tileSpan({ span: min });
  const out: TileSpan[] = [];
  for (let c = lo.cols; c <= cols; c++)
    for (let r = lo.rows; r <= rows; r++) out.push({ cols: c, rows: r });
  // A min bigger than the preference would leave the ladder empty; fall back to the
  // floor itself so a drop always has something to try.
  if (out.length === 0) out.push(lo);
  return out.sort((a, b) => b.cols * b.rows - a.cols * a.rows || b.cols - a.cols);
}

/**
 * Candidate anchors, nearest first: the desired anchor, then anchors nudged BACK
 * (up and/or left) by at most one footprint.
 *
 * This is `clampStartIndex` generalized to two dimensions. A banner whose run
 * would overshoot the row is pulled back until it fits rather than refused; a
 * footprint that would cross the plate or reach into a blocked cell is pulled
 * back the same way — e.g. a 2x2 grabbed onto the left rail slides one column
 * into the wing instead of biting into the plate. The nudge is bounded by the
 * footprint's own size so a drop can never travel more than the thing you are
 * holding, which keeps the preview readable while you drag.
 *
 * Ordered by total displacement (then by row), so the least surprising nudge
 * wins and the result is deterministic.
 */
function* nudgeCandidates(start: GridCoord, span: TileSpan): Generator<GridCoord> {
  const maxR = span.rows - 1;
  const maxC = span.cols - 1;
  for (let d = 0; d <= maxR + maxC; d++) {
    for (let r = Math.max(0, d - maxC); r <= Math.min(d, maxR); r++) {
      const row = start.row - r;
      const col = start.col - (d - r);
      if (row < 0 || col < 0) continue;
      yield { row, col };
    }
  }
}

/**
 * Resolve a drag over ONE cell into the footprint it will actually place.
 *
 * Anchor convention: the hovered cell is the footprint's TOP-LEFT, shifted back
 * by the grab offset when an existing snappet is being carried. That anchor is
 * then clamped into the lattice and nudged back until it fits (see
 * `nudgeCandidates`). Overhang past the OUTER edge stays legal — only the anchor
 * itself is required to be on the grid, which is what makes a footprint able to
 * hang off the frame while still being addressable by a slot id.
 *
 * Returns null when the hovered id isn't a cell of this frame (the caller then
 * shows no preview at all, and a drop there means "off the frame").
 */
export function resolveSnappetDrop(
  ctx: PlacementContext,
  req: SnappetDropRequest,
): SnappetPreview | null {
  const { grid } = ctx;
  const over = grid.coordOf(req.overSlotId);
  if (!over) return null;

  const span = tileSpan({ span: req.span });
  const grab = req.grab ?? NO_GRAB;
  // A grab offset from a stale render must not be able to name a cell outside the
  // footprint — that would translate the drop by an arbitrary amount.
  const dr = Math.min(Math.max(0, Math.floor(grab.dr)), span.rows - 1);
  const dc = Math.min(Math.max(0, Math.floor(grab.dc)), span.cols - 1);

  const start: GridCoord = {
    row: Math.min(Math.max(0, over.row - dr), grid.rows - 1),
    col: Math.min(Math.max(0, over.col - dc), grid.cols - 1),
  };

  const at = (
    coord: GridCoord,
    size: TileSpan,
    result: PlacementResult,
  ): SnappetPreview | null => {
    const cell = grid.cellAt(coord.row, coord.col);
    if (!cell) return null;
    return {
      anchorSlotId: cell.id,
      anchorRow: coord.row,
      anchorCol: coord.col,
      cols: size.cols,
      rows: size.rows,
      valid: result.ok,
      reason: result.ok ? undefined : result.reason,
      evicts: result.evicts,
    };
  };

  // The footprint this drag WANTS. With growToPanel the declared span is only an
  // aspect hint and the panel decides the size (square art: 2x2 in a 2-wide wing,
  // 3x3 in a 3-wide one, 1x1 in a one-row banner, where a wider box would add
  // background without making the art any bigger). Otherwise it is the span itself.
  const ext = req.growToPanel ? panelExtent(grid, start) : null;
  const grown = ext ? suggestSnappetSize(span.cols / span.rows, ext) : span;
  // The panel may suggest something below the floor (a one-row banner suggests 1x1
  // for square art). Clamp UP so a badge is never proposed at an unreadable size.
  const floor = tileSpan({ span: req.minSpan ?? { cols: 1, rows: 1 } });
  const preferred: TileSpan = {
    cols: Math.max(grown.cols, floor.cols),
    rows: Math.max(grown.rows, floor.rows),
  };

  // Sizes to try, biggest first. Without shrinkToFit that is just the requested
  // span, so a MOVE behaves exactly as before.
  const sizes = req.shrinkToFit ? spanLadder(preferred, floor) : [span];

  // First legal (size, anchor) wins. Otherwise remember the first candidate that is
  // a real cell: a rejection still has to be DRAWN somewhere, and drawing it on a
  // plate hole (which has no slot) is not an option. The remembered rejection comes
  // from the PREFERRED size, so a refusal reads as "this is what you asked for, and
  // no" rather than showing a shrunken ghost that was never wanted.
  let rejected: SnappetPreview | null = null;
  for (const size of sizes) {
    for (const cand of nudgeCandidates(start, size)) {
      const verdict = canPlace(ctx, cand, size, req.excludeId);
      if (verdict.ok) return at(cand, size, verdict);
      rejected ??= at(cand, size, verdict);
    }
  }
  // Every candidate was blocked AND none of them was a drawable cell — fall back
  // to the cell the pointer is genuinely over, which is a real slot by definition.
  return rejected ?? at(over, preferred, canPlace(ctx, over, preferred, req.excludeId));
}

/**
 * Resolve a RESIZE gesture into the footprint it would commit, and whether it may.
 *
 * The drag-off-a-handle twin of `resolveSnappetDrop`: there the ANCHOR moves and
 * the span is fixed; here the anchor is PINNED and the span grows/shrinks under the
 * pointer. `cols`/`rows` are the raw candidate the handle computed from the grid —
 * floored to at least 1 by `tileSpan` — and validated in place by `canPlace` with
 * the snappet excluded from its own collision test, so growing over its own covered
 * cells never "evicts itself".
 *
 * Returns null when the anchor id isn't a cell of this frame. On a rejection the
 * preview is still drawn at the anchor (a refused resize has to read as "this size,
 * and NO", exactly like a refused drop).
 */
export function resolveSnappetResize(
  ctx: PlacementContext,
  anchorSlotId: string,
  cols: number,
  rows: number,
): SnappetPreview | null {
  const anchor = ctx.grid.coordOf(anchorSlotId);
  if (!anchor) return null;
  const span = tileSpan({ span: { cols, rows } });
  const verdict = canPlace(ctx, anchor, span, anchorSlotId);
  return {
    anchorSlotId,
    anchorRow: anchor.row,
    anchorCol: anchor.col,
    cols: span.cols,
    rows: span.rows,
    valid: verdict.ok,
    reason: verdict.ok ? undefined : verdict.reason,
    evicts: verdict.evicts,
  };
}

// ─── Suggesting a snappet size from an image ──────────────────────────────────

/**
 * The best integer snappet size for an image of aspect `imageAspect` (width/height)
 * dropped into a panel with `free` cells of room.
 *
 * Product-owner model (settled): the content sits ON the snappet at its NATIVE
 * aspect and the background fills the rest — so there is never any crop, and the
 * objective is to MAXIMIZE PRINTED ART AREA, not to minimize background. With a
 * unit tile, a `cols`-wide snappet paints art of width `cols` and height
 * `cols / aspect`, which needs `ceil(cols / aspect)` rows. Among every (cols, rows)
 * that fits `free`, the art area `cols * (cols / aspect) = cols² / aspect` grows
 * strictly with `cols`, so the widest column count that still fits vertically wins;
 * the least-background tie-break only ever matters if two candidates tie (they
 * cannot across differing cols, but it keeps the contract explicit and safe).
 *
 * Pure and side-effect free. NOT wired to the upload path yet (deferred): uploaded
 * art currently drives the whole-SECTION image mode, a separate system. This is the
 * building block that a future "suggest a size on drop" flow will call.
 *
 * Never returns 0×0: it floors at 1×1 (which always fits a panel with ≥1 cell),
 * even for an image so tall that no candidate's rows fit — the caller then gets the
 * smallest legal snappet rather than an unrepresentable size.
 */
export function suggestSnappetSize(
  imageAspect: number,
  free: { cols: number; rows: number },
): TileSpan {
  const maxCols = Math.max(1, Math.floor(free.cols));
  const maxRows = Math.max(1, Math.floor(free.rows));
  // A non-finite or non-positive aspect (a 0-height image, a bad measurement) has
  // no meaningful shape — treat it as square so the result is still sensible.
  const aspect = Number.isFinite(imageAspect) && imageAspect > 0 ? imageAspect : 1;

  let best: TileSpan = { cols: 1, rows: 1 };
  let bestArea = -Infinity;
  let bestBackground = Infinity;
  for (let cols = 1; cols <= maxCols; cols++) {
    const rowsNeeded = Math.max(1, Math.ceil(cols / aspect));
    if (rowsNeeded > maxRows) continue; // the art would overflow the panel vertically
    const artArea = (cols * cols) / aspect; // cols wide × (cols/aspect) tall
    const background = cols * rowsNeeded - artArea; // leftover cells around the art
    const EPS = 1e-9;
    if (artArea > bestArea + EPS || (artArea > bestArea - EPS && background < bestBackground)) {
      best = { cols, rows: rowsNeeded };
      bestArea = artArea;
      bestBackground = background;
    }
  }
  return best;
}

export interface PanelSnappetPlacement {
  /** Where the uploaded snappet anchors — the top-most free cell of the panel. */
  anchorSlotId: string;
  /** Its suggested footprint (native aspect, no crop). 1x1 when the panel is tight. */
  span: TileSpan;
}

/**
 * Where an uploaded image of aspect `imageAspect` should land as a SNAPPET in a
 * panel — the single decision that unifies uploaded art with the snappet engine.
 *
 * The anchor is the panel's TOP-MOST, LEFT-MOST free cell; the span is
 * `suggestSnappetSize` over the free rectangle at that anchor (so a PORTRAIT photo
 * lands tall — e.g. 2x3/2x4 in a 2-wide side panel — and a LANDSCAPE/SQUARE photo
 * lands compact — 2x2 — a purely geometric asymmetry). The span is then shrunk
 * until `canPlace` accepts it, so the result is always seatable (overlap is legal
 * and evicts; the store applies that). Null when the panel has no free cell.
 *
 * Shared by the store's `placeImageSnappet` (which does the placement) and the crop
 * modal wiring (which sizes the crop's aspect target to the SAME span), so the two
 * cannot disagree — on a native-aspect upload the crop needs little to no crop.
 */
export function panelSnappetPlacement(
  ctx: PlacementContext,
  panelId: SectionId,
  imageAspect: number,
  opts: { allowEvict?: boolean; minSpan?: TileSpan } = {},
): PanelSnappetPlacement | null {
  const { grid, slots, barCovered } = ctx;

  // Cells already taken: every existing tile's footprint, plus text-bar-covered ids.
  const occupied = new Set<string>();
  for (const [id, tile] of Object.entries(slots)) {
    const coord = grid.coordOf(id);
    if (!coord) continue;
    for (const oc of occupiedCoords(coord, tileSpan(tile))) occupied.add(`${oc.row}:${oc.col}`);
  }
  for (const id of barCovered) {
    const coord = grid.coordOf(id);
    if (coord) occupied.add(`${coord.row}:${coord.col}`);
  }

  const inPanel = grid.slots.filter((s) => grid.panelAt(s.row, s.col) === panelId);
  if (inPanel.length === 0) return null;
  const col0 = Math.min(...inPanel.map((s) => s.col));
  const col1 = Math.max(...inPanel.map((s) => s.col));
  const row0 = Math.min(...inPanel.map((s) => s.row));
  const row1 = Math.max(...inPanel.map((s) => s.row));

  const inPanelCell = (row: number, col: number): boolean =>
    grid.cellAt(row, col) != null && grid.panelAt(row, col) === panelId;
  const free = (row: number, col: number): boolean =>
    inPanelCell(row, col) && !occupied.has(`${row}:${col}`);

  // Anchor: scan row-major for the first free cell of the panel.
  let anchor: GridCoord | null = null;
  for (let row = row0; row <= row1 && !anchor; row++) {
    for (let col = col0; col <= col1; col++) {
      if (free(row, col)) {
        anchor = { row, col };
        break;
      }
    }
  }
  // Panel FULL (no free cell). By default we refuse. But with `allowEvict` (uploading a
  // photo — a deliberate act, not an auto-fill) we still place it: anchor at the panel's
  // top-left cell and let canPlace EVICT the tiles it covers, exactly like dragging a
  // snappet onto an occupied area. This is what lets a photo land on a fully-tiled frame.
  const evicting = !anchor;
  if (!anchor) {
    if (!opts.allowEvict) return null;
    anchor = { row: row0, col: col0 };
  }
  const anchorCell = grid.cellAt(anchor.row, anchor.col);
  if (!anchorCell) return null;

  // Available rectangle at the anchor: contiguous columns right / rows down. When
  // seating into free space that's the free run; when evicting a full panel it's the
  // panel's own extent (occupancy ignored — canPlace evicts overlaps below).
  const openAt = evicting ? inPanelCell : free;
  let freeCols = 0;
  for (let col = anchor.col; col <= col1 && openAt(anchor.row, col); col++) freeCols++;
  let freeRows = 0;
  for (let row = anchor.row; row <= row1 && openAt(row, anchor.col); row++) freeRows++;

  // Suggest a size, then shrink until canPlace accepts it (the anchor tile — if any —
  // is excluded so growing over its own cell is never a self-collision).
  //
  // The shrink stops at the builder's FLOOR, not at 1x1. A photo dropped into a
  // roomy panel was landing on a single 0.991in cell whenever the free run happened
  // to be narrow, which is a thumbnail, not a print. Clamp the suggestion up to the
  // floor first, then never shrink below it.
  const floor = tileSpan({ span: opts.minSpan ?? { cols: 1, rows: 1 } });
  const raw = suggestSnappetSize(imageAspect, { cols: freeCols, rows: freeRows });
  const suggested: TileSpan = {
    cols: Math.max(raw.cols, floor.cols),
    rows: Math.max(raw.rows, floor.rows),
  };
  for (let rows = suggested.rows; rows >= floor.rows; rows--) {
    for (let cols = suggested.cols; cols >= floor.cols; cols--) {
      if (canPlace(ctx, anchor, { cols, rows }, anchorCell.id).ok) {
        return { anchorSlotId: anchorCell.id, span: { cols, rows } };
      }
    }
  }
  // The floor genuinely will not seat here (a one-row strip cannot hold a 2x2).
  // Fall back rather than refuse the upload outright.
  for (let rows = floor.rows; rows >= 1; rows--) {
    for (let cols = floor.cols; cols >= 1; cols--) {
      if (canPlace(ctx, anchor, { cols, rows }, anchorCell.id).ok) {
        return { anchorSlotId: anchorCell.id, span: { cols, rows } };
      }
    }
  }
  return { anchorSlotId: anchorCell.id, span: { cols: 1, rows: 1 } };
}

/**
 * The record that OWNS a cell: the cell's own tile, or — when it is buried under a
 * snappet — the anchor covering it. Mirrors `removeTile`'s rule, so a gesture that
 * starts on a non-anchor cell of a footprint still addresses the whole footprint
 * instead of silently doing nothing.
 */
export function anchorIdFor(
  slots: Record<string, PlacedTile>,
  grid: FrameGrid,
  slotId: string,
): string | null {
  if (slots[slotId]) return slotId;
  if (!hasAnySpan(slots)) return null;
  return coveredBySnappets(slots, grid).get(slotId) ?? null;
}

/**
 * Grow any placed badge that sits below its floor up to that floor.
 *
 * A 2x2 minimum only governs the DROP and the RESIZE. Tiles already in a design -
 * and anything Fill All / Random wrote cell-by-cell - stay at whatever size they
 * were saved at, so a rule introduced later never reaches them. This is the same
 * shape of problem as a default that only applies to new designs.
 *
 * Deliberately conservative: a tile grows ONLY if the bigger footprint is legal AND
 * evicts nothing. Growing over a neighbour would silently delete work the user did,
 * which is far worse than leaving one badge small. Anything that cannot grow
 * cleanly is left exactly as it is.
 *
 * Returns the SAME object when nothing changed, so a normal hydrate does no work.
 */
/**
 * Lay `span`-sized blocks across every tileable cell, packing from each panel's
 * top-left, and return the design that results.
 *
 * Fill All and Random used to write cells ONE AT A TIME with no span, so every
 * badge they produced was 1x1 regardless of any floor — a floor governs how small a
 * footprint may SHRINK to, and these never asked for a footprint at all. Filling
 * with blocks is a different job from filtering which pieces are eligible, which is
 * why narrowing the pool only ever hid the symptom.
 *
 * A block is placed only where it seats cleanly and evicts nothing. Cells that
 * cannot take one are LEFT EMPTY rather than back-filled with a smaller badge: an
 * empty pocket prints nothing and reads as part of the frame, whereas a lone 1x1 of
 * unreadable artwork is exactly what the floor exists to prevent. Panels held by a
 * text banner, the plate hole and bar-covered cells are all skipped by `canPlace`.
 *
 * `pick` is called once per placed block, so a caller can hand back one piece for
 * Fill All or a random one per block for Random.
 */
export function blockFill(
  ctx: PlacementContext,
  pick: (index: number) => { pieceId: string; setId: string } | null,
  span: TileSpan,
  floor: TileSpan = span,
): Record<string, PlacedTile> {
  const { grid } = ctx;
  const slots: Record<string, PlacedTile> = {};
  const taken = new Set<string>();
  const key = (row: number, col: number) => `${row}:${col}`;
  const lo = tileSpan({ span: floor });

  /**
   * Blocks are sized to the PANEL, not fixed at the floor.
   *
   * A fixed 2x2 tiles a two-wide side panel exactly and a three-wide one not at
   * all: it seats one block per row-pair and leaves a single column running the
   * whole height, which is where the holes came from. (The right wing hid it by
   * hanging its blocks over the frame edge, which is why only one side looked
   * wrong.) Squaring the block to the panel's short side makes a three-wide panel
   * lay 3x3 and cover completely — the same rule a drag already follows when it
   * grows a badge to fit the panel it lands in.
   */
  const sizesFor = (anchor: GridCoord): TileSpan[] => {
    const ext = panelExtent(grid, anchor);
    const preferred = ext ? suggestSnappetSize(1, ext) : lo;
    return spanLadder(
      { cols: Math.max(preferred.cols, lo.cols), rows: Math.max(preferred.rows, lo.rows) },
      lo,
    );
  };

  // Row-major, so blocks pack top-left and the leftovers collect at the far edge
  // rather than scattering as holes through the middle.
  const cells = [...grid.slots].sort((a, b) => a.row - b.row || a.col - b.col);

  let placed = 0;
  for (const cell of cells) {
    if (taken.has(key(cell.row, cell.col))) continue;
    const anchor: GridCoord = { row: cell.row, col: cell.col };
    for (const size of sizesFor(anchor)) {
      const coords = occupiedCoords(anchor, size);
      // Overlapping a block laid a moment ago is not an eviction to resolve, it is
      // simply a size that does not fit here — try the next one down.
      if (coords.some((c) => taken.has(key(c.row, c.col)))) continue;
      // Every cell must be a REAL cell. `canPlace` permits a footprint to hang past
      // the outer edge, which is a deliberate rule for a placement someone makes by
      // hand and watches land. An automatic fill is neither: art pushed off the
      // frame there is invisible, unasked for, and prints nothing. Constrained here
      // rather than in `canPlace`, so manual placement keeps whatever behaviour it
      // is meant to have.
      if (coords.some((c) => grid.cellAt(c.row, c.col) == null)) continue;
      const verdict = canPlace({ ...ctx, slots }, anchor, size);
      if (!verdict.ok || verdict.evicts.length > 0) continue;
      const piece = pick(placed);
      if (!piece) return slots;
      slots[cell.id] = { ...piece, span: size };
      for (const c of coords) taken.add(key(c.row, c.col));
      placed++;
      break;
    }
  }
  return slots;
}

/**
 * Drop tiles whose piece no longer exists.
 *
 * A retired piece leaves a record that resolves to nothing: the cell renders blank
 * but still occupies the grid, still blocks a drop, and still appears in the parts
 * list as something to print. That is worse than an empty pocket, which is a
 * deliberate part of the design and prints nothing at all.
 *
 * Runs on hydrate, not in `migrate` — a repair in `migrate` never reaches a browser
 * whose blob is already at the current version, which is exactly the case it is
 * written for.
 *
 * Returns the SAME object when nothing changed, so a normal hydrate does no work.
 */
export function dropUnknownPieces(
  slots: Record<string, PlacedTile>,
  exists: (pieceId: string) => boolean,
): Record<string, PlacedTile> {
  let changed = false;
  const out: Record<string, PlacedTile> = {};
  for (const [id, tile] of Object.entries(slots)) {
    // An uploaded photo carries a reserved marker id and no set piece — it must
    // survive a purge aimed at retired catalogue pieces.
    if (tile.image || exists(tile.pieceId)) out[id] = tile;
    else changed = true;
  }
  return changed ? out : slots;
}

export function growUndersizedBadges(
  ctx: PlacementContext,
  minFor: (pieceId: string) => TileSpan,
): Record<string, PlacedTile> {
  const { slots, grid } = ctx;
  let changed = false;
  const out: Record<string, PlacedTile> = {};
  for (const [id, tile] of Object.entries(slots)) {
    const span = tileSpan(tile);
    const min = minFor(tile.pieceId);
    const anchor = grid.coordOf(id);
    if (!anchor || (span.cols >= min.cols && span.rows >= min.rows)) {
      out[id] = tile;
      continue;
    }
    const target: TileSpan = {
      cols: Math.max(span.cols, min.cols),
      rows: Math.max(span.rows, min.rows),
    };
    const verdict = canPlace(ctx, anchor, target, id);
    if (verdict.ok && verdict.evicts.length === 0) {
      out[id] = { ...tile, span: target };
      changed = true;
    } else {
      out[id] = tile;
    }
  }
  return changed ? out : slots;
}
