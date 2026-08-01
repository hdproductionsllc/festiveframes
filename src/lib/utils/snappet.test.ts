import { describe, it, expect } from "vitest";
import {
  UPLOAD_SET_ID,
  UPLOAD_PIECE_ID,
  dropUnknownPieces,
  blockFill,
  canPlace,
  coveredBySnappets,
  hasAnySpan,
  isMultiCell,
  occupiedCoords,
  snappetRect,
  tileSpan,
  visibleAnchorSlots,
  resolveSnappetDrop,
  resolveSnappetResize,
  spanLadder,
  minSpanFor,
  MIN_ART_SPAN,
  growUndersizedBadges,
  suggestSnappetSize,
  grabOffsetIn,
  anchorIdFor,
  panelSnappetPlacement,
  type PlacementContext,
} from "./snappet";
import { buildGrid } from "./slot-generator";
import { DEFAULT_FRAME_CONFIG, SCHOOL_FRAME_CONFIG, getWingFrameConfig } from "@/lib/constants/frame";
import type { PlacedTile, TileSpan } from "@/lib/types";

// The school grid is the one that matters here: 14 cols x 8 rows, wing column at
// col 0 / col 13, the inner rails at col 1 / col 12, and the plate hole spanning
// rows 1..5 x cols 2..11. Every coordinate below is derived from those facts.
const schoolGrid = buildGrid(SCHOOL_FRAME_CONFIG);
const noSections = {};
const noSlots: Record<string, PlacedTile> = {};
const noBars: ReadonlySet<string> = new Set();

/** A placement context on the school grid, overriding whichever field a test cares about. */
const ctx = (over: Partial<PlacementContext> = {}): PlacementContext => ({
  grid: schoolGrid,
  slots: noSlots,
  sections: noSections,
  barCovered: noBars,
  ...over,
});

const tile = (pieceId: string, span?: { cols: number; rows: number }): PlacedTile =>
  span ? { pieceId, setId: "essentials", span } : { pieceId, setId: "essentials" };

describe("tileSpan", () => {
  it("defaults to 1x1 for a tile with no span", () => {
    expect(tileSpan(tile("essentials:red"))).toEqual({ cols: 1, rows: 1 });
    expect(tileSpan(undefined)).toEqual({ cols: 1, rows: 1 });
    expect(tileSpan(null)).toEqual({ cols: 1, rows: 1 });
  });

  it("returns the declared span, floored to at least 1", () => {
    expect(tileSpan(tile("x", { cols: 2, rows: 4 }))).toEqual({ cols: 2, rows: 4 });
    expect(tileSpan(tile("x", { cols: 0, rows: -3 }))).toEqual({ cols: 1, rows: 1 });
  });

  it("isMultiCell / hasAnySpan are false for an all-1x1 design", () => {
    expect(isMultiCell({ cols: 1, rows: 1 })).toBe(false);
    expect(hasAnySpan({ "frame:top-0": tile("a"), "frame:top-1": tile("b") })).toBe(false);
    expect(hasAnySpan({ "frame:top-0": tile("a", { cols: 2, rows: 1 }) })).toBe(true);
  });
});

describe("occupiedCoords", () => {
  it("a 1x1 span produces exactly the anchor cell and nothing else", () => {
    expect(occupiedCoords({ row: 3, col: 4 }, { cols: 1, rows: 1 })).toEqual([
      { row: 3, col: 4 },
    ]);
  });

  it("grows right and down from the anchor", () => {
    expect(occupiedCoords({ row: 1, col: 1 }, { cols: 2, rows: 2 })).toEqual([
      { row: 1, col: 1 },
      { row: 1, col: 2 },
      { row: 2, col: 1 },
      { row: 2, col: 2 },
    ]);
  });
});

describe("canPlace", () => {
  it("REJECTS any footprint touching the plate hole", () => {
    // The plate is rows 1..5 x cols 2..11. Anchor on the left rail (row 2, col 1)
    // and reach one cell right → straight into the plate.
    const leftRail = schoolGrid.coordOf("frame:left-1")!;
    expect(leftRail).toEqual({ row: 2, col: 1 });
    const over = canPlace(ctx(), leftRail, { cols: 2, rows: 1 });
    expect(over.ok).toBe(false);
    expect(over.reason).toBe("plate");

    // Downward from the top rail is equally forbidden.
    const topInner = schoolGrid.coordOf("frame:top-5")!;
    const down = canPlace(ctx(), topInner, { cols: 1, rows: 2 });
    expect(down.ok).toBe(false);
    expect(down.reason).toBe("plate");

    // The same anchor at 1x1 is perfectly legal — the rejection is about the
    // FOOTPRINT, not the anchor.
    expect(canPlace(ctx(), topInner, { cols: 1, rows: 1 }).ok).toBe(true);
  });

  it("REFUSES a footprint hanging off the outer edge", () => {
    // This test used to assert the opposite, and the opposite was the bug: a cell
    // with no grid cell under it was skipped ("nothing to violate") rather than
    // refused, so a tile could be seated partly off the frame. It drew, it persisted,
    // and the part it describes does not exist - art out there prints on nothing.
    const rightWing = schoolGrid.coordOf("frame:wing-right-0")!;
    expect(rightWing.col).toBe(schoolGrid.cols - 1);
    const result = canPlace(ctx(), rightWing, { cols: 3, rows: 1 });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("offgrid");
  });

  it("REFUSES a footprint hanging off the BOTTOM edge", () => {
    // The other axis, reported separately: a 2x2 anchored on the last row put its
    // bottom half below the bottom bar, where the canvas reserves an overhang gutter
    // and made it look legitimate.
    const lastRow = schoolGrid.rows - 1;
    const anchor = { row: lastRow, col: 0 };
    expect(schoolGrid.cellAt(lastRow, 0)).not.toBeNull();
    const result = canPlace(ctx(), anchor, { cols: 1, rows: 2 });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("offgrid");
  });

  it("ALLOWS a 2-wide footprint spanning the wing column + inner rail", () => {
    // THE reason the unified grid exists. Wing-left sits at col 0, the left rail
    // at col 1 — two different ZONES, adjacent cells in one lattice.
    const anchor = { row: 2, col: 0 };
    expect(schoolGrid.cellAt(2, 0)!.zone).toBe("wing-left");
    expect(schoolGrid.cellAt(2, 1)!.zone).toBe("left");
    const result = canPlace(ctx(), anchor, { cols: 2, rows: 1 });
    expect(result.ok).toBe(true);
  });

  it("REJECTS a footprint reaching into a section that isn't in tile mode", () => {
    const anchor = { row: 2, col: 0 }; // wing-left + left rail
    const sections = { "wing-left": { mode: "image" as const } };
    const result = canPlace(ctx({ sections }), anchor, { cols: 2, rows: 1 });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("suppressed");
  });

  it("REJECTS an anchor that is not a cell (offgrid)", () => {
    const result = canPlace(ctx(), { row: 99, col: 99 }, { cols: 1, rows: 1 });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("offgrid");
  });

  it("ALLOWS overlap, reporting the anchors it evicts", () => {
    const slots: Record<string, PlacedTile> = {
      "frame:wing-left-2": tile("a"), // (row 2, col 0)
      "frame:left-1": tile("b"), // (row 2, col 1)
      "frame:top-0": tile("c"), // untouched
    };
    const result = canPlace(ctx({ slots }), { row: 2, col: 0 }, { cols: 2, rows: 1 });
    expect(result.ok).toBe(true);
    expect(result.evicts.sort()).toEqual(["frame:left-1", "frame:wing-left-2"]);
  });

  it("excludeId keeps a tile from colliding with itself", () => {
    const slots: Record<string, PlacedTile> = { "frame:wing-left-2": tile("a") };
    const result = canPlace(
      ctx({ slots }),
      { row: 2, col: 0 },
      { cols: 1, rows: 1 },
      "frame:wing-left-2",
    );
    expect(result.evicts).toEqual([]);
  });

  it("REJECTS a footprint that crosses a PANEL boundary", () => {
    // The LEFT panel is cols 0-1 (wing + rail). A 3-wide from the top-left corner
    // reaches col 2 — the first TOP-panel cell — so it straddles two panels.
    const corner = { row: 0, col: 0 }; // frame:wing-left-0, in the LEFT panel
    expect(schoolGrid.panelAt(0, 1)).toBe("wing-left"); // the corner column
    expect(schoolGrid.panelAt(0, 2)).toBe("top"); // first inner top cell
    const across = canPlace(ctx(), corner, { cols: 3, rows: 1 });
    expect(across.ok).toBe(false);
    expect(across.reason).toBe("panel");

    // The bottom-left CORNER (6,1) is a LEFT cell; reaching one cell right lands in
    // the BOTTOM panel — rejected even though neither cell is the plate.
    const bottomCorner = schoolGrid.coordOf("frame:bottom-0")!;
    expect(bottomCorner).toEqual({ row: 6, col: 1 });
    const spill = canPlace(ctx(), bottomCorner, { cols: 2, rows: 1 });
    expect(spill.ok).toBe(false);
    expect(spill.reason).toBe("panel");
  });

  it("ALLOWS a 2x2 that spans the wing column + inner rail (one panel)", () => {
    // Both columns 0 and 1 are the LEFT panel, so a square there is contained —
    // this is the placement the panel rule must NOT reject.
    const result = canPlace(ctx(), { row: 0, col: 0 }, { cols: 2, rows: 2 });
    expect(result.ok).toBe(true);
    for (const c of [
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 1],
    ] as const) {
      expect(schoolGrid.panelAt(c[0], c[1])).toBe("wing-left");
    }
  });
});

describe("canPlace vs text bars", () => {
  // The defect: canPlace had no notion of bars, and placeTile only tested the
  // ANCHOR against the covered ids — so a footprint could be seated underneath a
  // banner, where clearCoveredTiles (matching on anchor keys) could never find it.
  it("REJECTS a footprint whose NON-anchor cell is hidden under a bar", () => {
    // A top-row bar at startIndex 0 covers frame:top-0.. — none of which is the
    // wing column at col 0, so the anchor alone looks perfectly free.
    const barCovered = new Set(["frame:top-0", "frame:top-1", "frame:top-2"]);
    const anchor = schoolGrid.coordOf("frame:wing-left-0")!;
    expect(anchor).toEqual({ row: 0, col: 0 });
    expect(schoolGrid.cellAt(0, 1)!.id).toBe("frame:top-0");

    const result = canPlace(ctx({ barCovered }), anchor, { cols: 3, rows: 1 });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("bar");

    // The same anchor at 1x1 clears the bar entirely and stays legal.
    expect(canPlace(ctx({ barCovered }), anchor, { cols: 1, rows: 1 }).ok).toBe(true);
  });
});

describe("coveredBySnappets", () => {
  it("returns empty for an all-1x1 design", () => {
    const slots: Record<string, PlacedTile> = {
      "frame:top-0": tile("a"),
      "frame:top-1": tile("b"),
      "frame:left-0": tile("c"),
    };
    expect(coveredBySnappets(slots, schoolGrid).size).toBe(0);
    // …and on /build, where nothing can ever carry a span.
    expect(coveredBySnappets(slots, buildGrid(DEFAULT_FRAME_CONFIG)).size).toBe(0);
  });

  it("maps each covered cell to its anchor, excluding the anchor itself", () => {
    const slots: Record<string, PlacedTile> = {
      "frame:wing-left-2": tile("a", { cols: 2, rows: 1 }), // (2,0) + (2,1)
    };
    const covered = coveredBySnappets(slots, schoolGrid);
    expect(covered.get("frame:left-1")).toBe("frame:wing-left-2");
    expect(covered.has("frame:wing-left-2")).toBe(false); // the anchor holds it
    expect(covered.size).toBe(1);
  });

  it("emits nothing for overhang coords — they have no slot id to block", () => {
    const slots: Record<string, PlacedTile> = {
      "frame:wing-right-0": tile("a", { cols: 3, rows: 1 }), // 2 cells hang off
    };
    expect(coveredBySnappets(slots, schoolGrid).size).toBe(0);
  });
});

describe("visibleAnchorSlots", () => {
  // `frame:wing-left-1` is (1,0) — a wing cell. A 2x2 there also covers (1,1) and
  // (2,1), which are `left` cells: a different zone, and NOT a section.
  const crossZone: Record<string, PlacedTile> = {
    "frame:wing-left-1": tile("flag", { cols: 2, rows: 2 }),
  };
  const leftPanelText = { "wing-left": { mode: "text" as const } };

  it("passes the design through untouched when no section is suppressed", () => {
    expect(visibleAnchorSlots(crossZone, schoolGrid, noSections)).toEqual(crossZone);
    // …and on /build, which never populates `sections` at all.
    const buildSlots = { "frame:top-0": tile("a"), "frame:left-0": tile("b") };
    expect(visibleAnchorSlots(buildSlots, buildGrid(DEFAULT_FRAME_CONFIG), {})).toEqual(buildSlots);
  });

  it("drops an anchor whose own cell is hidden by its section", () => {
    expect(visibleAnchorSlots(crossZone, schoolGrid, leftPanelText)).toEqual({});
  });

  it("so a hidden snappet blanks no cells — the reason it exists", () => {
    // Visible: the footprint blanks the other three cells — two `left` cells and
    // the wing cell below the anchor.
    const shown = coveredBySnappets(visibleAnchorSlots(crossZone, schoolGrid, noSections), schoolGrid);
    expect([...shown.keys()].sort()).toEqual([
      "frame:left-0",
      "frame:left-1",
      "frame:wing-left-2",
    ]);

    // Left panel switched to text: the anchor renders nothing, so the `left` cells
    // must be ordinary, clickable, empty cells again — not dead chrome-less holes.
    // (The wing cells are hidden by the section overlay either way.)
    const hidden = coveredBySnappets(visibleAnchorSlots(crossZone, schoolGrid, leftPanelText), schoolGrid);
    expect(hidden.size).toBe(0);
  });

  it("keeps a VISIBLE anchor whose footprint merely reaches into a suppressed zone", () => {
    // Anchored in `left` (a plain zone) while the bottom section is text: the tile
    // still paints, clipped by the bottom overlay, so it stays in the design.
    const slots: Record<string, PlacedTile> = {
      "frame:left-4": tile("stripes", { cols: 1, rows: 4 }),
    };
    const sections = { bottom: { mode: "text" as const } };
    expect(visibleAnchorSlots(slots, schoolGrid, sections)).toEqual(slots);
  });

  it("hides rather than deletes — a section round trip restores the snappet", () => {
    const off = visibleAnchorSlots(crossZone, schoolGrid, leftPanelText);
    expect(off).toEqual({});
    // The same input, back in tiles mode, yields the untouched tile: suppression is
    // a view state, exactly as it already is for ordinary 1x1 tiles.
    const back = visibleAnchorSlots(crossZone, schoolGrid, { "wing-left": { mode: "tiles" as const } });
    expect(back).toEqual(crossZone);
  });
});

describe("bleed gutter (FrameConfig.overhangTiles)", () => {
  it("is reserved on the school frame and absent on /build", () => {
    // The school frame takes snappets, so the canvas reserves one tile of bleed on
    // every side for legal overhang. /build declares none, so its canvas root gets
    // no padding and no clip — the layout it has always had.
    expect(SCHOOL_FRAME_CONFIG.overhangTiles).toBe(1);
    expect(DEFAULT_FRAME_CONFIG.overhangTiles).toBeUndefined();
  });

  it("the gutter fraction resolves to exactly `overhangTiles` cells", () => {
    // The fixed point FrameCanvas solves: padding is a fraction of the OUTER width,
    // and the frame lays out in what is left. Assert the result is one tile wide,
    // so the reserved gutter and the overhang it must hold cannot drift apart.
    const config = SCHOOL_FRAME_CONFIG;
    const totalWidthInches = config.widthInches + config.wingWidthInches * 2;
    const f = config.tileSizeInches / totalWidthInches;
    const n = config.overhangTiles ?? 0;
    const gutterFraction = (f * n) / (1 + 2 * f * n);

    const outerWidth = 1200;
    const padding = outerWidth * gutterFraction;
    const contentWidth = outerWidth - 2 * padding;
    const tileSize = (contentWidth / totalWidthInches) * config.tileSizeInches;

    expect(padding).toBeCloseTo(n * tileSize, 9);
    expect(contentWidth + 2 * padding).toBeCloseTo(outerWidth, 9);
  });
});

describe("snappetRect", () => {
  it("on a 1x1 equals that slot's own rect", () => {
    for (const slot of schoolGrid.slots) {
      const rect = snappetRect(slot, { cols: 1, rows: 1 }, slot.width);
      expect(rect).toEqual({ x: slot.x, y: slot.y, width: slot.width, height: slot.height });
    }
  });

  it("scales by whole cells from the anchor origin", () => {
    const slot = schoolGrid.cellAt(2, 0)!;
    expect(snappetRect(slot, { cols: 2, rows: 3 }, slot.width)).toEqual({
      x: slot.x,
      y: slot.y,
      width: slot.width * 2,
      height: slot.width * 3,
    });
  });

  it("a 2-wide rect ends exactly where the next cell ends (gapless lattice)", () => {
    const a = schoolGrid.cellAt(2, 0)!;
    const b = schoolGrid.cellAt(2, 1)!;
    const rect = snappetRect(a, { cols: 2, rows: 1 }, a.width);
    expect(rect.x + rect.width).toBeCloseTo(b.x + b.width, 6);
  });
});

// The rect above is what FrameCanvas hands to the anchor cell (as spanWidth /
// spanHeight) and to the drop cue, so these are the RENDERING contract: a snappet
// must land flush on the cells it claims, whatever its shape.
describe("snappetRect — rendering geometry", () => {
  /** The rect must cover its footprint EXACTLY: same origin as the top-left cell,
   *  same far edge as the bottom-right cell it claims (when that cell exists). */
  const coversFootprint = (anchor: { row: number; col: number }, span: TileSpan) => {
    const a = schoolGrid.cellAt(anchor.row, anchor.col)!;
    const last = schoolGrid.cellAt(anchor.row + span.rows - 1, anchor.col + span.cols - 1)!;
    const rect = snappetRect(a, span, a.width);
    expect(rect.x).toBeCloseTo(a.x, 6);
    expect(rect.y).toBeCloseTo(a.y, 6);
    expect(rect.x + rect.width).toBeCloseTo(last.x + last.width, 6);
    expect(rect.y + rect.height).toBeCloseTo(last.y + last.height, 6);
  };

  it("1x1 — a plain tile is drawn at exactly its own cell (the /build case)", () => {
    coversFootprint({ row: 0, col: 0 }, { cols: 1, rows: 1 });
    // …and on the /build grid, where no tile can ever carry a span.
    const buildGridDefault = buildGrid(DEFAULT_FRAME_CONFIG);
    for (const slot of buildGridDefault.slots) {
      expect(snappetRect(slot, tileSpan(tile("x")), slot.width)).toEqual({
        x: slot.x,
        y: slot.y,
        width: slot.width,
        height: slot.height,
      });
    }
  });

  it("2x2 — a square snappet in the bottom-left corner covers all four cells", () => {
    // Rows 6/7 are the two bottom rows; cols 0/1 are the wing column + left rail.
    const span: TileSpan = { cols: 2, rows: 2 };
    coversFootprint({ row: 6, col: 0 }, span);
    // All four claimed cells are real, and the three non-anchor ones fall inside
    // the rect — i.e. nothing is left showing through.
    const a = schoolGrid.cellAt(6, 0)!;
    const rect = snappetRect(a, span, a.width);
    for (const c of occupiedCoords({ row: 6, col: 0 }, span)) {
      const cell = schoolGrid.cellAt(c.row, c.col)!;
      expect(cell).toBeTruthy();
      expect(cell.x).toBeGreaterThanOrEqual(rect.x - 1e-6);
      expect(cell.x + cell.width).toBeLessThanOrEqual(rect.x + rect.width + 1e-6);
      expect(cell.y + cell.height).toBeLessThanOrEqual(rect.y + rect.height + 1e-6);
    }
  });

  it("11x2 — the full-width bottom banner spans the inner frame edge to edge", () => {
    // The real 11x2 case: anchored on the bottom rail's first inner cell (col 1),
    // 11 wide reaches col 11, 2 tall covers both bottom rows. No plate, no wings.
    const anchor = schoolGrid.coordOf("frame:bottom-0")!;
    expect(anchor).toEqual({ row: 6, col: 1 });
    const span: TileSpan = { cols: 11, rows: 2 };
    coversFootprint(anchor, span);

    const a = schoolGrid.cellAt(anchor.row, anchor.col)!;
    const rect = snappetRect(a, span, a.width);
    // Eleven cells of width, with NO accumulated step error over the long run —
    // the point of the gapless-lattice invariant.
    expect(rect.width).toBeCloseTo(a.width * 11, 9);
    expect(rect.height).toBeCloseTo(a.height * 2, 9);
  });

  it("overhang — a footprint past the outer edge yields a rect that extends past it", () => {
    // The right wing is the last column; a 3-wide tile there hangs 2 cells off the
    // frame. The rect is NOT clamped: it is the caller's (the snappet layer's) job
    // to let that overflow paint, so the geometry has to state it honestly.
    const anchor = schoolGrid.coordOf("frame:wing-right-0")!;
    expect(anchor.col).toBe(schoolGrid.cols - 1);
    const a = schoolGrid.cellAt(anchor.row, anchor.col)!;
    const rect = snappetRect(a, { cols: 3, rows: 1 }, a.width);

    const frameRightEdge = a.x + a.width; // the far edge of the last column
    expect(rect.x + rect.width).toBeCloseTo(frameRightEdge + 2 * a.width, 6);
    expect(rect.x + rect.width).toBeGreaterThan(frameRightEdge);
    // …and it never moves the ANCHOR: the tile still starts in its own cell.
    expect(rect.x).toBeCloseTo(a.x, 6);
  });

  it("is pure geometry — it does not consult the grid, so it scales with tileSize", () => {
    // FrameCanvas passes the LIVE tileSize (containerWidth / totalWidthInches), so
    // the same span must resolve at any responsive width.
    const a = schoolGrid.cellAt(6, 0)!;
    for (const tileSize of [10, 33.7, 120]) {
      const rect = snappetRect(a, { cols: 2, rows: 4 }, tileSize);
      expect(rect.width).toBeCloseTo(tileSize * 2, 9);
      expect(rect.height).toBeCloseTo(tileSize * 4, 9);
    }
  });
});

// ─── Stage 4: resolving a drag into a footprint ──────────────────────────────

describe("grabOffsetIn", () => {
  const rect = { left: 100, top: 200, width: 400, height: 100 }; // 4x1 of 100px cells

  it("names the cell the pointer went down on", () => {
    const span = { cols: 4, rows: 1 };
    expect(grabOffsetIn(rect, { x: 105, y: 210 }, span)).toEqual({ dr: 0, dc: 0 });
    expect(grabOffsetIn(rect, { x: 250, y: 210 }, span)).toEqual({ dr: 0, dc: 1 });
    expect(grabOffsetIn(rect, { x: 490, y: 210 }, span)).toEqual({ dr: 0, dc: 3 });
  });

  it("measures rows as well as columns", () => {
    const tall = { left: 0, top: 0, width: 100, height: 200 }; // 1 col x 2 rows
    expect(grabOffsetIn(tall, { x: 50, y: 150 }, { cols: 1, rows: 2 })).toEqual({ dr: 1, dc: 0 });
  });

  it("clamps a pointer on (or past) the outer edge into the footprint", () => {
    const span = { cols: 4, rows: 1 };
    // Exactly on the right edge would floor to cell 4 — one past the last cell.
    expect(grabOffsetIn(rect, { x: 500, y: 300 }, span)).toEqual({ dr: 0, dc: 3 });
    expect(grabOffsetIn(rect, { x: 40, y: 100 }, span)).toEqual({ dr: 0, dc: 0 });
  });

  it("a 1x1 always grabs its only cell", () => {
    expect(grabOffsetIn(rect, { x: 480, y: 290 }, { cols: 1, rows: 1 })).toEqual({ dr: 0, dc: 0 });
  });
});

describe("resolveSnappetDrop", () => {
  const drop = (
    overSlotId: string,
    span: TileSpan,
    over: Partial<PlacementContext> = {},
    req: { grab?: { dr: number; dc: number }; excludeId?: string } = {},
  ) => resolveSnappetDrop(ctx(over), { overSlotId, span, ...req });

  it("returns null when the hovered id is not a cell of this frame", () => {
    expect(drop("frame:nope-9", { cols: 2, rows: 2 })).toBeNull();
  });

  it("anchors a footprint at the hovered cell — its TOP-LEFT", () => {
    // A cell fully INSIDE the bottom panel (cols 2-11): row 6, col 2. A 2x2 grows
    // right/down into row 7 (the second bottom row) and col 3 — all in the bottom
    // panel, so it seats at the hovered cell with no nudge. (col 1 is the bottom-
    // left CORNER, owned by the LEFT panel, so a 2x2 there would cross a boundary.)
    expect(schoolGrid.coordOf("frame:bottom-1")).toEqual({ row: 6, col: 2 });
    const p = drop("frame:bottom-1", { cols: 2, rows: 2 })!;
    expect(p.valid).toBe(true);
    expect(p.anchorSlotId).toBe("frame:bottom-1");
    expect([p.anchorRow, p.anchorCol, p.cols, p.rows]).toEqual([6, 2, 2, 2]);
  });

  it("does not RESOLVE a drop to a footprint hanging off the outer edge", () => {
    // The resolver either nudges the anchor back to somewhere the footprint fits, or
    // reports it invalid. What it must not do is seat it half off the frame.
    const p = drop("frame:wing-right-0", { cols: 3, rows: 1 });
    if (p) expect(p.valid).toBe(false);
  });

  it("NUDGES the anchor back so a footprint clears the plate", () => {
    // Left rail at (2,1): a 2x2 there would bite into the plate at col 2. Pulled
    // back one column it sits on the wing + rail instead — the clampStartIndex
    // move, in two dimensions.
    expect(schoolGrid.cellAt(2, 2)).toBeNull();
    expect(schoolGrid.isPlate(2, 2)).toBe(true);
    const p = drop("frame:left-1", { cols: 2, rows: 2 })!;
    expect(p.valid).toBe(true);
    expect([p.anchorRow, p.anchorCol]).toEqual([2, 0]);
    expect(schoolGrid.cellAt(2, 0)!.zone).toBe("wing-left");
  });

  it("REJECTS a footprint the plate blocks in every direction", () => {
    // Mid top rail: every 2x2 within one nudge reaches down into the plate.
    const p = drop("frame:top-4", { cols: 2, rows: 2 })!;
    expect(p.valid).toBe(false);
    expect(p.reason).toBe("plate");
    // Still drawn at a real cell, so the cue can show WHERE it was refused.
    expect(schoolGrid.coordOf(p.anchorSlotId)).not.toBeNull();
  });

  it("REJECTS a footprint that would reach under a text bar", () => {
    const barCovered = new Set(["frame:top-0", "frame:top-1", "frame:top-2"]);
    // Anchored on the wing corner (0,0), a 3-wide reaches frame:top-0/1 under the
    // bar, and no backward nudge exists (col 0 is the first column).
    const p = drop("frame:wing-left-0", { cols: 3, rows: 1 }, { barCovered })!;
    expect(p.valid).toBe(false);
    expect(p.reason).toBe("bar");
  });

  it("REJECTS a footprint reaching into a section that is no longer tiled", () => {
    const sections = { "wing-left": { mode: "image" as const } };
    const p = drop("frame:wing-left-2", { cols: 2, rows: 1 }, { sections })!;
    expect(p.valid).toBe(false);
    expect(p.reason).toBe("suppressed");
  });

  it("reports the anchors an overlapping drop will EVICT", () => {
    const slots: Record<string, PlacedTile> = {
      "frame:wing-left-2": tile("a"), // (2,0)
      "frame:left-1": tile("b"), // (2,1)
      "frame:top-0": tile("c"), // untouched
    };
    const p = drop("frame:wing-left-2", { cols: 2, rows: 1 }, { slots })!;
    expect(p.valid).toBe(true);
    expect(p.evicts.sort()).toEqual(["frame:left-1", "frame:wing-left-2"]);
  });

  it("CLAMPS the anchor into the grid rather than resolving off it", () => {
    // Grabbed by its right end and dropped on the leftmost bottom cell (col 1):
    // the raw anchor would be col -9. Clamped to col 0, the first real column.
    const p = drop("frame:bottom-0", { cols: 11, rows: 1 }, {}, { grab: { dr: 0, dc: 10 } })!;
    expect(p.anchorCol).toBe(0);
    expect(p.anchorRow).toBe(6);
  });

  it("ignores a grab offset that is larger than the footprint", () => {
    // dc clamps to cols-1 = 1, dr to rows-1 = 0 — one cell back, not nine.
    expect(schoolGrid.coordOf("frame:bottom-4")).toEqual({ row: 6, col: 5 });
    const p = drop("frame:bottom-4", { cols: 2, rows: 1 }, {}, { grab: { dr: 9, dc: 9 } })!;
    expect([p.anchorRow, p.anchorCol]).toEqual([6, 4]);
  });

  it("PRESERVES the grab offset when moving a snappet — no teleport", () => {
    // A 4x2 snappet in the BOTTOM panel (cols 2-11) anchored at (6,4), grabbed by
    // its RIGHT end (dc 3). Hovering the cell that end is over must resolve back to
    // the SAME anchor, not slide the snappet three columns left. (A footprint may
    // not straddle two panels, so the widest movable case lives inside one panel.)
    const slots: Record<string, PlacedTile> = {
      "frame:bottom-3": tile("banner", { cols: 4, rows: 2 }), // (6,4)..(7,7)
    };
    const rightEnd = schoolGrid.cellAt(6, 7)!;
    const p = drop(
      rightEnd.id,
      { cols: 4, rows: 2 },
      { slots },
      { grab: { dr: 0, dc: 3 }, excludeId: "frame:bottom-3" },
    )!;
    expect(p.valid).toBe(true);
    expect(p.anchorSlotId).toBe("frame:bottom-3");
    // excludeId is what keeps it from "evicting" itself.
    expect(p.evicts).toEqual([]);

    // …and one column to the right moves it exactly one column.
    const moved = drop(
      schoolGrid.cellAt(6, 8)!.id,
      { cols: 4, rows: 2 },
      { slots },
      { grab: { dr: 0, dc: 3 }, excludeId: "frame:bottom-3" },
    )!;
    expect([moved.anchorRow, moved.anchorCol]).toEqual([6, 5]);
  });

  it("a 1x1 resolves to exactly the hovered cell — the /build shape", () => {
    const defaultGrid = buildGrid(DEFAULT_FRAME_CONFIG);
    const p = resolveSnappetDrop(
      { grid: defaultGrid, slots: noSlots, sections: noSections, barCovered: noBars },
      { overSlotId: "frame:top-3", span: { cols: 1, rows: 1 } },
    )!;
    expect(p.anchorSlotId).toBe("frame:top-3");
    expect(p.valid).toBe(true);
    expect([p.cols, p.rows]).toEqual([1, 1]);
  });
});

// ─── Stage 8: resizing a placed snappet ──────────────────────────────────────

describe("resolveSnappetResize", () => {
  it("returns null when the anchor id isn't a cell of this frame", () => {
    expect(resolveSnappetResize(ctx(), "frame:nope-9", 2, 2)).toBeNull();
  });

  it("keeps the anchor fixed and validates a grown span in place", () => {
    // A snappet anchored at the bottom panel (6,2). Grow it to 2x2 — grows into
    // (6,3)/(7,2)/(7,3), all one panel, so it's valid at the SAME anchor.
    const slots: Record<string, PlacedTile> = {
      "frame:bottom-1": tile("banner", { cols: 1, rows: 1 }),
    };
    const p = resolveSnappetResize(ctx({ slots }), "frame:bottom-1", 2, 2)!;
    expect(p.valid).toBe(true);
    expect(p.anchorSlotId).toBe("frame:bottom-1");
    expect([p.anchorRow, p.anchorCol, p.cols, p.rows]).toEqual([6, 2, 2, 2]);
  });

  it("excludes the snappet from its own collision test — no self-evict on grow", () => {
    const slots: Record<string, PlacedTile> = {
      "frame:bottom-1": tile("banner", { cols: 2, rows: 1 }), // (6,2)+(6,3)
    };
    // Growing to 2x2 covers its own cells; excludeId keeps it from evicting itself.
    const p = resolveSnappetResize(ctx({ slots }), "frame:bottom-1", 2, 2)!;
    expect(p.valid).toBe(true);
    expect(p.evicts).toEqual([]);
  });

  it("REJECTS a grow across a panel boundary / into the plate", () => {
    // Left rail (2,1): any widen reaches col 2, the plate.
    const slots: Record<string, PlacedTile> = { "frame:left-1": tile("x") };
    const p = resolveSnappetResize(ctx({ slots }), "frame:left-1", 2, 1)!;
    expect(p.valid).toBe(false);
    expect(p.reason).toBe("plate");
  });

  it("floors a candidate to at least 1x1 (never 0)", () => {
    const slots: Record<string, PlacedTile> = { "frame:top-0": tile("x") };
    const p = resolveSnappetResize(ctx({ slots }), "frame:top-0", 0, -4)!;
    expect([p.cols, p.rows]).toEqual([1, 1]);
    expect(p.valid).toBe(true);
  });
});

describe("suggestSnappetSize", () => {
  const sidePanel = { cols: 2, rows: 8 }; // a school SIDE panel: 2 wide, 8 tall

  it("PORTRAIT 2:3 fills a 2-wide panel exactly — 2x3, zero background", () => {
    expect(suggestSnappetSize(2 / 3, sidePanel)).toEqual({ cols: 2, rows: 3 });
  });

  it("SQUARE 1:1 → 2x2", () => {
    expect(suggestSnappetSize(1, sidePanel)).toEqual({ cols: 2, rows: 2 });
  });

  it("LANDSCAPE 4:3 → 2x2 (does not collapse to 1x1)", () => {
    expect(suggestSnappetSize(4 / 3, sidePanel)).toEqual({ cols: 2, rows: 2 });
  });

  it("WIDE 16:9 → 2x2 (still maximizes printed art, never 1x1)", () => {
    expect(suggestSnappetSize(16 / 9, sidePanel)).toEqual({ cols: 2, rows: 2 });
  });

  it("a very wide image still uses the full panel width, not one cell", () => {
    const s = suggestSnappetSize(5, sidePanel);
    expect(s.cols).toBe(2); // maximizes art area = cols²/aspect → widest that fits
    expect(s.rows).toBeGreaterThanOrEqual(1);
  });

  it("always fits the free rectangle and is never 0x0", () => {
    const frees = [
      { cols: 1, rows: 1 },
      { cols: 2, rows: 8 },
      { cols: 10, rows: 2 }, // a wide TOP-style panel
      { cols: 10, rows: 1 },
    ];
    const aspects = [0.1, 2 / 3, 1, 4 / 3, 16 / 9, 5, 20];
    for (const free of frees) {
      for (const a of aspects) {
        const s = suggestSnappetSize(a, free);
        expect(s.cols).toBeGreaterThanOrEqual(1);
        expect(s.rows).toBeGreaterThanOrEqual(1);
        expect(s.cols).toBeLessThanOrEqual(free.cols);
        expect(s.rows).toBeLessThanOrEqual(free.rows);
      }
    }
  });

  it("a taller panel lets a tall image grow past a 2-wide cap", () => {
    // A 1-wide panel with 4 rows and a 1:2 (tall) image: 1 wide needs ceil(1/0.5)=2
    // rows, so 1x2. Widen isn't possible (1 col), height is the only axis.
    expect(suggestSnappetSize(0.5, { cols: 1, rows: 4 })).toEqual({ cols: 1, rows: 2 });
  });

  it("degenerate aspect (0, NaN, Infinity) is treated as square", () => {
    expect(suggestSnappetSize(0, sidePanel)).toEqual({ cols: 2, rows: 2 });
    expect(suggestSnappetSize(Number.NaN, sidePanel)).toEqual({ cols: 2, rows: 2 });
    expect(suggestSnappetSize(Infinity, sidePanel)).toEqual({ cols: 2, rows: 2 });
  });
});

describe("panelSnappetPlacement", () => {
  // The school SIDE panels are 2 wide x 8 tall; this is the geometry the size
  // asymmetry (portrait tall, landscape compact) is designed around.
  it("PORTRAIT art → a TALL snappet anchored at the panel's top-left free cell", () => {
    const placement = panelSnappetPlacement(ctx(), "wing-left", 2 / 3);
    expect(placement).not.toBeNull();
    expect(placement!.span).toEqual({ cols: 2, rows: 3 });
    // Top-most, left-most cell of the left panel (the top-left corner).
    const anchor = schoolGrid.coordOf(placement!.anchorSlotId)!;
    expect(anchor.row).toBe(0);
    expect(anchor.col).toBe(0);
  });

  it("LANDSCAPE art → a COMPACT snappet in the same panel (the geometric asymmetry)", () => {
    const landscape = panelSnappetPlacement(ctx(), "wing-left", 16 / 9);
    const portrait = panelSnappetPlacement(ctx(), "wing-left", 2 / 3);
    expect(landscape!.span).toEqual({ cols: 2, rows: 2 });
    // A portrait is strictly taller than a landscape in the same panel.
    expect(portrait!.span.rows).toBeGreaterThan(landscape!.span.rows);
  });

  it("the result always fits the panel and passes canPlace", () => {
    for (const aspect of [0.1, 2 / 3, 1, 4 / 3, 16 / 9, 5]) {
      const placement = panelSnappetPlacement(ctx(), "wing-right", aspect)!;
      const anchor = schoolGrid.coordOf(placement.anchorSlotId)!;
      // Every covered cell is a real cell of the SAME (right) panel — no overhang,
      // no plate — and the placement is legal.
      for (const c of occupiedCoords(anchor, placement.span)) {
        expect(schoolGrid.panelAt(c.row, c.col)).toBe("wing-right");
      }
      expect(canPlace(ctx(), anchor, placement.span, placement.anchorSlotId).ok).toBe(true);
    }
  });

  it("anchors BELOW existing art rather than on top of it", () => {
    // Seed a 2x2 at the top of the left panel; new art lands under it.
    const slots: Record<string, PlacedTile> = {
      [schoolGrid.cellAt(0, 0)!.id]: tile("a", { cols: 2, rows: 2 }),
    };
    const placement = panelSnappetPlacement(ctx({ slots }), "wing-left", 2 / 3)!;
    const anchor = schoolGrid.coordOf(placement.anchorSlotId)!;
    expect(anchor.row).toBe(2); // first free row below the 2x2
    // …and it fits the remaining 6 rows without crossing the panel or plate.
    expect(canPlace(ctx({ slots }), anchor, placement.span, placement.anchorSlotId).ok).toBe(true);
  });

  it("returns null when the panel is completely full", () => {
    const slots: Record<string, PlacedTile> = {
      // One 2x8 snappet fills the entire left panel.
      [schoolGrid.cellAt(0, 0)!.id]: tile("a", { cols: 2, rows: 8 }),
    };
    expect(panelSnappetPlacement(ctx({ slots }), "wing-left", 1)).toBeNull();
  });

  it("with allowEvict, still places on a FULL panel (evicting) instead of refusing", () => {
    const slots: Record<string, PlacedTile> = {
      // The whole left panel is full (a 2x8 snappet).
      [schoolGrid.cellAt(0, 0)!.id]: tile("a", { cols: 2, rows: 8 }),
    };
    const placement = panelSnappetPlacement(ctx({ slots }), "wing-left", 2 / 3, { allowEvict: true });
    expect(placement).not.toBeNull();
    // Anchors at the panel's top-left cell; the placement is seatable — it evicts the
    // tile(s) it covers, exactly like dragging a snappet onto an occupied area.
    const anchor = schoolGrid.coordOf(placement!.anchorSlotId)!;
    expect(anchor).toEqual({ row: 0, col: 0 });
    expect(canPlace(ctx({ slots }), anchor, placement!.span, placement!.anchorSlotId).ok).toBe(true);
  });
});

describe("anchorIdFor", () => {
  it("resolves a NON-anchor cell of a snappet back to the record that owns it", () => {
    const slots: Record<string, PlacedTile> = {
      "frame:wing-left-2": tile("a", { cols: 2, rows: 1 }), // covers frame:left-1
    };
    expect(anchorIdFor(slots, schoolGrid, "frame:left-1")).toBe("frame:wing-left-2");
    expect(anchorIdFor(slots, schoolGrid, "frame:wing-left-2")).toBe("frame:wing-left-2");
    expect(anchorIdFor(slots, schoolGrid, "frame:top-0")).toBeNull();
  });

  it("is a pure lookup for an all-1x1 design (the /build fast path)", () => {
    const slots: Record<string, PlacedTile> = { "frame:top-0": tile("a") };
    expect(anchorIdFor(slots, schoolGrid, "frame:top-0")).toBe("frame:top-0");
    expect(anchorIdFor(slots, schoolGrid, "frame:top-1")).toBeNull();
  });
});

describe("spanLadder", () => {
  it("lists the preferred span first, then every smaller one by area", () => {
    expect(spanLadder({ cols: 2, rows: 2 })).toEqual([
      { cols: 2, rows: 2 }, // 4
      { cols: 2, rows: 1 }, // 2 — wider wins the tie
      { cols: 1, rows: 2 }, // 2
      { cols: 1, rows: 1 }, // 1
    ]);
  });

  it("always ends at 1x1, and a 1x1 preference is just itself", () => {
    for (const span of [{ cols: 1, rows: 1 }, { cols: 3, rows: 2 }, { cols: 2, rows: 4 }]) {
      const ladder = spanLadder(span);
      expect(ladder[0]).toEqual(span);
      expect(ladder.at(-1)).toEqual({ cols: 1, rows: 1 });
    }
    expect(spanLadder({ cols: 1, rows: 1 })).toEqual([{ cols: 1, rows: 1 }]);
  });
});

describe("resolveSnappetDrop — auto-sizing a palette drag", () => {
  // The top banner is a single row, so a 2x2 cannot seat there.
  const topInner = "frame:top-5";

  it("sizes square art to the PANEL, so a wider wing yields a bigger tile", () => {
    // Default school frame: the side panel is 2 wide (wing column + inner rail),
    // so square art wants 2x2 there.
    const twoWide = resolveSnappetDrop(ctx(), {
      overSlotId: schoolGrid.cellAt(2, 0)!.id,
      span: { cols: 2, rows: 2 },
      shrinkToFit: true,
      growToPanel: true,
    })!;
    expect(twoWide.valid).toBe(true);
    expect({ cols: twoWide.cols, rows: twoWide.rows }).toEqual({ cols: 2, rows: 2 });

    // Widen the wings and the SAME piece should grow to fill the wider panel.
    const wideCfg = { ...SCHOOL_FRAME_CONFIG, wingColumns: SCHOOL_FRAME_CONFIG.wingColumns + 1 };
    const wideGrid = buildGrid(wideCfg);
    const wideCtx: PlacementContext = {
      grid: wideGrid,
      slots: noSlots,
      sections: noSections,
      barCovered: noBars,
    };
    const anchor = wideGrid.cellAt(2, 0)!;
    const panelCols = wideGrid.slots.filter(
      (s) => wideGrid.panelAt(s.row, s.col) === wideGrid.panelAt(2, 0),
    );
    const width =
      Math.max(...panelCols.map((s) => s.col)) - Math.min(...panelCols.map((s) => s.col)) + 1;
    expect(width).toBe(3); // sanity: the wing really did get wider

    const threeWide = resolveSnappetDrop(wideCtx, {
      overSlotId: anchor.id,
      span: { cols: 2, rows: 2 }, // same piece, same 'square' hint
      shrinkToFit: true,
      growToPanel: true,
    })!;
    expect(threeWide.valid).toBe(true);
    expect({ cols: threeWide.cols, rows: threeWide.rows }).toEqual({ cols: 3, rows: 3 });
  });

  it("keeps square art at 1x1 in a one-row banner", () => {
    // Art renders at its NATIVE aspect with background filling the rest, so a 2x1
    // box would show the art at exactly the same size as 1x1 and simply waste a
    // cell of background. Maximising art area — not box area — is the rule.
    const drop = resolveSnappetDrop(ctx(), {
      overSlotId: topInner,
      span: { cols: 2, rows: 2 },
      shrinkToFit: true,
      growToPanel: true,
    })!;
    expect(drop.valid).toBe(true);
    expect({ cols: drop.cols, rows: drop.rows }).toEqual({ cols: 1, rows: 1 });
  });

  it("shrinks below the panel size when a cell is genuinely BLOCKED", () => {
    // Note an overlapping TILE would not shrink anything — overlap is legal here and
    // simply evicts. A text bar is a hard block, so it really does force a smaller
    // footprint: covering the rail column means the 2-wide candidates are refused and
    // the drag falls to the 1-wide column it can still have.
    const barCovered = new Set([schoolGrid.cellAt(3, 1)!.id]);
    const drop = resolveSnappetDrop(ctx({ barCovered }), {
      overSlotId: schoolGrid.cellAt(3, 0)!.id,
      span: { cols: 2, rows: 2 },
      shrinkToFit: true,
      growToPanel: true,
    })!;
    expect(drop.valid).toBe(true);
    expect(drop.cols).toBe(1);
    expect(drop.cols * drop.rows).toBeLessThan(4);
  });

  it("does NOT auto-size without the flags — a MOVE keeps the user's size", () => {
    const drop = resolveSnappetDrop(ctx(), {
      overSlotId: topInner,
      span: { cols: 2, rows: 2 },
    })!;
    expect(drop.valid).toBe(false);
    expect({ cols: drop.cols, rows: drop.rows }).toEqual({ cols: 2, rows: 2 });
  });
});

describe("panelSnappetPlacement — uploaded photos size to the panel too", () => {
  const wideGrid = buildGrid({
    ...SCHOOL_FRAME_CONFIG,
    wingColumns: SCHOOL_FRAME_CONFIG.wingColumns + 1,
  });

  it("grows a square photo from 2x2 to 3x3 when the wing widens", () => {
    const narrow = panelSnappetPlacement(ctx(), "wing-left", 1)!;
    expect(narrow.span).toEqual({ cols: 2, rows: 2 });

    const wide = panelSnappetPlacement(
      { grid: wideGrid, slots: noSlots, sections: noSections, barCovered: noBars },
      "wing-left",
      1,
    )!;
    expect(wide.span).toEqual({ cols: 3, rows: 3 });
  });

  it("lands a PORTRAIT photo taller than a square one in the same panel", () => {
    const portrait = panelSnappetPlacement(ctx(), "wing-left", 0.5)!; // 1:2
    const square = panelSnappetPlacement(ctx(), "wing-left", 1)!;
    expect(portrait.span.rows).toBeGreaterThan(square.span.rows);
  });
});

describe("MIN_ART_SPAN — badges never shrink below 2x2", () => {
  it("floors real artwork at 2x2 but exempts plain and calibration tiles", () => {
    expect(minSpanFor({ defaultSpan: { cols: 2, rows: 2 } })).toEqual(MIN_ART_SPAN);
    // A plain 1x1 (a solid colour block) has no detail to lose.
    expect(minSpanFor({})).toEqual({ cols: 1, rows: 1 });
    // A calibration tile means its exact footprint, which may be below the floor.
    expect(minSpanFor({ defaultSpan: { cols: 2, rows: 1 }, spanRequired: true })).toEqual({
      cols: 1,
      rows: 1,
    });
    expect(minSpanFor(undefined)).toEqual({ cols: 1, rows: 1 });
  });

  it("spanLadder never proposes anything under the floor", () => {
    const ladder = spanLadder({ cols: 3, rows: 3 }, MIN_ART_SPAN);
    expect(ladder.every((s) => s.cols >= 2 && s.rows >= 2)).toBe(true);
    expect(ladder).toContainEqual({ cols: 2, rows: 2 });
    expect(ladder).not.toContainEqual({ cols: 1, rows: 1 });
  });

  it("returns the floor itself rather than an empty ladder when the floor exceeds the preference", () => {
    expect(spanLadder({ cols: 1, rows: 1 }, MIN_ART_SPAN)).toEqual([MIN_ART_SPAN]);
  });

  it("a drop keeps a badge at 2x2 where the panel would have suggested 1x1", () => {
    // The one-row top banner suggests 1x1 for square art; the floor overrides that,
    // and since a 2x2 cannot seat in a single row the drop is refused rather than
    // silently placing something unreadable.
    const drop = resolveSnappetDrop(ctx(), {
      overSlotId: "frame:top-5",
      span: { cols: 2, rows: 2 },
      shrinkToFit: true,
      growToPanel: true,
      minSpan: MIN_ART_SPAN,
    })!;
    expect(drop.cols).toBeGreaterThanOrEqual(2);
    expect(drop.rows).toBeGreaterThanOrEqual(2);
  });

  it("still seats a badge at 2x2 in the side panel", () => {
    const drop = resolveSnappetDrop(ctx(), {
      overSlotId: schoolGrid.cellAt(2, 0)!.id,
      span: { cols: 2, rows: 2 },
      shrinkToFit: true,
      growToPanel: true,
      minSpan: MIN_ART_SPAN,
    })!;
    expect(drop.valid).toBe(true);
    expect({ cols: drop.cols, rows: drop.rows }).toEqual({ cols: 2, rows: 2 });
  });
});

describe("growUndersizedBadges — a floor introduced later still reaches saved tiles", () => {
  const artMin = (pieceId: string): TileSpan =>
    pieceId.startsWith("hs:") ? MIN_ART_SPAN : { cols: 1, rows: 1 };

  it("grows a 1x1 badge saved before the floor existed", () => {
    const slots: Record<string, PlacedTile> = {
      [schoolGrid.cellAt(2, 0)!.id]: { pieceId: "hs:basketball-patch", setId: "hs" },
    };
    const out = growUndersizedBadges(ctx({ slots }), artMin);
    expect(out[schoolGrid.cellAt(2, 0)!.id].span).toEqual(MIN_ART_SPAN);
  });

  it("leaves a piece whose floor is already 1x1 completely alone", () => {
    const slots: Record<string, PlacedTile> = {
      [schoolGrid.cellAt(2, 0)!.id]: { pieceId: "school:solid-navy", setId: "school" },
    };
    expect(growUndersizedBadges(ctx({ slots }), artMin)).toBe(slots); // same object
  });

  it("REFUSES to grow when doing so would evict a neighbour", () => {
    // Growing must never silently delete work. A badge boxed in by neighbours stays
    // small rather than eating them.
    const slots: Record<string, PlacedTile> = {
      [schoolGrid.cellAt(2, 0)!.id]: { pieceId: "hs:basketball-patch", setId: "hs" },
      [schoolGrid.cellAt(2, 1)!.id]: { pieceId: "school:solid-gold", setId: "school" },
      [schoolGrid.cellAt(3, 0)!.id]: { pieceId: "school:solid-gold", setId: "school" },
    };
    const out = growUndersizedBadges(ctx({ slots }), artMin);
    expect(out[schoolGrid.cellAt(2, 0)!.id].span).toBeUndefined(); // untouched
  });

  it("refuses where the bigger footprint is simply illegal", () => {
    // The top strip is one row: a 2x2 cannot seat, so the badge is left as it is
    // rather than being forced somewhere it does not fit.
    const slots: Record<string, PlacedTile> = {
      "frame:top-5": { pieceId: "hs:basketball-patch", setId: "hs" },
    };
    const out = growUndersizedBadges(ctx({ slots }), artMin);
    expect(out["frame:top-5"].span).toBeUndefined();
  });
});

describe("minSpanFor — the floor belongs to the BUILDER, not the piece", () => {
  const plain = { defaultSpan: undefined, spanRequired: undefined };
  const art = { defaultSpan: { cols: 2, rows: 2 }, spanRequired: undefined };
  const calibration = { defaultSpan: { cols: 3, rows: 1 }, spanRequired: true };

  it("still floors at 1x1 with no builder floor — /build is untouched", () => {
    expect(minSpanFor(plain)).toEqual({ cols: 1, rows: 1 });
    expect(minSpanFor(null)).toEqual({ cols: 1, rows: 1 });
  });

  it("lifts a PLAIN piece to the builder's floor", () => {
    // The bug: only pieces carrying `defaultSpan` were ever lifted, and nothing but
    // Becky's artwork carries it — so every solid, icon and photo landed 1x1.
    expect(minSpanFor(plain, MIN_ART_SPAN)).toEqual({ cols: 2, rows: 2 });
  });

  it("applies the builder's floor to the LONG axis, keeping the art's shape", () => {
    // This used to be a per-axis max, which read as "take the larger of the two"
    // and asserted {3,1} over a 2x2 piece gives {3,2}. That is what deleted every
    // portrait tile: per-axis max against the SQUARE {2,2} floor turns a {1,2}
    // badge into {2,2}, so nothing could ever seat at the footprint it declared.
    // The floor now sets the minimum long axis and the piece keeps its own aspect.
    expect(minSpanFor(art, { cols: 3, rows: 1 })).toEqual({ cols: 3, rows: 3 });
    expect(minSpanFor(art, { cols: 1, rows: 1 })).toEqual(MIN_ART_SPAN);
  });

  it("leaves a non-square badge non-square", () => {
    const tall = { defaultSpan: { cols: 1, rows: 2 }, spanRequired: undefined };
    const wide = { defaultSpan: { cols: 2, rows: 1 }, spanRequired: undefined };
    expect(minSpanFor(tall, MIN_ART_SPAN)).toEqual({ cols: 1, rows: 2 });
    expect(minSpanFor(wide, MIN_ART_SPAN)).toEqual({ cols: 2, rows: 1 });
  });

  it("never pushes a spanRequired calibration tile around", () => {
    expect(minSpanFor(calibration, MIN_ART_SPAN)).toEqual({ cols: 1, rows: 1 });
  });
});

describe("blockFill — Fill All / Random lay real footprints", () => {
  const pick = () => ({ pieceId: "high-school:basketball", setId: "high-school" });

  it("produces NO 1x1 badges when asked for 2x2 blocks", () => {
    // The original defect: both actions wrote one cell at a time with no span, so a
    // floor could never help them — a floor bounds shrinking, and they never asked
    // for a footprint at all.
    const slots = blockFill(ctx(), pick, MIN_ART_SPAN);
    expect(Object.keys(slots).length).toBeGreaterThan(0);
    for (const t of Object.values(slots)) {
      expect(tileSpan(t)).toEqual({ cols: 2, rows: 2 });
    }
  });

  it("never overlaps two blocks", () => {
    const slots = blockFill(ctx(), pick, MIN_ART_SPAN);
    const seen = new Set<string>();
    for (const [id, t] of Object.entries(slots)) {
      const anchor = schoolGrid.coordOf(id)!;
      for (const c of occupiedCoords(anchor, tileSpan(t))) {
        const key = `${c.row}:${c.col}`;
        expect(seen.has(key)).toBe(false);
        seen.add(key);
      }
    }
  });

  it("never covers the plate hole", () => {
    const slots = blockFill(ctx(), pick, MIN_ART_SPAN);
    for (const [id, t] of Object.entries(slots)) {
      const anchor = schoolGrid.coordOf(id)!;
      for (const c of occupiedCoords(anchor, tileSpan(t))) {
        expect(schoolGrid.isPlate(c.row, c.col)).toBe(false);
      }
    }
  });

  it("leaves a panel held by a TEXT banner completely alone", () => {
    const withText = ctx({ sections: { bottom: { mode: "text" as const } } as PlacementContext["sections"] });
    const slots = blockFill(withText, pick, MIN_ART_SPAN);
    for (const id of Object.keys(slots)) {
      const c = schoolGrid.coordOf(id)!;
      expect(schoolGrid.panelAt(c.row, c.col)).not.toBe("bottom");
    }
  });

  it("treats the span as a FLOOR, not a fixed size — blocks grow to the panel", () => {
    // Not "1x1 in, 1x1 out": blockFill sizes each block to the panel it sits in and
    // uses the argument as the minimum. /build never reaches here at all — its fill
    // short-circuits to the original per-slot loop, which is what keeps that
    // product byte-identical.
    const slots = blockFill(ctx(), pick, { cols: 1, rows: 1 });
    expect(Object.keys(slots).length).toBeGreaterThan(0);
    for (const t of Object.values(slots)) {
      const s = tileSpan(t);
      expect(s.cols).toBeGreaterThanOrEqual(1);
      expect(s.rows).toBeGreaterThanOrEqual(1);
    }
  });

  it("calls pick once per BLOCK, so Random varies by block not by cell", () => {
    const seenIndexes: number[] = [];
    const slots = blockFill(
      ctx(),
      (i) => {
        seenIndexes.push(i);
        return { pieceId: `p${i}`, setId: "s" };
      },
      MIN_ART_SPAN,
    );
    expect(seenIndexes).toEqual(seenIndexes.map((_, i) => i)); // 0,1,2,… no gaps
    expect(seenIndexes.length).toBe(Object.keys(slots).length);
  });
});

describe("panelSnappetPlacement — an uploaded photo is not a thumbnail", () => {
  it("floors an upload at the builder's span instead of shrinking to 1x1", () => {
    const withFloor = panelSnappetPlacement(ctx(), "wing-left", 1, {
      allowEvict: true,
      minSpan: MIN_ART_SPAN,
    });
    expect(withFloor).not.toBeNull();
    expect(withFloor!.span.cols).toBeGreaterThanOrEqual(2);
    expect(withFloor!.span.rows).toBeGreaterThanOrEqual(2);
  });

  it("still falls back where the floor genuinely cannot seat", () => {
    // The top strip is ONE row — a 2x2 cannot go there, and refusing the upload
    // outright would be worse than seating it smaller.
    const placed = panelSnappetPlacement(ctx(), "top", 1, {
      allowEvict: true,
      minSpan: MIN_ART_SPAN,
    });
    if (placed) expect(placed.span.rows).toBe(1);
  });
});

describe("dropUnknownPieces — a retired piece leaves no ghost", () => {
  const known = (id: string) => id === "hs:basketball-patch";

  it("removes a tile whose piece no longer exists", () => {
    const slots = {
      a: { pieceId: "hs:basketball-patch", setId: "hs" },
      b: { pieceId: "school:star", setId: "school" }, // retired placeholder
    };
    const out = dropUnknownPieces(slots, known);
    expect(Object.keys(out)).toEqual(["a"]);
  });

  it("returns the SAME object when every piece still resolves", () => {
    const slots = { a: { pieceId: "hs:basketball-patch", setId: "hs" } };
    expect(dropUnknownPieces(slots, known)).toBe(slots);
  });

  it("never purges an uploaded photo — it has no catalogue piece by design", () => {
    const slots = {
      a: { pieceId: UPLOAD_PIECE_ID, setId: UPLOAD_SET_ID, image: { url: "blob:x" } },
    };
    expect(dropUnknownPieces(slots, known)).toBe(slots);
  });
});

describe("blockFill — no holes, nothing off the frame", () => {
  const pick = () => ({ pieceId: "hs:basketball-patch", setId: "hs" });
  const wide = getWingFrameConfig(
    { ...SCHOOL_FRAME_CONFIG },
    SCHOOL_FRAME_CONFIG.tileSizeInches * 2,
  );

  /** Every cell a fill covers, and whether any of them is off the grid. */
  function coverage(cfg: typeof SCHOOL_FRAME_CONFIG) {
    const grid = buildGrid(cfg);
    const slots = blockFill(
      { grid, slots: {}, sections: {}, barCovered: new Set() },
      pick,
      MIN_ART_SPAN,
    );
    const covered = new Set<string>();
    let offGrid = 0;
    const sizes = new Set<string>();
    for (const [id, t] of Object.entries(slots)) {
      const anchor = grid.coordOf(id)!;
      const span = tileSpan(t);
      sizes.add(`${span.cols}x${span.rows}`);
      for (const c of occupiedCoords(anchor, span)) {
        covered.add(`${c.row}:${c.col}`);
        if (!grid.cellAt(c.row, c.col)) offGrid++;
      }
    }
    return { grid, covered, offGrid, sizes };
  }

  it("leaves NO hole in a side panel at either width", () => {
    for (const cfg of [SCHOOL_FRAME_CONFIG, wide]) {
      const { grid, covered } = coverage(cfg);
      const holes = grid.slots.filter(
        (s) =>
          !grid.isPlate(s.row, s.col) &&
          String(grid.panelAt(s.row, s.col)).startsWith("wing") &&
          !covered.has(`${s.row}:${s.col}`),
      );
      expect(holes, `wing holes at wingColumns=${cfg.wingColumns}`).toEqual([]);
    }
  });

  it("never lays a block off the frame", () => {
    // canPlace allows overhang for a placement made by hand. An automatic fill must
    // not use it: art pushed past the edge is invisible and prints nothing.
    for (const cfg of [SCHOOL_FRAME_CONFIG, wide]) {
      expect(coverage(cfg).offGrid).toBe(0);
    }
  });

  it("sizes blocks to the PANEL, so a wider side panel gets wider badges", () => {
    // A fixed 2x2 tiles a two-wide panel exactly and a three-wide one not at all —
    // it leaves a single column running the whole height.
    expect([...coverage(SCHOOL_FRAME_CONFIG).sizes]).toEqual(["2x2"]);
    const widened = [...coverage(wide).sizes];
    expect(widened.some((s) => s.startsWith("3x"))).toBe(true);
  });

  it("still refuses to go below the floor", () => {
    for (const cfg of [SCHOOL_FRAME_CONFIG, wide]) {
      for (const s of coverage(cfg).sizes) {
        const [c, r] = s.split("x").map(Number);
        expect(c).toBeGreaterThanOrEqual(MIN_ART_SPAN.cols);
        expect(r).toBeGreaterThanOrEqual(MIN_ART_SPAN.rows);
      }
    }
  });
});
