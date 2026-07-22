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

import type { FrameSlot, GridCoord, PlacedTile, SectionId, SectionState, TileSpan } from "@/lib/types";
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

  const at = (coord: GridCoord, result: PlacementResult): SnappetPreview | null => {
    const cell = grid.cellAt(coord.row, coord.col);
    if (!cell) return null;
    return {
      anchorSlotId: cell.id,
      anchorRow: coord.row,
      anchorCol: coord.col,
      cols: span.cols,
      rows: span.rows,
      valid: result.ok,
      reason: result.ok ? undefined : result.reason,
      evicts: result.evicts,
    };
  };

  // First legal anchor wins. Otherwise remember the first candidate that is a real
  // cell: a rejection still has to be DRAWN somewhere, and drawing it on a plate
  // hole (which has no slot) is not an option.
  let rejected: SnappetPreview | null = null;
  for (const cand of nudgeCandidates(start, span)) {
    const verdict = canPlace(ctx, cand, span, req.excludeId);
    if (verdict.ok) return at(cand, verdict);
    rejected ??= at(cand, verdict);
  }
  // Every candidate was blocked AND none of them was a drawable cell — fall back
  // to the cell the pointer is genuinely over, which is a real slot by definition.
  return rejected ?? at(over, canPlace(ctx, over, span, req.excludeId));
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
  opts: { allowEvict?: boolean } = {},
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
  const suggested = suggestSnappetSize(imageAspect, { cols: freeCols, rows: freeRows });
  for (let rows = suggested.rows; rows >= 1; rows--) {
    for (let cols = suggested.cols; cols >= 1; cols--) {
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
