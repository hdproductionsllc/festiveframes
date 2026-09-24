import { describe, it, expect, beforeEach, vi } from "vitest";
import { SCHOOL_SHIPPING_VARIANT, schoolVariant } from "@/data/school-variants";
import { getSchoolKit, kitSections } from "@/data/school-kits";
import { kitSeedTiles } from "@/data/kit-seed";
import type { FrameConfig, PlacedTile } from "@/lib/types";
import {
  DEFAULT_FRAME_CONFIG,
  SCHOOL_FLUSH_FRAME_CONFIG,
  SCHOOL_FRAME_CONFIG as SCHOOL_FRAME_WITH_SQUARE_RULE,
  MAX_HISTORY_DEPTH,
} from "@/lib/constants/frame";
import { badgeSpots, snappetInches, tileSpan } from "@/lib/utils/snappet";
import { getAllSlotIds, buildGrid } from "@/lib/utils/slot-generator";
import { MAX_UPLOADS } from "@/lib/utils/uploads";
import { UPLOAD_RIGHTS_VERSION } from "@/content/upload-rights";
import { isCurrentAttestation } from "@/lib/order/artwork-rights";
import { migrateSchoolDesign } from "@/lib/utils/school-migration";
import {
  DEFAULT_BOTTOM_BAR,
  SCHOOL_HEADLINE_FONT,
  SCHOOL_TAGLINE_FONT,
} from "@/lib/constants/defaults";

// The store's removeTile frees an uploaded snappet's IndexedDB full-res blob. Mock
// the image store so the test can assert that deletion without a real IndexedDB
// (the node test env has none) — every function is a spy that no-ops.
vi.mock("@/lib/utils/image-store", () => ({
  putFullRes: vi.fn(async () => {}),
  getFullRes: vi.fn(async () => null),
  deleteFullRes: vi.fn(async () => {}),
}));
import { deleteFullRes } from "@/lib/utils/image-store";
import { useUIStore } from "@/stores/ui-store";

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

/**
 * The live school grid with FREE spans — the test bed for the store's placement
 * ENGINE (mirror reflects footprints, resize evicts whole, 1x1 marker tiles in
 * every cell, and so on). Those behaviours are the engine's on any frame without
 * the square rule, and pinning them here is what keeps them honest. The school
 * frames' square rule is pinned separately, on the frames that carry it, in
 * "THE SQUARE RULE" below.
 */
const { badgeShape: _squareRule, ...SCHOOL_FRAME_CONFIG } = SCHOOL_FRAME_WITH_SQUARE_RULE;
void _squareRule;

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
      slots: { "frame:top-0": { pieceId: "hs:basketball-patch", setId: "hs" } },
      textBars: [{ id: "tb1", config: { text: "Go Eagles" } }],
      designName: "Lincoln High",
      frameConfig: { ...SCHOOL_FRAME_CONFIG },
    });

    const store = createDesignStore(KEY, {
      frameConfig: SCHOOL_FRAME_CONFIG,
      migrateExtra: migrateSchoolDesign,
    });

    const s = store.getState();
    expect(s.slots["frame:top-0"]?.pieceId).toBe("hs:basketball-patch");
    expect(s.textBars).toHaveLength(1);
    expect(s.designName).toBe("Lincoln High");
  });

  it("refreshes stale persisted geometry to the store's owned config", () => {
    // A blob saved under the OLD 3-wing-column school frame. The design survives;
    // the unprintable geometry does not.
    writeBlob({
      slots: { "frame:top-0": { pieceId: "hs:basketball-patch", setId: "hs" } },
      frameConfig: { ...SCHOOL_FRAME_CONFIG, wingColumns: 3, widthInches: 11.892 },
    });

    const store = createDesignStore(KEY, {
      frameConfig: SCHOOL_FRAME_CONFIG,
      migrateExtra: migrateSchoolDesign,
    });

    expect(store.getState().frameConfig.wingColumns).toBe(SCHOOL_FRAME_CONFIG.wingColumns);
    expect(store.getState().frameConfig).toEqual(SCHOOL_FRAME_CONFIG);
    expect(store.getState().slots["frame:top-0"]?.pieceId).toBe("hs:basketball-patch");
  });

  it("refreshes the seeded banner font on a design saved with the old one", () => {
    // The recurring trap: a new default only reaches BRAND-NEW users, because the
    // font is persisted. This repair lives in `merge` (every hydrate), not
    // `migrate` (only when the stored version is older) — which is why it works.
    writeBlob({
      frameConfig: { ...SCHOOL_FRAME_CONFIG },
      sections: {
        bottom: {
          mode: "text",
          text: {
            ...DEFAULT_BOTTOM_BAR,
            text: "WILDCATS",
            tagline: "CLASS OF 2027",
            fontFamily: "'Alfa Slab One', 'Graduate', serif",
          },
        },
      },
    });

    const store = createDesignStore(KEY, {
      frameConfig: SCHOOL_FRAME_CONFIG,
      migrateExtra: migrateSchoolDesign,
    });

    const text = store.getState().sections.bottom?.text;
    expect(text?.fontFamily).toBe(SCHOOL_HEADLINE_FONT);
    // ...and the tagline gains its own condensed voice rather than staying a
    // shrunken copy of the headline.
    expect(text?.taglineFontFamily).toBe(SCHOOL_TAGLINE_FONT);
  });

  it("leaves a font the user PICKED alone", () => {
    // Only the exact string this builder seeded is refreshed. A deliberate pick
    // from the font picker carries a different family string.
    const picked = "'Bungee', display, sans-serif";
    writeBlob({
      frameConfig: { ...SCHOOL_FRAME_CONFIG },
      sections: {
        bottom: { mode: "text", text: { ...DEFAULT_BOTTOM_BAR, text: "WILDCATS", fontFamily: picked } },
      },
    });

    const store = createDesignStore(KEY, {
      frameConfig: SCHOOL_FRAME_CONFIG,
      migrateExtra: migrateSchoolDesign,
    });

    expect(store.getState().sections.bottom?.text?.fontFamily).toBe(picked);
  });

  it("does not invent a tagline face for a one-line banner", () => {
    writeBlob({
      frameConfig: { ...SCHOOL_FRAME_CONFIG },
      sections: {
        top: {
          mode: "text",
          text: { ...DEFAULT_BOTTOM_BAR, text: "HOME OF THE", fontFamily: "'Alfa Slab One', 'Graduate', serif" },
        },
      },
    });

    const store = createDesignStore(KEY, {
      frameConfig: SCHOOL_FRAME_CONFIG,
      migrateExtra: migrateSchoolDesign,
    });

    const text = store.getState().sections.top?.text;
    expect(text?.fontFamily).toBe(SCHOOL_HEADLINE_FONT);
    expect(text?.taglineFontFamily).toBeUndefined();
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
    const freed = grid.cellAt(7, 3)!.id; // (7,3), previously under the 2x2
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
    s().placeTile("frame:wing-left-7", "mascot", "test", { cols: 2, rows: 2 });
    const anchor = grid.coordOf("frame:wing-left-7")!;
    const footprintCell = grid.cellAt(anchor.row, anchor.col + 1)!; // (row, col+1)
    expect(footprintCell.zone).toBe("bottom"); // outside the wing-left section
    expect(s().slots["frame:wing-left-7"].span).toEqual({ cols: 2, rows: 2 });

    // Hide the LEFT panel: the anchor is suppressed, so the snappet paints nothing
    // and its bottom-rail cell renders as a normal empty cell.
    s().setSectionMode("wing-left", "image");

    // (1) TAP a plain tile onto that cell — placeTile's 1x1 branch.
    s().placeTile(footprintCell.id, "plain", "test");
    expect(s().slots["frame:wing-left-7"]).toBeDefined(); // snappet survives
    expect(s().slots["frame:wing-left-7"].span).toEqual({ cols: 2, rows: 2 });
    expect(s().slots[footprintCell.id]).toEqual({ pieceId: "plain", setId: "test" });

    // (2) DRAG a plain tile onto the OTHER suppressed footprint cell — moveTile's
    //     1x1 branch had the identical bug.
    const footprintCell2 = grid.cellAt(anchor.row + 1, anchor.col + 1)!; // (row+1, col+1)
    s().placeTile("frame:top-5", "dragme", "test");
    s().moveTile("frame:top-5", footprintCell2.id);
    expect(s().slots["frame:wing-left-7"]).toBeDefined(); // still survives
    expect(s().slots[footprintCell2.id]).toEqual({ pieceId: "dragme", setId: "test" });

    // (3) fillEmpty must not skip those cells as "covered" — with the anchor hidden
    //     they are genuinely empty and paintable. (Both footprint cells are now
    //     occupied by the two tiles above, so seed a fresh store to check the third.)
    const store2 = makeStore(SCHOOL_FRAME_CONFIG);
    const t = () => store2.getState();
    t().placeTile("frame:wing-left-7", "mascot", "test", { cols: 2, rows: 2 });
    t().setSectionMode("wing-left", "image");
    t().fillEmpty([{ pieceId: "filler", setId: "test" }]);
    expect(t().slots[footprintCell.id]).toBeDefined(); // filled, not skipped
    expect(t().slots["frame:wing-left-7"]).toBeDefined(); // and the snappet is untouched
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Uploaded art is a SNAPPET (Stage 10). One system: an upload enters `slots` as a
// tile carrying `image`, sized by suggestSnappetSize, and rides the same
// drag/resize/remove engine as any snappet.
describe("placeImageSnappet onto ONE named badge (the shipping frame)", () => {
  const variant = schoolVariant(SCHOOL_SHIPPING_VARIANT);
  const kit = getSchoolKit("eureka-wildcats")!;
  const seeded = () => {
    const store = createDesignStore(`test-key-${storeSeq++}`, {
      frameConfig: variant.config,
      sections: kitSections(kit),
      initialSlots: kitSeedTiles(kit, variant.config),
    });
    return store;
  };

  it("replaces exactly the badge it names, and a second photo can go on another", () => {
    const store = seeded();
    const s = () => store.getState();
    const spots = badgeSpots(variant.config, s());
    const before = { ...s().slots };
    const [a, , , d] = spots;
    s().placeImageSnappet("wing-left", { imageUrl: "data:a", sourceAspect: 1 }, undefined, a);
    s().placeImageSnappet("wing-right", { imageUrl: "data:d", sourceAspect: 1 }, undefined, d);
    expect(s().slots[a.anchorSlotId].image?.url).toBe("data:a");
    expect(s().slots[d.anchorSlotId].image?.url).toBe("data:d");
    // The other four badges are untouched, and nothing grew.
    for (const spot of spots) {
      if (spot === a || spot === d) continue;
      expect(s().slots[spot.anchorSlotId]).toBe(before[spot.anchorSlotId]);
    }
    expect(Object.keys(s().slots).sort()).toEqual(Object.keys(before).sort());
    expect(tileSpan(s().slots[a.anchorSlotId])).toEqual(a.span);
  });

  it("refuses a footprint the frame will not seat rather than writing it", () => {
    const store = seeded();
    const s = () => store.getState();
    const [a] = badgeSpots(variant.config, s());
    const before = s().slots;
    s().placeImageSnappet("wing-left", { imageUrl: "data:x", sourceAspect: 1 }, undefined, {
      anchorSlotId: a.anchorSlotId,
      span: { cols: a.span.cols, rows: a.span.rows + 1 }, // a slab, not a badge
    });
    expect(s().slots).toBe(before);
  });
});

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

describe("one editing context at a time (the stuck floating size control)", () => {
  // The floating snappet size control is `position: fixed` at the bottom of the
  // viewport. Its selection lived in the UI store while bar/section selection lives
  // here, and neither cleared the other — so opening the text-bar editor left the
  // float sitting on top of it, with no amount of scrolling able to move it.
  //
  // Pinned in the STORE, not the component: the rule is "these two selections are
  // mutually exclusive", and there are four call sites that select a bar or a
  // section across the canvas, the section controls and the upload flow.
  beforeEach(() => {
    useUIStore.getState().selectSnappet(null);
  });

  it("selecting a text bar dismisses a selected snappet", () => {
    const store = makeStore(SCHOOL_FRAME_CONFIG);
    useUIStore.getState().selectSnappet("frame:wing-left-2");
    store.getState().selectBar("tb-1");
    expect(useUIStore.getState().selectedSnappetSlotId).toBeNull();
    expect(store.getState().selectedBarId).toBe("tb-1");
  });

  it("selecting a section dismisses a selected snappet", () => {
    const store = makeStore(SCHOOL_FRAME_CONFIG);
    useUIStore.getState().selectSnappet("frame:wing-left-2");
    store.getState().selectSection("wing-right");
    expect(useUIStore.getState().selectedSnappetSlotId).toBeNull();
    expect(store.getState().selectedSectionId).toBe("wing-right");
  });

  it("CLEARING a bar or section leaves the snappet alone", () => {
    // Deselecting is not "I am now editing something else", so it must not reach
    // across and cancel a tile the user just picked up.
    const store = makeStore(SCHOOL_FRAME_CONFIG);
    useUIStore.getState().selectSnappet("frame:wing-left-2");
    store.getState().selectBar(null);
    store.getState().selectSection(null);
    expect(useUIStore.getState().selectedSnappetSlotId).toBe("frame:wing-left-2");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("uploads as reusable palette pieces", () => {
  const grid = buildGrid(SCHOOL_FRAME_CONFIG);
  const anchorId = grid.cellAt(0, 0)!.id;

  const crest = {
    name: "crest",
    url: "data:image/png;base64,thumb",
    fullResId: "fr-1",
    aspect: 1,
    span: { cols: 2, rows: 2 },
  };

  it("hands back a namespaced id whose SET segment is the reserved upload set", () => {
    const store = makeStore(SCHOOL_FRAME_CONFIG);
    const id = store.getState().addUpload(crest);
    expect(id.startsWith("upload:")).toBe(true);
    // Every place path derives the set from the id this way — see RailSlot/DndProvider.
    expect(id.split(":")[0]).toBe("upload");
  });

  it("PLACES THE SAME UPLOAD TWICE — the whole point of the tray", () => {
    const store = makeStore(SCHOOL_FRAME_CONFIG);
    const id = store.getState().addUpload(crest);
    const a = grid.cellAt(0, 0)!.id;
    const b = grid.cellAt(0, 14)!.id;
    store.getState().placeTile(a, id, "upload", { cols: 2, rows: 2 });
    store.getState().placeTile(b, id, "upload", { cols: 2, rows: 2 });
    const placed = Object.values(store.getState().slots).filter((t) => t.image);
    expect(placed).toHaveLength(2);
    for (const t of placed) {
      // The stored record is byte-identical to what placeImageSnappet writes, so
      // nothing downstream of placement can tell the two paths apart.
      expect(t.pieceId).toBe("upload");
      expect(t.setId).toBe("upload");
      expect(t.image).toEqual({ url: crest.url, fullResId: "fr-1" });
    }
  });

  it("resolves the art inside placeTile, so every gesture agrees", () => {
    // The call sites (drag, tap, fill, random) pass only an id — if the lookup lived
    // in one of them the others would place a tile with no art at all.
    const store = makeStore(SCHOOL_FRAME_CONFIG);
    const id = store.getState().addUpload(crest);
    store.getState().placeTile(anchorId, id, "upload");
    expect(store.getState().slots[anchorId].image?.url).toBe(crest.url);
  });

  it("leaves a CATALOGUE tile exactly as it was", () => {
    const store = makeStore(SCHOOL_FRAME_CONFIG);
    store.getState().addUpload(crest);
    store.getState().placeTile(anchorId, "hs:soccer-ball", "hs");
    expect(store.getState().slots[anchorId]).toEqual({ pieceId: "hs:soccer-ball", setId: "hs" });
  });

  it("keeps the newest and drops the oldest past the cap", () => {
    // Each entry is a data URL in the persisted design; without a cap a session of
    // trial-and-error uploads fills localStorage and the design stops saving.
    const store = makeStore(SCHOOL_FRAME_CONFIG);
    for (let i = 0; i < MAX_UPLOADS + 3; i++) {
      store.getState().addUpload({ ...crest, name: `crest-${i}` });
    }
    const names = store.getState().uploads.map((u) => u.name);
    expect(names).toHaveLength(MAX_UPLOADS);
    expect(names[0]).toBe(`crest-${MAX_UPLOADS + 2}`); // newest first
    expect(names).not.toContain("crest-0");
  });

  it("removing from the tray does NOT touch tiles already on the frame", () => {
    // The tray is a source of art, not a live link. Deleting a swatch must never
    // silently edit a design the customer has already laid out.
    const store = makeStore(SCHOOL_FRAME_CONFIG);
    const id = store.getState().addUpload(crest);
    store.getState().placeTile(anchorId, id, "upload");
    store.getState().removeUpload(id);
    expect(store.getState().uploads).toHaveLength(0);
    expect(store.getState().slots[anchorId].image?.url).toBe(crest.url);
  });

  it("survives a rehydrate — including a blob saved before uploads existed", () => {
    // `merge` runs on EVERY hydrate; `migrate` only when the version is older. A blob
    // already at the current version has no `uploads` key and would arrive undefined,
    // which the palette would crash on.
    const store = makeStore(SCHOOL_FRAME_CONFIG);
    store.persist.rehydrate();
    expect(Array.isArray(store.getState().uploads)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("the background override reaches the BANNERS too", () => {
  // It is one background colour as far as anyone looking at the frame is concerned.
  // Recolouring the badges while the two text bars kept their old colour made the
  // frame read as two products bolted together.
  it("writes the colour into every section's banner", () => {
    const store = makeStore(SCHOOL_FRAME_CONFIG);
    store.getState().setSectionMode("bottom", "text");
    store.getState().setSectionText("bottom", { text: "WILDCATS" });
    store.getState().setTileFieldColor("#8C1D40");
    expect(store.getState().sections.bottom?.text?.backgroundColor).toBe("#8C1D40");
    expect(store.getState().tileFieldColor).toBe("#8C1D40");
  });

  it("sets the DRAFT banner too, so a bar added later matches", () => {
    const store = makeStore(SCHOOL_FRAME_CONFIG);
    store.getState().setTileFieldColor("#8C1D40");
    expect(store.getState().bottomBar.backgroundColor).toBe("#8C1D40");
  });

  it("leaves the banners alone on RESET — there is no prior value to restore", () => {
    // Reverting to a colour the user may since have chosen by hand is worse than
    // leaving what is there; the section editor's own picker still wins either way.
    const store = makeStore(SCHOOL_FRAME_CONFIG);
    store.getState().setSectionMode("bottom", "text");
    store.getState().setTileFieldColor("#8C1D40");
    store.getState().setTileFieldColor(null);
    expect(store.getState().tileFieldColor).toBeNull();
    expect(store.getState().sections.bottom?.text?.backgroundColor).toBe("#8C1D40");
  });

  it("is a no-op on the sections object when nothing changes", () => {
    const store = makeStore(SCHOOL_FRAME_CONFIG);
    store.getState().setSectionMode("bottom", "text");
    store.getState().setTileFieldColor("#8C1D40");
    const before = store.getState().sections;
    store.getState().setTileFieldColor("#8C1D40");
    expect(store.getState().sections).toBe(before); // same object → no render churn
  });

  it("survives CLEAR — the reseeded banners wear the badges' colour, not the kit's", () => {
    // Every preset tap clears first. The banners came back in the kit's seed colour
    // while every badge kept the colour the parent picked: two colours on one frame,
    // where the owner's rule is that the badge background IS the banner colour.
    const store = createDesignStore(`test-key-${storeSeq++}`, {
      frameConfig: SCHOOL_FRAME_CONFIG,
      sections: {
        bottom: { mode: "text", text: { ...DEFAULT_BOTTOM_BAR, text: "WILDCATS", backgroundColor: "#462E8D" } },
      },
      initialBrand: { frameColor: "#462E8D", tileFieldColor: "#462E8D", rimColor: "#FFCC00" },
    });
    store.getState().setTileFieldColor("#8C1D40");
    store.getState().clearAll();
    expect(store.getState().sections.bottom?.text?.backgroundColor).toBe("#8C1D40");
    expect(store.getState().sections.bottom?.text?.text).toBe("WILDCATS");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("a returning visitor survives a persist version bump, on the frame we ship", () => {
  const KEY = "festive-frames-school-bump-test";

  it("keeps every seeded flush badge when the stored version is one behind", () => {
    // `migrateSchoolDesign` used to stamp the RETIRED live geometry over the blob
    // before `merge` ran, so `dropRelocatedSlots` reconciled from a frame the
    // design was never drawn on: 0 of 6 seeded side badges survived. Latent at
    // the current version, fatal on the next bump — exactly when nobody is
    // looking at the school builder.
    const { config } = schoolVariant(SCHOOL_SHIPPING_VARIANT);
    const kit = getSchoolKit("sluh-jr-bills")!;
    const seeds = kitSeedTiles(kit, config);
    expect(Object.keys(seeds)).toHaveLength(6);

    memoryStorage.setItem(
      KEY,
      JSON.stringify({ state: { slots: seeds, frameConfig: { ...config }, designName: "Miller" }, version: 6 }),
    );
    const store = createDesignStore(KEY, { frameConfig: config, migrateExtra: migrateSchoolDesign });
    const after = store.getState();
    for (const [slot, tile] of Object.entries(seeds)) {
      expect(after.slots[slot]?.pieceId, slot).toBe(tile.pieceId);
      expect(after.slots[slot]?.span, slot).toEqual(tile.span);
    }
    expect(after.frameConfig).toEqual(config);
    expect(after.designName).toBe("Miller");
  });
});

describe("a legacy wing-in-text design keeps its badges on hydrate", () => {
  it("repairs the panel BEFORE the square rule looks at the badges in it", () => {
    // The slot repairs ask canPlace, which refuses every badge in a text-mode
    // panel. Run first, squareUpSlots found "no legal square" and deleted a
    // perfectly legal 2.25 in badge; repairSections then flipped the wing back to
    // tiles on the next line — an empty side column and no failure anywhere.
    const KEY = "festive-frames-school-wingtext-test";
    const { config } = schoolVariant(SCHOOL_SHIPPING_VARIANT);
    const badge = { pieceId: "hs:football-patch", setId: "hs", span: { cols: 2, rows: 1 } };
    memoryStorage.setItem(
      KEY,
      JSON.stringify({
        state: {
          slots: { "frame:wing-left-3": badge },
          sections: { "wing-left": { mode: "text" } },
          frameConfig: { ...config },
        },
        version: 7,
      }),
    );
    const after = createDesignStore(KEY, { frameConfig: config, migrateExtra: migrateSchoolDesign }).getState();
    expect(after.sections["wing-left"]?.mode).toBe("tiles");
    expect(after.slots["frame:wing-left-3"]?.pieceId).toBe("hs:football-patch");
    expect(after.slots["frame:wing-left-3"]?.span).toEqual({ cols: 2, rows: 1 });
  });
});

// ─── The uploaded-artwork attestation ────────────────────────────────────────
//
// It is design state because one design becomes one order, and the order is what
// somebody asks about later. These tests pin the three things that make it a
// record rather than a checkbox: it names the WORDING agreed to, it does not move
// once made, and anything malformed reads as "never accepted".

describe("artworkRights", () => {
  it("is empty on a fresh design, so the gate fires on the first upload", () => {
    expect(makeStore().getState().artworkRights).toBeNull();
  });

  it("records the wording that was agreed to, not just that something was", () => {
    const store = makeStore();
    store.getState().acceptArtworkRights();
    expect(store.getState().artworkRights).toEqual({
      version: UPLOAD_RIGHTS_VERSION,
      acceptedAt: expect.any(Number),
    });
  });

  it("does not move the timestamp when the same terms are accepted again", () => {
    // A second upload, or a hydrate, must not quietly rewrite when the customer
    // said yes. The action returns the SAME state object in that case, so it also
    // costs no render.
    const store = makeStore();
    store.getState().acceptArtworkRights();
    const first = store.getState().artworkRights;
    store.getState().acceptArtworkRights();
    expect(store.getState().artworkRights).toBe(first);
  });

  it("survives a reload of the same design", () => {
    const KEY = "festive-frames-rights-persist-test";
    const store = createDesignStore(KEY, {});
    store.getState().acceptArtworkRights();
    const accepted = store.getState().artworkRights;

    const reopened = createDesignStore(KEY, {});
    expect(reopened.getState().artworkRights).toEqual(accepted);
  });

  it.each([
    ["a bare true", true],
    ["a version with no timestamp", { version: "2026-09-13" }],
    ["a timestamp with no version", { acceptedAt: 123 }],
    ["a string", "accepted"],
  ])("treats %s in a stored blob as NOT accepted", (_label, stored) => {
    // The safe direction: a blob that has been hand-edited, truncated or written
    // by an older shape asks again rather than being trusted. In `merge`, so it
    // reaches blobs already at the current version — the ones `migrate` never sees.
    const KEY = `festive-frames-rights-junk-${String(_label).replace(/\W+/g, "-")}`;
    memoryStorage.setItem(
      KEY,
      JSON.stringify({ state: { artworkRights: stored, designName: "Miller" }, version: 7 }),
    );
    const store = createDesignStore(KEY, {});
    expect(store.getState().artworkRights).toBeNull();
    expect(store.getState().designName).toBe("Miller"); // the rest of the blob is untouched
  });

  it("keeps a well-formed record of OLDER wording, and does not call it current", () => {
    // The record is evidence and stays; whether to ask again is a separate
    // question, answered by `isCurrentAttestation` at the gate.
    const KEY = "festive-frames-rights-old-wording";
    const old = { version: "2020-01-01", acceptedAt: 1577836800000 };
    memoryStorage.setItem(KEY, JSON.stringify({ state: { artworkRights: old }, version: 7 }));
    const store = createDesignStore(KEY, {});
    expect(store.getState().artworkRights).toEqual(old);
    expect(isCurrentAttestation(store.getState().artworkRights)).toBe(false);
  });
});

describe("artworkRights and loadDesign", () => {
  it("CLEARS the attestation when a different design is restored", () => {
    // The field is deliberately not part of `LoadableDesign`, so a restored design
    // brings none — and zustand's `set` is a shallow merge, which would otherwise
    // leave the current visitor's acceptance sitting on artwork they have never
    // seen. Dormant while only /build restores by token, fatal the day the school
    // builder gets the same save-design-by-email flow.
    const store = makeStore();
    store.getState().acceptArtworkRights();
    expect(store.getState().artworkRights).not.toBeNull();

    store.getState().loadDesign({ designName: "Somebody else's frame", slots: {} });
    expect(store.getState().artworkRights).toBeNull();
    expect(store.getState().designName).toBe("Somebody else's frame");
  });
});

// ─── THE SQUARE RULE, through the store ──────────────────────────────────────
//
// Every path that writes a badge on the shipping frame — a placement, a Mirror, a
// Fill All, and a HYDRATE of a design saved before the rule — ends on 2.25 in
// squares. A badge is a square; the frame declares where squares go.

describe("THE SQUARE RULE on the shipping frame", () => {
  const FLUSH = SCHOOL_FLUSH_FRAME_CONFIG;
  const LEFT = ["frame:wing-left-3", "frame:wing-left-4", "frame:wing-left-5"];
  const RIGHT = ["frame:wing-right-0", "frame:wing-right-1", "frame:wing-right-2"];

  /** Every placed badge is a 2.25 in square; returns how many there are. */
  function expectAllSquare(slots: Record<string, PlacedTile>): number {
    for (const [id, tile] of Object.entries(slots)) {
      const { width, height } = snappetInches(FLUSH, id, tileSpan(tile));
      expect(width, id).toBeCloseTo(2.25, 6);
      expect(height, id).toBeCloseTo(2.25, 6);
    }
    return Object.keys(slots).length;
  }

  it("placeTile sizes a badge from the frame, whatever span it is handed", () => {
    const store = makeStore(FLUSH);
    for (const id of [...LEFT, ...RIGHT]) store.getState().placeTile(id, "hs:crest", "hs");
    // A piece's own {2,2} preference, and a tall {1,2}: both become the square
    // at that anchor and replace exactly that badge.
    store.getState().placeTile(LEFT[0], "hs:orchestra", "hs", { cols: 2, rows: 2 });
    store.getState().placeTile(LEFT[1], "hs:golf", "hs", { cols: 1, rows: 2 });
    const slots = store.getState().slots;
    expect(expectAllSquare(slots)).toBe(6);
    expect(slots[LEFT[0]].pieceId).toBe("hs:orchestra");
    expect(slots[LEFT[1]].pieceId).toBe("hs:golf");
    expect(slots[LEFT[2]].pieceId).toBe("hs:crest");
  });

  it("a restored design with no sections gets banners, not an empty tile runner", () => {
    // Absent = tiles, and the flush runners hold no badge: without the repair the
    // bottom runner drew as eleven empty 1" pockets. loadDesign repairs like hydrate.
    const store = makeStore(FLUSH);
    store.getState().loadDesign({ slots: {} });
    const { sections } = store.getState();
    expect(sections.top?.mode).toBe("text");
    expect(sections.bottom?.mode).toBe("text");
    expect(sections["wing-left"]).toBeUndefined();
  });

  it("placeTile refuses a cell no badge can anchor (the rail half, the top bar)", () => {
    const store = makeStore(FLUSH);
    store.getState().placeTile("frame:wing-left-0", "hs:crest", "hs");
    store.getState().placeTile("frame:top-3", "hs:crest", "hs");
    expect(store.getState().slots).toEqual({});
  });

  it("Mirror on the shipping frame lands six squares", () => {
    const store = makeStore(FLUSH);
    for (const id of LEFT) store.getState().placeTile(id, "hs:soccer-patch", "hs");
    store.getState().mirrorTopSlots();
    const slots = store.getState().slots;
    expect(expectAllSquare(slots)).toBe(6);
    for (const id of RIGHT) expect(slots[id]?.pieceId).toBe("hs:soccer-patch");
  });

  it("Fill All and Random on the shipping frame lay six squares", () => {
    const store = makeStore(FLUSH);
    store.getState().fillAll("hs:crest", "hs");
    expect(expectAllSquare(store.getState().slots)).toBe(6);
    store.getState().randomFill([{ pieceId: "hs:crest", setId: "hs" }, { pieceId: "hs:golf", setId: "hs" }]);
    expect(expectAllSquare(store.getState().slots)).toBe(6);
  });

  it("an uploaded photo lands on ONE badge, square, whatever its aspect", () => {
    const store = makeStore(FLUSH);
    for (const id of [...LEFT, ...RIGHT]) store.getState().placeTile(id, "hs:crest", "hs");
    store.getState().placeImageSnappet("wing-left", { imageUrl: "data:x", sourceAspect: 1 / 3 });
    const slots = store.getState().slots;
    expect(expectAllSquare(slots)).toBe(6);
    expect(slots[LEFT[0]].image?.url).toBe("data:x");
    expect(slots[LEFT[1]].pieceId).toBe("hs:crest");
  });

  describe("a design saved before the rule", () => {
    const KEY = "festive-frames-school-v1:flush:square-test";
    const writeBlob = (state: Record<string, unknown>) =>
      memoryStorage.setItem(KEY, JSON.stringify({ state, version: 7 }));

    it("hydrates its {2,2} slab and {1,2} tall as squares at their own anchors", () => {
      writeBlob({
        slots: {
          // The slab a tap used to make: 2.25 x 4.5, over the middle badge.
          [LEFT[0]]: { pieceId: "hs:crest", setId: "hs", span: { cols: 2, rows: 2 } },
          // A TALL photo at its own declaration: 1.0 x 4.5 down the right rail,
          // which is where the right-hand badge anchors.
          [RIGHT[1]]: { pieceId: "upload", setId: "upload", span: { cols: 1, rows: 2 }, image: { url: "data:p" } },
          [LEFT[2]]: { pieceId: "hs:soccer-patch", setId: "hs", span: { cols: 2, rows: 1 } },
          // The LEFT rail anchors no badge (its square would cover the plate).
          "frame:wing-left-1": { pieceId: "hs:golf", setId: "hs", span: { cols: 1, rows: 2 } },
        },
        frameConfig: { ...FLUSH },
      });
      const store = createDesignStore(KEY, { frameConfig: FLUSH, migrateExtra: migrateSchoolDesign });
      const slots = store.getState().slots;
      expectAllSquare(slots);
      expect(slots[LEFT[0]].span).toEqual({ cols: 2, rows: 1 });
      expect(slots[LEFT[2]].pieceId).toBe("hs:soccer-patch");
      expect(slots[RIGHT[1]].span).toEqual({ cols: 2, rows: 1 });
      expect(slots[RIGHT[1]].image).toEqual({ url: "data:p", needsRecrop: true });
      // No square anchors on the left rail, so that one is dropped rather than
      // printed as a part the frame does not have.
      expect(slots["frame:wing-left-1"]).toBeUndefined();
      expect(Object.keys(slots)).toHaveLength(3);
      memoryStorage.removeItem(KEY);
    });

    it("marks a reseated photo for re-crop, and re-cropping at the same size clears it", () => {
      writeBlob({
        slots: {
          [LEFT[0]]: { pieceId: "upload", setId: "upload", span: { cols: 2, rows: 3 }, image: { url: "data:t", fullResId: "t" } },
        },
        frameConfig: { ...FLUSH },
      });
      const store = createDesignStore(KEY, { frameConfig: FLUSH, migrateExtra: migrateSchoolDesign });
      const tile = store.getState().slots[LEFT[0]];
      expect(tile.span).toEqual({ cols: 2, rows: 1 });
      expect(tile.image?.needsRecrop).toBe(true);
      // The re-crop commit: SAME footprint, fresh art. Not a no-op.
      store.getState().resizeTile(LEFT[0], { cols: 2, rows: 1 }, { url: "data:new", fullResId: "n" });
      expect(store.getState().slots[LEFT[0]].image).toEqual({ url: "data:new", fullResId: "n" });
      memoryStorage.removeItem(KEY);
    });

    it("leaves a design that already obeys the rule exactly as it was", () => {
      const slots = Object.fromEntries(
        LEFT.map((id) => [id, { pieceId: "hs:crest", setId: "hs", span: { cols: 2, rows: 1 } }]),
      );
      writeBlob({ slots, frameConfig: { ...FLUSH } });
      const store = createDesignStore(KEY, { frameConfig: FLUSH, migrateExtra: migrateSchoolDesign });
      expect(store.getState().slots).toEqual(slots);
      memoryStorage.removeItem(KEY);
    });
  });
});
