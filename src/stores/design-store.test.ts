import { describe, it, expect, beforeEach, vi } from "vitest";
import type { FrameConfig, PlacedTile } from "@/lib/types";
import { DEFAULT_FRAME_CONFIG, SCHOOL_FRAME_CONFIG, MAX_HISTORY_DEPTH } from "@/lib/constants/frame";
import { getAllSlotIds, buildGrid } from "@/lib/utils/slot-generator";
import { migrateSchoolDesign } from "@/lib/utils/school-migration";

// The store's removeTile frees an uploaded snappet's IndexedDB full-res blob. Mock
// the image store so the test can assert that deletion without a real IndexedDB
// (the node test env has none) — every function is a spy that no-ops.
vi.mock("@/lib/utils/image-store", () => ({
  putFullRes: vi.fn(async () => {}),
  getFullRes: vi.fn(async () => null),
  deleteFullRes: vi.fn(async () => {}),
}));
import { deleteFullRes } from "@/lib/utils/image-store";

// ─── localStorage stub ────────────────────────────────────────────────────────
// The vitest environment is `node`, so there is no localStorage. persist reads it
// synchronously during store construction, which is the whole point of the
// hydration tests below — stub it before creating any store.
class MemoryStorage {
  private map = new Map<string, string>();
  getItem(k: string) { return this.map.get(k) ?? null; }
  setItem(k: string, v: string) { this.map.set(k, v); }
  removeItem(k: string) { this.map.delete(k); }
  clear() { this.map.clear(); }
  key(i: number) { return Array.from(this.map.keys())[i] ?? null; }
  get length() { return this.map.size; }
}
const memoryStorage = new MemoryStorage();
Object.defineProperty(globalThis, "localStorage", {
  value: memoryStorage,
  writable: true,
  configurable: true,
});
// The store's storage factory THROWS when there is no `window` (that is how it opts
// out of persistence during SSR), so without this stub persist is disabled and the
// hydration tests below would pass vacuously.
Object.defineProperty(globalThis, "window", {
  value: globalThis,
  writable: true,
  configurable: true,
});

// Imported AFTER the stub so module-level `defaultDesignStore` construction (which
// hydrates) sees a working storage rather than throwing into the guard.
const { createDesignStore } = await import("./design-store");

/** Fill every slot of a config with a marker tile whose pieceId IS its slot id. */
function fillAllSlots(config: FrameConfig): Record<string, PlacedTile> {
  const slots: Record<string, PlacedTile> = {};
  for (const id of getAllSlotIds(config)) {
    slots[id] = { pieceId: id, setId: "test" };
  }
  return slots;
}

let storeSeq = 0;
/** A fresh store on a unique persist key so tests can't bleed into each other. */
function makeStore(frameConfig?: FrameConfig) {
  return createDesignStore(`test-key-${storeSeq++}`, frameConfig ? { frameConfig } : {});
}

beforeEach(() => memoryStorage.clear());

// ─────────────────────────────────────────────────────────────────────────────
describe("mirrorTopSlots", () => {
  /**
   * The invariant, stated once: after a mirror, every cell in the right half holds
   * the art of its reflection in the left half. Checking it over the GRID rather
   * than over a hand-listed set of zones is what makes the test able to fail on a
   * zone the implementation forgot — which is exactly how the bottom-row bug hid.
   */
  function expectMirrored(config: FrameConfig, slots: Record<string, PlacedTile>) {
    const grid = buildGrid(config);
    for (const slot of grid.slots) {
      const mirrorCol = grid.cols - 1 - slot.col;
      if (mirrorCol <= slot.col) continue;
      const target = grid.cellAt(slot.row, mirrorCol);
      if (!target) continue;
      expect(
        slots[target.id]?.pieceId,
        `(${slot.row},${slot.col}) ${slot.id} -> (${slot.row},${mirrorCol}) ${target.id}`
      ).toBe(slots[slot.id]?.pieceId);
    }
  }

  it("mirrors EVERY cell of the school frame, including the second bottom row", () => {
    const store = makeStore(SCHOOL_FRAME_CONFIG);
    store.getState().loadDesign({
      frameConfig: SCHOOL_FRAME_CONFIG,
      slots: fillAllSlots(SCHOOL_FRAME_CONFIG),
      textBars: [],
    });
    store.getState().mirrorTopSlots();
    expectMirrored(SCHOOL_FRAME_CONFIG, store.getState().slots);
  });

  it("mirrors the school frame's extra bottom row specifically (bottom-13 -> bottom-22)", () => {
    // The regression that motivated the grid rewrite: `bottomHalf` was computed from
    // bottomSlots alone, so indices bottomSlots.. (the second row) were untouched.
    const bs = SCHOOL_FRAME_CONFIG.bottomSlots;
    expect(SCHOOL_FRAME_CONFIG.bottomRows).toBe(2);

    const store = makeStore(SCHOOL_FRAME_CONFIG);
    store.getState().loadDesign({
      frameConfig: SCHOOL_FRAME_CONFIG,
      slots: {
        [`frame:bottom-${bs + 1}`]: { pieceId: "mascot", setId: "test" },
        // Stale art on the right half must be OVERWRITTEN, not left behind.
        [`frame:bottom-${bs + bs - 2}`]: { pieceId: "stale", setId: "test" },
      },
      textBars: [],
    });
    store.getState().mirrorTopSlots();

    const after = store.getState().slots;
    expect(after[`frame:bottom-${bs + bs - 2}`]?.pieceId).toBe("mascot");
  });

  it("clears the mirror target when the source cell is empty", () => {
    const store = makeStore(SCHOOL_FRAME_CONFIG);
    const bs = SCHOOL_FRAME_CONFIG.bottomSlots;
    store.getState().loadDesign({
      frameConfig: SCHOOL_FRAME_CONFIG,
      slots: { [`frame:bottom-${bs + bs - 2}`]: { pieceId: "stale", setId: "test" } },
      textBars: [],
    });
    store.getState().mirrorTopSlots();
    expect(store.getState().slots[`frame:bottom-${bs + bs - 2}`]).toBeUndefined();
  });

  it("/build regression gate: mirrors exactly the pairs the per-zone code did", () => {
    const cfg = DEFAULT_FRAME_CONFIG;
    const store = makeStore();
    store.getState().loadDesign({
      frameConfig: cfg,
      slots: fillAllSlots(cfg),
      textBars: [],
    });
    store.getState().mirrorTopSlots();
    const after = store.getState().slots;

    // The exact pairs the ORIGINAL zone loops produced, spelled out independently
    // of buildGrid so this gate can't be satisfied by a wrong grid.
    for (let i = 0; i < Math.floor(cfg.topSlots / 2); i++) {
      expect(after[`frame:top-${cfg.topSlots - 1 - i}`]?.pieceId).toBe(`frame:top-${i}`);
    }
    for (let i = 0; i < Math.floor(cfg.bottomSlots / 2); i++) {
      expect(after[`frame:bottom-${cfg.bottomSlots - 1 - i}`]?.pieceId).toBe(`frame:bottom-${i}`);
    }
    for (let i = 0; i < Math.min(cfg.leftSlots, cfg.rightSlots); i++) {
      expect(after[`frame:right-${i}`]?.pieceId).toBe(`frame:left-${i}`);
    }
    // The odd centre column is a self-mirror: it must be left exactly as it was.
    const centre = Math.floor(cfg.topSlots / 2);
    expect(after[`frame:top-${centre}`]?.pieceId).toBe(`frame:top-${centre}`);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("store-owned frame geometry (single-SKU builders)", () => {
  const KEY = "festive-frames-school-test";

  /** Write a v7 persisted blob the way zustand's persist middleware would. */
  function writeBlob(state: Record<string, unknown>, version = 7) {
    memoryStorage.setItem(KEY, JSON.stringify({ state, version }));
  }

  it("hydrates a returning school user's design INSTEAD OF blanking it", () => {
    // The defect: SchoolDesigner's mount effect called loadDesign({slots:{}}) after
    // hydration, replacing the restored design with an empty one and persisting it.
    writeBlob({
      slots: { "frame:top-0": { pieceId: "eagle", setId: "mascots" } },
      textBars: [{ id: "tb1", config: { text: "Go Eagles" } }],
      designName: "Lincoln High",
      frameConfig: { ...SCHOOL_FRAME_CONFIG },
    });

    const store = createDesignStore(KEY, {
      frameConfig: SCHOOL_FRAME_CONFIG,
      migrateExtra: migrateSchoolDesign,
    });

    const s = store.getState();
    expect(s.slots["frame:top-0"]?.pieceId).toBe("eagle");
    expect(s.textBars).toHaveLength(1);
    expect(s.designName).toBe("Lincoln High");
  });

  it("refreshes stale persisted geometry to the store's owned config", () => {
    // A blob saved under the OLD 3-wing-column school frame. The design survives;
    // the unprintable geometry does not.
    writeBlob({
      slots: { "frame:top-0": { pieceId: "eagle", setId: "mascots" } },
      frameConfig: { ...SCHOOL_FRAME_CONFIG, wingColumns: 3, widthInches: 11.892 },
    });

    const store = createDesignStore(KEY, {
      frameConfig: SCHOOL_FRAME_CONFIG,
      migrateExtra: migrateSchoolDesign,
    });

    expect(store.getState().frameConfig.wingColumns).toBe(SCHOOL_FRAME_CONFIG.wingColumns);
    expect(store.getState().frameConfig).toEqual(SCHOOL_FRAME_CONFIG);
    expect(store.getState().slots["frame:top-0"]?.pieceId).toBe("eagle");
  });

  it("uses the owned config as initial state for a brand-new visitor", () => {
    const store = createDesignStore("festive-frames-school-fresh", {
      frameConfig: SCHOOL_FRAME_CONFIG,
    });
    expect(store.getState().frameConfig).toEqual(SCHOOL_FRAME_CONFIG);
    expect(store.getState().slots).toEqual({});
  });

  it("keeps the owned config when loadDesign restores a payload saved on an old frame", () => {
    const store = makeStore(SCHOOL_FRAME_CONFIG);
    store.getState().loadDesign({
      frameConfig: { ...SCHOOL_FRAME_CONFIG, wingColumns: 3 },
      slots: {},
      textBars: [],
    });
    expect(store.getState().frameConfig.wingColumns).toBe(SCHOOL_FRAME_CONFIG.wingColumns);
  });

  it("/build regression gate: a store with no owned config is unchanged", () => {
    const store = makeStore();
    expect(store.getState().frameConfig).toEqual(DEFAULT_FRAME_CONFIG);
    // loadDesign still honours the payload's frameConfig on /build.
    const custom = { ...DEFAULT_FRAME_CONFIG, topSlots: 11 };
    store.getState().loadDesign({ frameConfig: custom, slots: {}, textBars: [] });
    expect(store.getState().frameConfig.topSlots).toBe(11);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Multi-cell snappets in the STORE. Stage 2 adds the data model only: nothing in
// the UI produces a span yet, so the first block proves the 1x1 paths still land
// on exactly today's result, and the second drives spans in by hand.
describe("snappet spans", () => {
  it("/build regression gate: 1x1 place/move/remove are unchanged", () => {
    const store = makeStore();
    const s = () => store.getState();

    s().placeTile("frame:top-0", "essentials:red", "essentials");
    // No span field is written for an ordinary tile — the persisted shape is the
    // same two-key record /build has always stored.
    expect(s().slots["frame:top-0"]).toEqual({ pieceId: "essentials:red", setId: "essentials" });

    s().placeTile("frame:top-1", "essentials:blue", "essentials");
    s().moveTile("frame:top-0", "frame:top-1"); // drop onto an occupied cell replaces it
    expect(s().slots["frame:top-0"]).toBeUndefined();
    expect(s().slots["frame:top-1"].pieceId).toBe("essentials:red");

    s().removeTile("frame:top-1");
    expect(s().slots["frame:top-1"]).toBeUndefined();
    // Removing an empty cell is still a no-op (no spurious history entry).
    const before = s().history.length;
    s().removeTile("frame:top-5");
    expect(s().history.length).toBe(before);
  });

  it("places a 2-wide snappet across the wing/rail boundary and evicts what it covers", () => {
    const store = makeStore(SCHOOL_FRAME_CONFIG);
    const s = () => store.getState();
    s().placeTile("frame:left-1", "old", "test"); // (2,1) — about to be covered
    s().placeTile("frame:wing-left-2", "banner", "test", { cols: 2, rows: 1 }); // (2,0)+(2,1)

    expect(s().slots["frame:wing-left-2"].span).toEqual({ cols: 2, rows: 1 });
    expect(s().slots["frame:left-1"]).toBeUndefined(); // evicted, not layered under
  });

  it("refuses a footprint that would cover the plate", () => {
    const store = makeStore(SCHOOL_FRAME_CONFIG);
    const s = () => store.getState();
    s().placeTile("frame:left-1", "wide", "test", { cols: 2, rows: 1 }); // (2,1)+(2,2)=plate
    expect(s().slots["frame:left-1"]).toBeUndefined();
  });

  it("removeTile resolves a COVERED cell back to its anchor", () => {
    const store = makeStore(SCHOOL_FRAME_CONFIG);
    const s = () => store.getState();
    s().placeTile("frame:wing-left-2", "banner", "test", { cols: 2, rows: 1 });
    // The user clicks the remove affordance on the snappet's right-hand cell.
    s().removeTile("frame:left-1");
    expect(s().slots["frame:wing-left-2"]).toBeUndefined();
  });

  it("moveTile carries the span across and never collides with itself", () => {
    const store = makeStore(SCHOOL_FRAME_CONFIG);
    const s = () => store.getState();
    s().placeTile("frame:wing-left-2", "banner", "test", { cols: 2, rows: 1 });
    s().moveTile("frame:wing-left-2", "frame:wing-left-3"); // (3,0)+(3,1)
    expect(s().slots["frame:wing-left-2"]).toBeUndefined();
    expect(s().slots["frame:wing-left-3"].span).toEqual({ cols: 2, rows: 1 });
    // …and a move onto the plate is refused outright.
    s().moveTile("frame:wing-left-3", "frame:left-2");
    expect(s().slots["frame:wing-left-3"]).toBeDefined();
  });

  it("refuses a footprint that reaches UNDER a text bar", () => {
    // The defect: only the ANCHOR was tested against the bar-covered ids, so a
    // wide snappet anchored just outside the bar slid underneath it — and
    // clearCoveredTiles, matching on anchor keys, could never evict it again.
    const store = makeStore(SCHOOL_FRAME_CONFIG);
    const s = () => store.getState();
    // A single-char bar measures to width 3; placed at column 2 it covers
    // frame:top-2/3/4 — all inside the TOP panel. (The default text is much wider.)
    s().updateBottomBar({ text: "X" });
    s().placeTextBar("top", 2);
    expect(s().textBars[0].startIndex).toBe(2);

    // Anchor frame:top-1 (0,2) is a FREE top-panel cell; the tail frame:top-2 (0,3)
    // is under the bar. Both cells are the TOP panel, so only the bar can refuse it.
    s().placeTile("frame:top-1", "p1", "s1", { cols: 2, rows: 1 });
    expect(s().slots["frame:top-1"]).toBeUndefined();
  });

  it("a bar dropped over a snappet's NON-anchor cells evicts the snappet", () => {
    const store = makeStore(SCHOOL_FRAME_CONFIG);
    const s = () => store.getState();
    s().updateBottomBar({ text: "X" }); // width-3 bar
    // A 3-wide snappet along the TOP panel, anchored at frame:top-1 (0,2), covering
    // frame:top-1/2/3 (all one panel, so the placement is legal).
    s().placeTile("frame:top-1", "p1", "s1", { cols: 3, rows: 1 });
    expect(s().slots["frame:top-1"]).toBeDefined();

    // The bar lands on frame:top-2/3/4 — the snappet's NON-anchor cells. Its anchor
    // key (top-1) is never bar-covered, so only expanding the span lets
    // clearCoveredTiles find and evict the whole snappet.
    s().placeTextBar("top", 2);
    expect(s().textBars[0].startIndex).toBe(2);
    expect(s().slots["frame:top-1"]).toBeUndefined();
  });

  it("MIRRORS a snappet's footprint rather than translating its anchor", () => {
    // The defect: the span was copied verbatim to the POINT reflection of the
    // anchor (cols-1-col), so a 2-wide tile at col 0 landed at col 13 and hung
    // half off the 14-column frame. The true reflection anchors at cols-col-w.
    const store = makeStore(SCHOOL_FRAME_CONFIG);
    const s = () => store.getState();
    const grid = buildGrid(SCHOOL_FRAME_CONFIG);

    s().placeTile("frame:wing-left-2", "mascot", "test", { cols: 2, rows: 1 });
    const src = grid.coordOf("frame:wing-left-2")!;
    expect(src).toEqual({ row: 2, col: 0 });

    s().mirrorTopSlots();

    // cols(14) - col(0) - span(2) = 12 → frame:right-1, covering cols 12..13.
    const expected = grid.cellAt(2, grid.cols - src.col - 2)!;
    expect(expected.id).toBe("frame:right-1");
    expect(s().slots[expected.id]).toEqual({
      pieceId: "mascot",
      setId: "test",
      span: { cols: 2, rows: 1 },
    });
    // …and NOT at the old point reflection, where it would have overhung the frame.
    expect(s().slots[grid.cellAt(2, grid.cols - 1 - src.col)!.id]).toBeUndefined();
  });

  it("mirror never seats a footprint the builder itself would refuse", () => {
    // mirrorTopSlots used to write straight into newSlots with no canPlace call,
    // so a reflection could land on the plate hole / a suppressed zone — the one
    // write path that bypassed every rule the other paths enforce.
    const store = makeStore(SCHOOL_FRAME_CONFIG);
    const s = () => store.getState();
    const grid = buildGrid(SCHOOL_FRAME_CONFIG);

    s().placeTile("frame:wing-left-2", "mascot", "test", { cols: 2, rows: 1 });
    // The reflection anchors at col 12 (frame:right-1) and covers col 13, which is
    // the wing-right section. Flip that section out of tile mode and the whole
    // footprint must be refused — not half-printed over a direct-print panel.
    s().setSectionMode("wing-right", "image");
    s().mirrorTopSlots();

    const dest = grid.cellAt(2, grid.cols - 2)!; // frame:right-1
    expect(s().slots[dest.id]).toBeUndefined();
    expect(s().slots["frame:wing-left-2"]).toBeDefined(); // source is untouched
  });

  // ─── resizeTile (Stage 8) ──────────────────────────────────────────────────
  it("resizeTile REJECTS a grow across a panel boundary / over the plate", () => {
    const store = makeStore(SCHOOL_FRAME_CONFIG);
    const s = () => store.getState();
    s().placeTile("frame:left-1", "x", "test"); // (2,1), one cell left of the plate
    // Widen right → col 2 is the plate. Rejected, so the tile stays a plain 1x1.
    s().resizeTile("frame:left-1", { cols: 2, rows: 1 });
    expect(s().slots["frame:left-1"]).toEqual({ pieceId: "x", setId: "test" });
  });

  it("resizeTile grows a snappet, evicting an overlapped snappet WHOLE", () => {
    const store = makeStore(SCHOOL_FRAME_CONFIG);
    const s = () => store.getState();
    s().placeTile("frame:bottom-1", "a", "test"); // (6,2)
    s().placeTile("frame:bottom-2", "b", "test", { cols: 2, rows: 1 }); // (6,3)+(6,4)
    // Grow A to 2x2 → covers (6,3), B's anchor → the whole B footprint is evicted.
    s().resizeTile("frame:bottom-1", { cols: 2, rows: 2 });
    expect(s().slots["frame:bottom-1"].span).toEqual({ cols: 2, rows: 2 });
    expect(s().slots["frame:bottom-2"]).toBeUndefined();
  });

  it("resizeTile shrink frees the covered cells and drops the span (1x1-normalized)", () => {
    const store = makeStore(SCHOOL_FRAME_CONFIG);
    const s = () => store.getState();
    s().placeTile("frame:bottom-1", "a", "test", { cols: 2, rows: 2 }); // covers 3 more cells
    const grid = buildGrid(SCHOOL_FRAME_CONFIG);
    // Before: three cells hidden under the snappet.
    s().resizeTile("frame:bottom-1", { cols: 1, rows: 1 });
    // The span field is gone entirely — the ordinary two-key record is restored.
    expect(s().slots["frame:bottom-1"]).toEqual({ pieceId: "a", setId: "test" });
    // A cell that WAS covered is free again: dropping a tile there stands on its own.
    const freed = grid.cellAt(6, 3)!.id; // (6,3), previously under the 2x2
    s().placeTile(freed, "c", "test");
    expect(s().slots[freed]).toEqual({ pieceId: "c", setId: "test" });
    expect(s().slots["frame:bottom-1"]).toEqual({ pieceId: "a", setId: "test" }); // untouched
  });

  it("resizeTile is ONE undoable step — undo restores the prior span", () => {
    const store = makeStore(SCHOOL_FRAME_CONFIG);
    const s = () => store.getState();
    s().placeTile("frame:bottom-1", "a", "test", { cols: 2, rows: 1 });
    s().resizeTile("frame:bottom-1", { cols: 2, rows: 2 });
    expect(s().slots["frame:bottom-1"].span).toEqual({ cols: 2, rows: 2 });
    s().undo();
    expect(s().slots["frame:bottom-1"].span).toEqual({ cols: 2, rows: 1 });
    s().redo();
    expect(s().slots["frame:bottom-1"].span).toEqual({ cols: 2, rows: 2 });
  });

  it("resizeTile to the SAME span is a no-op (no redundant history entry)", () => {
    const store = makeStore(SCHOOL_FRAME_CONFIG);
    const s = () => store.getState();
    s().placeTile("frame:bottom-1", "a", "test", { cols: 2, rows: 1 });
    s().resizeTile("frame:bottom-1", { cols: 2, rows: 2 }); // a real edit
    const beforeLen = s().history.length;
    // Committing the identical span (drag out-and-back, or a click without movement)
    // must NOT record a new snapshot — otherwise the first undo below would restore a
    // visually identical state and only the SECOND would revert the real 2x2 edit.
    s().resizeTile("frame:bottom-1", { cols: 2, rows: 2 });
    expect(s().history.length).toBe(beforeLen);
    s().undo(); // the very next undo reverts the real edit, not a phantom no-op
    expect(s().slots["frame:bottom-1"].span).toEqual({ cols: 2, rows: 1 });
  });

  it("resizeTile on a missing / 1x1-only design is inert (/build shape)", () => {
    const store = makeStore(); // /build config, no snappets anywhere
    const s = () => store.getState();
    s().placeTile("frame:top-0", "essentials:red", "essentials");
    const before = s().history.length;
    // Resizing a slot that holds no tile is a true no-op (no history entry).
    s().resizeTile("frame:top-9", { cols: 2, rows: 1 });
    expect(s().history.length).toBe(before);
    // And a 1x1→1x1 resize never writes a span onto the /build record.
    s().resizeTile("frame:top-0", { cols: 1, rows: 1 });
    expect(s().slots["frame:top-0"]).toEqual({ pieceId: "essentials:red", setId: "essentials" });
  });

  it("fillEmpty leaves snappet-COVERED cells alone", () => {
    const store = makeStore(SCHOOL_FRAME_CONFIG);
    const s = () => store.getState();
    s().placeTile("frame:wing-left-2", "banner", "test", { cols: 2, rows: 1 });
    s().fillEmpty([{ pieceId: "filler", setId: "test" }]);
    // frame:left-1 sits UNDER the snappet — filler there would be invisible,
    // double-counted in the parts list, and deleted the moment the snappet moved.
    expect(s().slots["frame:left-1"]).toBeUndefined();
    expect(s().slots["frame:left-0"].pieceId).toBe("filler"); // uncovered cells do fill
  });

  it("a plain tile in a snappet's SUPPRESSED footprint doesn't destroy the snappet", () => {
    // Regression: the store resolved snappet coverage from the RAW slots while
    // FrameCanvas resolved it from the VISIBLE anchors. A snappet anchored in a
    // section switched to text/image paints nothing, so its footprint cells in a
    // still-tiled zone render as ordinary empty, clickable cells — but the store
    // still saw them as covered, so tapping/dragging a plain tile onto one
    // silently deleted the hidden snappet with no on-screen cause. Coverage now
    // comes from the same visible view both sides draw from, so there is exactly
    // ONE owner of a cell.
    const store = makeStore(SCHOOL_FRAME_CONFIG);
    const s = () => store.getState();
    const grid = buildGrid(SCHOOL_FRAME_CONFIG);

    // A 2x2 anchored in the LEFT wing that reaches into the (still-tiled) bottom rail.
    s().placeTile("frame:wing-left-6", "mascot", "test", { cols: 2, rows: 2 });
    const anchor = grid.coordOf("frame:wing-left-6")!;
    const footprintCell = grid.cellAt(anchor.row, anchor.col + 1)!; // (row, col+1)
    expect(footprintCell.zone).toBe("bottom"); // outside the wing-left section
    expect(s().slots["frame:wing-left-6"].span).toEqual({ cols: 2, rows: 2 });

    // Hide the LEFT panel: the anchor is suppressed, so the snappet paints nothing
    // and its bottom-rail cell renders as a normal empty cell.
    s().setSectionMode("wing-left", "image");

    // (1) TAP a plain tile onto that cell — placeTile's 1x1 branch.
    s().placeTile(footprintCell.id, "plain", "test");
    expect(s().slots["frame:wing-left-6"]).toBeDefined(); // snappet survives
    expect(s().slots["frame:wing-left-6"].span).toEqual({ cols: 2, rows: 2 });
    expect(s().slots[footprintCell.id]).toEqual({ pieceId: "plain", setId: "test" });

    // (2) DRAG a plain tile onto the OTHER suppressed footprint cell — moveTile's
    //     1x1 branch had the identical bug.
    const footprintCell2 = grid.cellAt(anchor.row + 1, anchor.col + 1)!; // (row+1, col+1)
    s().placeTile("frame:top-5", "dragme", "test");
    s().moveTile("frame:top-5", footprintCell2.id);
    expect(s().slots["frame:wing-left-6"]).toBeDefined(); // still survives
    expect(s().slots[footprintCell2.id]).toEqual({ pieceId: "dragme", setId: "test" });

    // (3) fillEmpty must not skip those cells as "covered" — with the anchor hidden
    //     they are genuinely empty and paintable. (Both footprint cells are now
    //     occupied by the two tiles above, so seed a fresh store to check the third.)
    const store2 = makeStore(SCHOOL_FRAME_CONFIG);
    const t = () => store2.getState();
    t().placeTile("frame:wing-left-6", "mascot", "test", { cols: 2, rows: 2 });
    t().setSectionMode("wing-left", "image");
    t().fillEmpty([{ pieceId: "filler", setId: "test" }]);
    expect(t().slots[footprintCell.id]).toBeDefined(); // filled, not skipped
    expect(t().slots["frame:wing-left-6"]).toBeDefined(); // and the snappet is untouched
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Uploaded art is a SNAPPET (Stage 10). One system: an upload enters `slots` as a
// tile carrying `image`, sized by suggestSnappetSize, and rides the same
// drag/resize/remove engine as any snappet.
describe("placeImageSnappet (uploaded art as a snappet)", () => {
  const grid = buildGrid(SCHOOL_FRAME_CONFIG);
  const anchorId = grid.cellAt(0, 0)!.id; // top-left of the LEFT panel

  it("PORTRAIT art lands as a TALL snappet at the panel's top-left free cell", () => {
    const store = makeStore(SCHOOL_FRAME_CONFIG);
    store.getState().placeImageSnappet("wing-left", {
      imageUrl: "data:img/preview",
      fullResId: "fr-portrait",
      sourceAspect: 2 / 3,
    });
    const tile = store.getState().slots[anchorId];
    expect(tile.pieceId).toBe("upload");
    expect(tile.image).toEqual({ url: "data:img/preview", fullResId: "fr-portrait" });
    expect(tile.span).toEqual({ cols: 2, rows: 3 }); // tall
  });

  it("LANDSCAPE art lands COMPACT (2x2) — the geometric size asymmetry", () => {
    const store = makeStore(SCHOOL_FRAME_CONFIG);
    store.getState().placeImageSnappet("wing-left", {
      imageUrl: "data:img/land",
      sourceAspect: 16 / 9,
    });
    const tile = store.getState().slots[anchorId];
    expect(tile.span).toEqual({ cols: 2, rows: 2 }); // compact
    expect(tile.image?.url).toBe("data:img/land");
    // fullResId is optional — absent when IndexedDB was unavailable at upload.
    expect(tile.image?.fullResId).toBeUndefined();
  });

  it("an image-snappet round-trips through resizeTile keeping its image", () => {
    const store = makeStore(SCHOOL_FRAME_CONFIG);
    const s = () => store.getState();
    s().placeImageSnappet("wing-left", { imageUrl: "data:keep", fullResId: "fr1", sourceAspect: 2 / 3 });
    // Grow to fill the panel — art stays.
    s().resizeTile(anchorId, { cols: 2, rows: 4 });
    expect(s().slots[anchorId].span).toEqual({ cols: 2, rows: 4 });
    expect(s().slots[anchorId].image).toEqual({ url: "data:keep", fullResId: "fr1" });
    // Shrink back to 1x1 — the span field is dropped, the image survives.
    s().resizeTile(anchorId, { cols: 1, rows: 1 });
    expect(s().slots[anchorId].span).toBeUndefined();
    expect(s().slots[anchorId].image).toEqual({ url: "data:keep", fullResId: "fr1" });
  });

  it("an image-snappet round-trips through moveTile keeping its image", () => {
    const store = makeStore(SCHOOL_FRAME_CONFIG);
    const s = () => store.getState();
    s().placeImageSnappet("wing-left", { imageUrl: "data:move", fullResId: "fr2", sourceAspect: 16 / 9 });
    const toId = grid.cellAt(2, 0)!.id; // two rows down, still the left panel
    s().moveTile(anchorId, toId);
    expect(s().slots[anchorId]).toBeUndefined(); // left the source
    expect(s().slots[toId].image).toEqual({ url: "data:move", fullResId: "fr2" });
    expect(s().slots[toId].span).toEqual({ cols: 2, rows: 2 });
  });

  it("removing an image-snappet DEFERS full-res cleanup so undo can restore the print original", () => {
    // Defect: removeTile eagerly deleted the IndexedDB blob, so an undo restored a
    // tile whose full-res original was already gone forever (only the low-res preview
    // survived, masking the loss). Cleanup is now tied to REACHABILITY: the blob must
    // live while the removal is still one undo away.
    vi.mocked(deleteFullRes).mockClear();
    const store = makeStore(SCHOOL_FRAME_CONFIG);
    const s = () => store.getState();
    s().placeImageSnappet("wing-left", { imageUrl: "data:del", fullResId: "fr-del", sourceAspect: 1 });
    // Remove via a COVERED cell (not the anchor) — the anchor resolves either way.
    const coveredCell = grid.cellAt(1, 0)!.id;
    s().removeTile(coveredCell);
    expect(s().slots[anchorId]).toBeUndefined();
    // NOT deleted yet — it is still restorable.
    expect(deleteFullRes).not.toHaveBeenCalled();
    // Undo brings the snappet back pointing at the SAME full-res id, intact.
    s().undo();
    expect(s().slots[anchorId]?.image).toEqual({ url: "data:del", fullResId: "fr-del" });
  });

  it("GCs an image-snappet's full-res blob once its removal falls out of history", () => {
    // The other half of the contract: a blob no reachable state can restore is freed
    // (no leak). Once the last snapshot that still references the id is shifted off
    // the capped history, it becomes unreachable and is deleted.
    vi.mocked(deleteFullRes).mockClear();
    const store = makeStore(SCHOOL_FRAME_CONFIG);
    const s = () => store.getState();
    s().placeImageSnappet("wing-left", { imageUrl: "data:gc", fullResId: "fr-gc", sourceAspect: 1 });
    s().removeTile(anchorId);
    expect(deleteFullRes).not.toHaveBeenCalled();
    // Push enough distinct edits to shift the placement snapshot (the last one that
    // still holds fr-gc) off the front of the MAX_HISTORY_DEPTH-capped history.
    for (let i = 0; i < MAX_HISTORY_DEPTH + 2; i++) s().updateBottomBar({ text: `n${i}` });
    expect(deleteFullRes).toHaveBeenCalledWith("fr-gc");
  });

  it("eviction of an image-snappet also defers cleanup (undo restores it — no leak, no loss)", () => {
    // Defect 2: the eviction paths deleted an overlapped anchor via `delete newSlots[id]`
    // without ever freeing its blob (a leak), and eager-freeing it would have lost the
    // original on undo. Reachability GC fixes both: the displaced image survives to be
    // undone, and is GC'd only once unreachable.
    vi.mocked(deleteFullRes).mockClear();
    const store = makeStore(SCHOOL_FRAME_CONFIG);
    const s = () => store.getState();
    s().placeImageSnappet("wing-left", { imageUrl: "data:a", fullResId: "fr-a", sourceAspect: 1 });
    expect(s().slots[anchorId]?.image?.fullResId).toBe("fr-a");
    // Drop a set-piece snappet over the anchor → the image-snappet is EVICTED.
    s().placeTile(anchorId, "cover", "test", { cols: 2, rows: 1 });
    expect(s().slots[anchorId]?.image).toBeUndefined(); // displaced by the cover tile
    expect(deleteFullRes).not.toHaveBeenCalled(); // deferred — undo can bring A back
    s().undo();
    expect(s().slots[anchorId]?.image).toEqual({ url: "data:a", fullResId: "fr-a" });
  });

  it("resizeTile can REPLACE the image atomically (the re-crop commit) in one undoable step", () => {
    // The re-crop flow resizes an image-snappet to a new aspect AND swaps in freshly
    // cropped art. The store applies both in one history entry; the old id is left to
    // the reachability GC (still restorable via undo until it ages out).
    vi.mocked(deleteFullRes).mockClear();
    const store = makeStore(SCHOOL_FRAME_CONFIG);
    const s = () => store.getState();
    s().placeImageSnappet("wing-left", { imageUrl: "data:old", fullResId: "fr-old", sourceAspect: 2 / 3 });
    expect(s().slots[anchorId].span).toEqual({ cols: 2, rows: 3 });
    // Re-crop to a wider footprint with new art.
    s().resizeTile(anchorId, { cols: 2, rows: 2 }, { url: "data:new", fullResId: "fr-new" });
    expect(s().slots[anchorId].span).toEqual({ cols: 2, rows: 2 });
    expect(s().slots[anchorId].image).toEqual({ url: "data:new", fullResId: "fr-new" });
    expect(deleteFullRes).not.toHaveBeenCalled(); // fr-old still restorable via undo
    s().undo();
    expect(s().slots[anchorId].image).toEqual({ url: "data:old", fullResId: "fr-old" });
    expect(s().slots[anchorId].span).toEqual({ cols: 2, rows: 3 });
  });

  it("removing an ordinary set-piece tile does NOT touch the image store", () => {
    vi.mocked(deleteFullRes).mockClear();
    const store = makeStore(SCHOOL_FRAME_CONFIG);
    const s = () => store.getState();
    s().placeTile("frame:top-5", "essentials:red", "essentials");
    s().removeTile("frame:top-5");
    expect(deleteFullRes).not.toHaveBeenCalled();
  });

  it("/build regression: a tile with no image serializes as the two-field record", () => {
    // The unifying `image` field is OPT-IN: an ordinary placement never sets it, so
    // the persisted shape is byte-identical to before Stage 10.
    const store = makeStore(); // /build config
    store.getState().placeTile("frame:top-0", "essentials:red", "essentials");
    expect(store.getState().slots["frame:top-0"]).toEqual({
      pieceId: "essentials:red",
      setId: "essentials",
    });
    expect("image" in store.getState().slots["frame:top-0"]).toBe(false);
  });
});
