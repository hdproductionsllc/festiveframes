import { describe, it, expect } from "vitest";
import {
  generateSlots,
  getAllSlotIds,
  buildGrid,
  wingRowCount,
  wingSlotIndex,
  gridInvariantHolds,
} from "./slot-generator";
import {
  DEFAULT_FRAME_CONFIG,
  SCHOOL_CLASSIC_FRAME_CONFIG,
  SCHOOL_FRAME_CONFIG,
  getTotalWidthInches,
  getRenderHeightInches,
} from "@/lib/constants/frame";

// ─── /build REGRESSION GATE ──────────────────────────────────
//
// The multi-cell snappet work is staged, and every stage must leave the LIVE
// consumer builder byte-identical. These are the assertions to run at each stage
// boundary. If one of these fails, /build has changed — stop.

describe("/build regression gate", () => {
  it("generates exactly 36 slots (the 13x7 ring)", () => {
    const slots = generateSlots(DEFAULT_FRAME_CONFIG, 1000);
    // 13 top + 13 bottom + 5 left + 5 right, no wings
    expect(slots).toHaveLength(36);
    expect(slots.filter((s) => s.zone === "wing-left")).toHaveLength(0);
    expect(slots.filter((s) => s.zone === "wing-right")).toHaveLength(0);
  });

  it("slot ids are stable", () => {
    const ids = getAllSlotIds(DEFAULT_FRAME_CONFIG);
    expect(ids).toHaveLength(36);
    expect(ids[0]).toBe("frame:top-0");
    expect(ids[12]).toBe("frame:top-12");
    expect(ids[13]).toBe("frame:bottom-0");
    expect(ids).toContain("frame:left-4");
    expect(ids).toContain("frame:right-4");
  });

  it("slot px geometry is stable", () => {
    const slots = generateSlots(DEFAULT_FRAME_CONFIG, 1000);
    const top0 = slots.find((s) => s.id === "frame:top-0")!;
    // No wings => no offset; top rail starts flush at the origin.
    expect(top0.x).toBeCloseTo(0, 10);
    expect(top0.y).toBe(0);
    // 13 gapless tiles across the full container width.
    expect(top0.width).toBeCloseTo(1000 / 13, 10);

    const top12 = slots.find((s) => s.id === "frame:top-12")!;
    expect(top12.x + top12.width).toBeCloseTo(1000, 8);
  });

  it("has no extra bottom rows and no full-width top bar", () => {
    expect(DEFAULT_FRAME_CONFIG.bottomRows).toBeUndefined();
    expect(DEFAULT_FRAME_CONFIG.fullWidthTopBar).toBeUndefined();
    expect(DEFAULT_FRAME_CONFIG.wings).toBe(false);
  });
});

// ─── The grid invariant ──────────────────────────────────────

describe("grid invariant", () => {
  it("holds for /build", () => {
    expect(gridInvariantHolds(DEFAULT_FRAME_CONFIG)).toBe(true);
  });

  it("holds for the school frame (it did NOT before the widthInches fix)", () => {
    expect(gridInvariantHolds(SCHOOL_FRAME_CONFIG)).toBe(true);
  });

  it("catches a config whose rails would not be gapless", () => {
    // The old school config: widthInches 12 with 12 slots of 0.991" tiles.
    expect(gridInvariantHolds({ ...SCHOOL_FRAME_CONFIG, widthInches: 12 })).toBe(false);
  });

  it("rail steps equal the tile pitch, so tiles butt edge to edge", () => {
    for (const config of [DEFAULT_FRAME_CONFIG, SCHOOL_FRAME_CONFIG]) {
      const slots = generateSlots(config, 1400);
      const top = slots.filter((s) => s.zone === "top").sort((a, b) => a.index - b.index);
      for (let i = 1; i < top.length; i++) {
        // Each tile starts exactly where the previous one ended.
        expect(top[i].x).toBeCloseTo(top[i - 1].x + top[i - 1].width, 6);
      }
    }
  });
});

// ─── The unified (row, col) grid ─────────────────────────────

describe("buildGrid", () => {
  it("/build is a 13 x 7 lattice", () => {
    const grid = buildGrid(DEFAULT_FRAME_CONFIG);
    expect(grid.cols).toBe(13);
    expect(grid.rows).toBe(7);
  });

  it("lattice size equals the frame's physical extent in tiles", () => {
    // Independent cross-check: the grid is derived from slot INDICES, this
    // derives it from INCHES. They must agree, or the lattice doesn't describe
    // the frame it claims to. Stage-independent — true before and after the
    // wing trim, which is exactly what makes it worth asserting.
    for (const config of [DEFAULT_FRAME_CONFIG, SCHOOL_FRAME_CONFIG]) {
      const grid = buildGrid(config);
      const tile = config.tileSizeInches;
      expect(grid.cols).toBe(Math.round(getTotalWidthInches(config) / tile));
      expect(grid.rows).toBe(Math.round(getRenderHeightInches(config) / tile));
    }
  });

  it("round-trips every slot id through coordOf -> cellAt", () => {
    for (const config of [DEFAULT_FRAME_CONFIG, SCHOOL_FRAME_CONFIG]) {
      const grid = buildGrid(config);
      for (const slot of grid.slots) {
        const coord = grid.coordOf(slot.id);
        expect(coord).not.toBeNull();
        expect(grid.cellAt(coord!.row, coord!.col)?.id).toBe(slot.id);
      }
    }
  });

  it("assigns every slot a unique coordinate (no two slots share a cell)", () => {
    for (const config of [DEFAULT_FRAME_CONFIG, SCHOOL_FRAME_CONFIG]) {
      const grid = buildGrid(config);
      const seen = new Set(grid.slots.map((s) => `${s.row}:${s.col}`));
      expect(seen.size).toBe(grid.slots.length);
    }
  });

  it("grid coords agree with the px positions they were derived alongside", () => {
    // The row/col are computed from loop indices, NOT from rounding px. This
    // asserts the two derivations describe the same lattice.
    for (const config of [DEFAULT_FRAME_CONFIG, SCHOOL_FRAME_CONFIG]) {
      const grid = buildGrid(config, 1400);
      const tile = grid.slots[0].width;
      for (const slot of grid.slots) {
        expect(slot.x / tile).toBeCloseTo(slot.col, 6);
        expect(slot.y / tile).toBeCloseTo(slot.row, 6);
      }
    }
  });

  it("the plate hole is exactly the set of coordinates with no slot", () => {
    // The real invariant, and non-circular: isPlate() is computed from config
    // arithmetic while cellAt() is populated from generated slots. If the ring
    // and the hole ever disagree, a snappet could be placed over the plate.
    for (const config of [DEFAULT_FRAME_CONFIG, SCHOOL_FRAME_CONFIG]) {
      const grid = buildGrid(config);
      for (let row = 0; row < grid.rows; row++) {
        for (let col = 0; col < grid.cols; col++) {
          expect(grid.isPlate(row, col)).toBe(grid.cellAt(row, col) === null);
        }
      }
    }
  });

  it("the plate hole is a solid rectangle one tile inside the ring", () => {
    const grid = buildGrid(SCHOOL_FRAME_CONFIG);
    const holes = [];
    for (let row = 0; row < grid.rows; row++) {
      for (let col = 0; col < grid.cols; col++) {
        if (grid.isPlate(row, col)) holes.push({ row, col });
      }
    }
    const rows = holes.map((h) => h.row);
    const cols = holes.map((h) => h.col);
    const minRow = Math.min(...rows), maxRow = Math.max(...rows);
    const minCol = Math.min(...cols), maxCol = Math.max(...cols);
    // Solid — no gaps in the rectangle.
    expect(holes).toHaveLength((maxRow - minRow + 1) * (maxCol - minCol + 1));
    // Inset by exactly one tile from the ring on all four sides.
    expect(minRow).toBe(1);
    expect(maxRow).toBe(SCHOOL_FRAME_CONFIG.leftSlots);
    expect(minCol).toBe(SCHOOL_FRAME_CONFIG.wingColumns + 1);
    expect(maxCol).toBe(grid.cols - SCHOOL_FRAME_CONFIG.wingColumns - 2);
  });

  it("treats off-lattice coords as outside (legal snappet overhang)", () => {
    const grid = buildGrid(SCHOOL_FRAME_CONFIG);
    expect(grid.isOutside(-1, 0)).toBe(true);
    expect(grid.isOutside(0, -1)).toBe(true);
    expect(grid.isOutside(grid.rows, 0)).toBe(true);
    expect(grid.isOutside(0, grid.cols)).toBe(true);
    expect(grid.isOutside(0, 0)).toBe(false);
    // Outside is not plate — overhang is allowed, covering the plate is not.
    expect(grid.isPlate(-1, 0)).toBe(false);
  });
});

// ─── wingRowCount ────────────────────────────────────────────

describe("wingRowCount", () => {
  it("is 9 for the school frame (1 top corner + 6 window rows + 2 bottom)", () => {
    // The two store copies of this computed `leftSlots + 1` = 7, silently
    // dropping the top corner and the extra bottom row.
    expect(wingRowCount(SCHOOL_FRAME_CONFIG)).toBe(9);
    expect(wingRowCount(SCHOOL_FRAME_CONFIG)).not.toBe(SCHOOL_FRAME_CONFIG.leftSlots + 1);
  });

  it("reduces to leftSlots + 1 when both flags are off", () => {
    expect(wingRowCount(DEFAULT_FRAME_CONFIG)).toBe(DEFAULT_FRAME_CONFIG.leftSlots + 1);
  });

  it("matches the number of rows actually generated per wing column", () => {
    const slots = generateSlots(SCHOOL_FRAME_CONFIG, 1000);
    const wingLeft = slots.filter((s) => s.zone === "wing-left");
    expect(wingLeft).toHaveLength(SCHOOL_FRAME_CONFIG.wingColumns * wingRowCount(SCHOOL_FRAME_CONFIG));
  });
});

// ─── Physical fit on the eufyMake E1 bed ─────────────────────

describe("eufyMake E1 bed fit", () => {
  const BED_LONG = 16.5;
  const BED_SHORT = 13;

  it("the 3-column frame we trimmed FROM fit the bed in no orientation", () => {
    // Why the wings were trimmed to one column, kept as a historical fact — the
    // live config has moved on. Reconstructed from the CLASSIC geometry, which is
    // the one that was trimmed.
    const threeColumn = {
      ...SCHOOL_CLASSIC_FRAME_CONFIG,
      wingColumns: 3,
      wingWidthInches: 3 * SCHOOL_CLASSIC_FRAME_CONFIG.tileSizeInches,
    };
    const w = getTotalWidthInches(threeColumn);
    expect(w).toBeCloseTo(17.838, 3);
    // Wider than the bed's LONG side, so no rotation could save it.
    expect(w).toBeGreaterThan(BED_LONG);
  });

  it("the school frame keeps its 1-column wings — now the side CANTILEVER", () => {
    expect(SCHOOL_FRAME_CONFIG.wingColumns).toBe(1);
    expect(SCHOOL_FRAME_CONFIG.wingWidthInches).toBeCloseTo(
      SCHOOL_FRAME_CONFIG.tileSizeInches,
      10
    );
  });

  it("the printed extent is 15.856in x 8.919in and fits the bed", () => {
    // THE PRINTED EXTENT, cantilever included — the whole 16 x 9 lattice. This is
    // what has to fit the bed if the frame is ever laid out as one sheet, and it
    // still does, in the same rotation as before.
    expect(getTotalWidthInches(SCHOOL_FRAME_CONFIG)).toBeCloseTo(15.856, 3);
    expect(getRenderHeightInches(SCHOOL_FRAME_CONFIG)).toBeCloseTo(8.919, 3);
    expect(getTotalWidthInches(SCHOOL_FRAME_CONFIG)).toBeLessThanOrEqual(BED_LONG);
    expect(getRenderHeightInches(SCHOOL_FRAME_CONFIG)).toBeLessThanOrEqual(BED_SHORT);
  });

  it("the RAIL — the part Bill 3D-prints — is still 13.874in x 7.928in", () => {
    // The structure did not move when the window opened up. Only the cantilever is
    // new, and it hangs over air. `widthInches`/`heightInches` are the inner frame,
    // which IS the rail: the wings and the extra bottom row are the overhang.
    expect(SCHOOL_FRAME_CONFIG.widthInches).toBeCloseTo(13.874, 3);
    expect(SCHOOL_FRAME_CONFIG.heightInches).toBeCloseTo(7.928, 3);
  });

  it("the school frame is a 16 x 9 lattice with a 12 x 6 window", () => {
    const grid = buildGrid(SCHOOL_FRAME_CONFIG);
    expect(grid.cols).toBe(16);
    expect(grid.rows).toBe(9);

    const plate: Array<[number, number]> = [];
    for (let row = 0; row < grid.rows; row++) {
      for (let col = 0; col < grid.cols; col++) if (grid.isPlate(row, col)) plate.push([row, col]);
    }
    // 12 x 6 — the plate opening, at last. The classic frame's was 10 x 5.
    expect(plate).toHaveLength(72);
    expect(Math.min(...plate.map(([, c]) => c))).toBe(2);
    expect(Math.max(...plate.map(([, c]) => c))).toBe(13);
    expect(Math.min(...plate.map(([r]) => r))).toBe(1);
    expect(Math.max(...plate.map(([r]) => r))).toBe(6);
  });

  it("the WINDOW is within a hair of the 12in x 6in plate it has to clear", () => {
    const c = SCHOOL_FRAME_CONFIG;
    // 12 and 6 cells of the gapless lattice. Fractionally under the plate on each
    // axis, which is correct: the rail must overlap the plate's edge to hold it.
    expect(12 * c.tileSizeInches).toBeCloseTo(11.892, 3);
    expect(6 * c.tileSizeInches).toBeCloseTo(5.946, 3);
    expect(12 * c.tileSizeInches).toBeLessThan(c.plateWidthInches);
    expect(6 * c.tileSizeInches).toBeLessThan(c.plateHeightInches);
    // …and by well under a tenth of an inch, so the frame sits on the plate's
    // margin rather than across its face. The classic frame covered 1.045" a side.
    expect(c.plateWidthInches - 12 * c.tileSizeInches).toBeLessThan(0.12);
    expect(c.plateHeightInches - 6 * c.tileSizeInches).toBeLessThan(0.06);
  });

  it("the CLASSIC frame it replaced covered an inch of the plate on each side", () => {
    // The defect, pinned so nobody reintroduces it by widening a side panel again.
    const grid = buildGrid(SCHOOL_CLASSIC_FRAME_CONFIG);
    const cols = new Set<number>();
    const rows = new Set<number>();
    for (let row = 0; row < grid.rows; row++) {
      for (let col = 0; col < grid.cols; col++) {
        if (grid.isPlate(row, col)) { cols.add(col); rows.add(row); }
      }
    }
    expect(cols.size).toBe(10);
    expect(rows.size).toBe(5);
    const overlapPerSide =
      (SCHOOL_CLASSIC_FRAME_CONFIG.plateWidthInches -
        cols.size * SCHOOL_CLASSIC_FRAME_CONFIG.tileSizeInches) / 2;
    expect(overlapPerSide).toBeCloseTo(1.045, 3);
  });
});

// ─── wingSlotIndex ───────────────────────────────────────────

describe("wingSlotIndex", () => {
  it("round-trips every generated wing slot id", () => {
    const slots = generateSlots(SCHOOL_FRAME_CONFIG, 1000);
    const wings = slots.filter((s) => s.zone === "wing-left" || s.zone === "wing-right");
    expect(wings.length).toBeGreaterThan(0);
    for (const slot of wings) {
      expect(wingSlotIndex(slot.id)).toBe(slot.index);
    }
  });

  it("returns null for non-wing ids instead of a misleading 0", () => {
    expect(wingSlotIndex("frame:top-3")).toBeNull();
    expect(wingSlotIndex("frame:bottom-11")).toBeNull();
    expect(wingSlotIndex("frame:wing-left-")).toBeNull();
    expect(wingSlotIndex("frame:wing-left-2a")).toBeNull();
  });
});
