import { describe, it, expect } from "vitest";
import {
  badgeRule,
  blockFill,
  canPlace,
  FREE_BADGES,
  growUndersizedBadges,
  occupiedCoords,
  panelSnappetPlacement,
  placementContext,
  resolveSnappetDrop,
  resolveTapDrop,
  snappetInches,
  squareSpansAt,
  squareUpSlots,
  tileSpan,
  type PlacementContext,
} from "./snappet";
import { buildGrid } from "./slot-generator";
import { panelRects } from "./panels";
import { repairSections, sectionSupportsTiles } from "./sections";
import {
  DEFAULT_FRAME_CONFIG,
  SCHOOL_CLASSIC_FRAME_CONFIG,
  SCHOOL_FLUSH_FRAME_CONFIG,
  SCHOOL_FRAME_CONFIG,
  SCHOOL_JULY_FULL_FRAME_CONFIG,
  SCHOOL_JULY_SLIM_FRAME_CONFIG,
  SCHOOL_SLIM_FRAME_CONFIG,
} from "@/lib/constants/frame";
import { SCHOOL_SHIPPING_VARIANT, SCHOOL_VARIANTS, schoolVariant } from "@/data/school-variants";
import { schoolSet } from "@/data/sets/school";
import { allSchoolKits } from "@/data/school-kits";
import { kitSeedTiles } from "@/data/kit-seed";
import type { FrameConfig, PlacedTile, TileSpan } from "@/lib/types";

// ─── THE SQUARE RULE ─────────────────────────────────────────────────────────
//
// "A badge is a square. The frame declares where squares go; art never chooses
// its footprint." These tests pin that rule on the frame every school ships on,
// through every path that sizes a badge, and pin that /build is untouched by it.

const SHIP = schoolVariant(SCHOOL_SHIPPING_VARIANT).config;
const shipGrid = buildGrid(SHIP);

const emptyCtx = (config: FrameConfig, slots: Record<string, PlacedTile> = {}): PlacementContext =>
  placementContext(config, { slots, sections: {}, textBars: [] });

/** The six side badges of the shipping frame, as [anchorId, span]. */
function shippingBadges(): Array<[string, TileSpan]> {
  const out: Array<[string, TileSpan]> = [];
  const ctx = emptyCtx(SHIP);
  for (const cell of shipGrid.slots) {
    for (const span of squareSpansAt(ctx, cell)) out.push([cell.id, span]);
  }
  return out;
}

const square = (config: FrameConfig, anchorId: string, span: TileSpan) => {
  const { width, height } = snappetInches(config, anchorId, span);
  return Math.abs(width - height) < 1e-6;
};

describe("the square rule is a property of every SCHOOL frame, and only of them", () => {
  it("is declared on the shipping frame and every lab school frame", () => {
    for (const config of [
      SCHOOL_FLUSH_FRAME_CONFIG,
      SCHOOL_FRAME_CONFIG,
      SCHOOL_SLIM_FRAME_CONFIG,
      SCHOOL_CLASSIC_FRAME_CONFIG,
      SCHOOL_JULY_SLIM_FRAME_CONFIG,
      SCHOOL_JULY_FULL_FRAME_CONFIG,
    ]) {
      expect(badgeRule(config).square).toBe(true);
    }
    for (const v of Object.values(SCHOOL_VARIANTS)) expect(badgeRule(v.config).square).toBe(true);
  });

  it("is NOT on /build's frame, which stays free-span", () => {
    expect(badgeRule(DEFAULT_FRAME_CONFIG)).toBe(FREE_BADGES);
    // A /build 1x1 still seats exactly where it always did.
    const ctx = emptyCtx(DEFAULT_FRAME_CONFIG);
    expect(ctx.badges.square).toBe(false);
    const p = resolveSnappetDrop(ctx, { overSlotId: "frame:top-3", span: { cols: 1, rows: 1 } })!;
    expect([p.anchorSlotId, p.cols, p.rows, p.valid]).toEqual(["frame:top-3", 1, 1, true]);
  });
});

describe("canPlace on the shipping frame accepts ONLY squares", () => {
  it("every accepted (anchor, span) is square in inches — exhaustively", () => {
    const ctx = emptyCtx(SHIP);
    let accepted = 0;
    for (const cell of shipGrid.slots) {
      for (let cols = 1; cols <= shipGrid.cols; cols++) {
        for (let rows = 1; rows <= shipGrid.rows; rows++) {
          if (!canPlace(ctx, cell, { cols, rows }).ok) continue;
          accepted++;
          expect(square(SHIP, cell.id, { cols, rows }), `${cell.id} ${cols}x${rows}`).toBe(true);
        }
      }
    }
    expect(accepted).toBe(6);
  });

  it("those six are the three 2.25 in squares down each side, and nothing else", () => {
    const badges = shippingBadges();
    expect(badges).toHaveLength(6);
    for (const [id, span] of badges) {
      expect(span).toEqual({ cols: 2, rows: 1 });
      const { width, height } = snappetInches(SHIP, id, span);
      expect(width).toBeCloseTo(2.25, 6);
      expect(height).toBeCloseTo(2.25, 6);
      expect(shipGrid.panelAt(shipGrid.coordOf(id)!.row, shipGrid.coordOf(id)!.col)).toMatch(/^wing-/);
    }
  });

  it("refuses the slab and the sliver with the reason 'shape'", () => {
    const ctx = emptyCtx(SHIP);
    const top = shipGrid.coordOf("frame:wing-left-3")!; // outer wing, top badge
    // {2,2}: 2.25 x 4.5 — the slab a square-declared piece used to grow into.
    expect(canPlace(ctx, top, { cols: 2, rows: 2 })).toMatchObject({ ok: false, reason: "shape" });
    // {1,2}: 1.25 x 4.5 — a TALL piece's own declaration.
    expect(canPlace(ctx, top, { cols: 1, rows: 2 })).toMatchObject({ ok: false, reason: "shape" });
    // {1,1}: 1.25 x 2.25 — the 1x1 bypass's sliver.
    expect(canPlace(ctx, top, { cols: 1, rows: 1 })).toMatchObject({ ok: false, reason: "shape" });
    // The bottom runner's 1" cells are square but under the frame's floor.
    const bottom = panelRects(SHIP).bottom;
    expect(canPlace(ctx, { row: bottom.row0, col: bottom.col0 }, { cols: 1, rows: 1 })).toMatchObject({
      ok: false,
      reason: "shape",
    });
  });
});

describe("tap-to-place replaces EXACTLY the badge it lands on", () => {
  // A full shipping frame: every side badge filled, so any overreach evicts a
  // neighbour and shows up in `evicts`.
  const full: Record<string, PlacedTile> = Object.fromEntries(
    shippingBadges().map(([id, span]) => [id, { pieceId: "hs:crest", setId: "hs", span }]),
  );
  const ctx = emptyCtx(SHIP, full);
  const floor = SHIP.minTileSpan;

  // Every palette piece, and uploads whose tray spans came from 1:1, 1:2 and 3:1
  // crops on older frames (an upload carries its crop's span into the tray).
  const pieces: Array<[string, { defaultSpan?: TileSpan; spanRequired?: boolean } | undefined]> = [
    ...schoolSet.pieces.map((p) => [p.id, p] as [string, typeof p]),
    ["upload 1:1", { defaultSpan: { cols: 2, rows: 2 } }],
    ["upload 1:2", { defaultSpan: { cols: 2, rows: 4 } }],
    ["upload 3:1", { defaultSpan: { cols: 3, rows: 1 } }],
    ["upload legacy 1x1", { defaultSpan: { cols: 1, rows: 1 } }],
    ["no piece", undefined],
  ];

  it("has a palette to test", () => {
    expect(schoolSet.pieces.length).toBeGreaterThan(40);
  });

  it.each(shippingBadges().map(([id]) => id))("onto %s: 2.25 x 2.25, evicting only that badge", (id) => {
    for (const [label, piece] of pieces) {
      // Tap the anchor cell and, for the rail half of the badge, the covered cell.
      const at = shipGrid.coordOf(id)!;
      const cells = occupiedCoords(at, { cols: 2, rows: 1 }).map((c) => shipGrid.cellAt(c.row, c.col)!.id);
      for (const tapped of cells) {
        const drop = resolveTapDrop(ctx, tapped, piece, floor)!;
        expect(drop.valid, `${label} on ${tapped}`).toBe(true);
        expect(drop.anchorSlotId, `${label} on ${tapped}`).toBe(id);
        const { width, height } = snappetInches(SHIP, drop.anchorSlotId, drop);
        expect(width, label).toBeCloseTo(2.25, 6);
        expect(height, label).toBeCloseTo(2.25, 6);
        expect(drop.evicts, `${label} on ${tapped}`).toEqual([id]);
      }
    }
  });

  it("a tap on the top bar or the bottom runner seats nothing", () => {
    for (const panel of ["top", "bottom"] as const) {
      const r = panelRects(SHIP)[panel];
      const cell = shipGrid.cellAt(r.row0, r.col0 + 3)!;
      const drop = resolveTapDrop(emptyCtx(SHIP), cell.id, schoolSet.pieces[0], floor);
      expect(drop?.valid, panel).toBe(false);
    }
  });
});

describe("uploads land on ONE square badge", () => {
  it.each([1, 0.5, 1 / 3, 3])("aspect %s: the first free badge of the panel, square", (aspect) => {
    const p = panelSnappetPlacement(emptyCtx(SHIP), "wing-left", aspect, { allowEvict: true })!;
    expect(p.span).toEqual({ cols: 2, rows: 1 });
    expect(square(SHIP, p.anchorSlotId, p.span)).toBe(true);
    expect(shipGrid.coordOf(p.anchorSlotId)!.row).toBe(0);
  });

  it("on a full panel replaces its first badge only", () => {
    const full: Record<string, PlacedTile> = Object.fromEntries(
      shippingBadges().map(([id, span]) => [id, { pieceId: "hs:crest", setId: "hs", span }]),
    );
    const ctx = emptyCtx(SHIP, full);
    const p = panelSnappetPlacement(ctx, "wing-right", 0.5, { allowEvict: true })!;
    expect(p.span).toEqual({ cols: 2, rows: 1 });
    expect(canPlace(ctx, shipGrid.coordOf(p.anchorSlotId)!, p.span).evicts).toEqual([p.anchorSlotId]);
  });
});

describe("Fill All lays the frame's squares", () => {
  it("six 2.25 in squares on the shipping frame, whatever span is asked for", () => {
    for (const asked of [{ cols: 2, rows: 1 }, { cols: 2, rows: 2 }, { cols: 1, rows: 1 }]) {
      const slots = blockFill(emptyCtx(SHIP), () => ({ pieceId: "hs:crest", setId: "hs" }), asked);
      expect(Object.keys(slots)).toHaveLength(6);
      for (const [id, tile] of Object.entries(slots)) {
        expect(square(SHIP, id, tileSpan(tile)), id).toBe(true);
      }
    }
  });
});

describe("squareUpSlots — saved designs reach the rule on hydrate", () => {
  const leftTop = "frame:wing-left-3";
  const leftMid = "frame:wing-left-4";
  const leftBot = "frame:wing-left-5";
  const rightTop = "frame:wing-right-0";

  it("reseats a {2,2} slab and a {1,2} tall as the square at their own anchors", () => {
    const saved: Record<string, PlacedTile> = {
      [leftTop]: { pieceId: "hs:crest", setId: "hs", span: { cols: 2, rows: 2 } },
      [leftBot]: { pieceId: "hs:orchestra", setId: "hs", span: { cols: 1, rows: 2 } },
    };
    const out = squareUpSlots(emptyCtx(SHIP, saved));
    expect(out[leftTop].span).toEqual({ cols: 2, rows: 1 });
    expect(out[leftBot].span).toEqual({ cols: 2, rows: 1 });
    for (const [id, tile] of Object.entries(out)) {
      expect(canPlace(emptyCtx(SHIP), shipGrid.coordOf(id)!, tileSpan(tile)).ok, id).toBe(true);
    }
  });

  it("leaves a legal badge alone when its panel is only HIDDEN (wing saved as text)", () => {
    // A shape repair must not delete what another repair is about to reveal:
    // canPlace refuses every badge in a text-mode panel as "suppressed", and
    // repairSections flips that wing back to tiles on the same hydrate.
    const saved: Record<string, PlacedTile> = {
      [leftTop]: { pieceId: "hs:football", setId: "hs", span: { cols: 2, rows: 1 } },
    };
    const ctx = placementContext(SHIP, { slots: saved, sections: { "wing-left": { mode: "text" } }, textBars: [] });
    expect(squareUpSlots(ctx)).toBe(saved);
  });

  it("drops a badge with no legal square at its anchor", () => {
    // The rail column cannot anchor a badge: its square would reach the plate.
    const saved: Record<string, PlacedTile> = {
      "frame:wing-left-0": { pieceId: "hs:crest", setId: "hs", span: { cols: 1, rows: 2 } },
    };
    expect(squareUpSlots(emptyCtx(SHIP, saved))).toEqual({});
  });

  it("never lets a repair evict a badge that was already legal", () => {
    // A {2,3} at the top covers the whole column; the middle badge beneath it is
    // legal and must survive, so the top reseats to its own square only.
    const saved: Record<string, PlacedTile> = {
      [leftTop]: { pieceId: "hs:crest", setId: "hs", span: { cols: 2, rows: 3 } },
      [leftMid]: { pieceId: "hs:soccer-patch", setId: "hs", span: { cols: 2, rows: 1 } },
    };
    const out = squareUpSlots(emptyCtx(SHIP, saved));
    expect(out[leftMid]).toBe(saved[leftMid]);
    expect(out[leftTop].span).toEqual({ cols: 2, rows: 1 });
  });

  it("flags a reseated PHOTO for re-crop, and leaves a legal photo alone", () => {
    const tall = { url: "data:x", fullResId: "a" };
    const saved: Record<string, PlacedTile> = {
      [leftTop]: { pieceId: "upload", setId: "upload", span: { cols: 2, rows: 3 }, image: tall },
      [rightTop]: { pieceId: "upload", setId: "upload", span: { cols: 2, rows: 1 }, image: { url: "data:y" } },
    };
    const out = squareUpSlots(emptyCtx(SHIP, saved));
    expect(out[leftTop].image).toEqual({ ...tall, needsRecrop: true });
    expect(out[rightTop]).toBe(saved[rightTop]);
  });

  it("returns the SAME object when every badge is already legal", () => {
    const legal: Record<string, PlacedTile> = Object.fromEntries(
      shippingBadges().map(([id, span]) => [id, { pieceId: "hs:crest", setId: "hs", span }]),
    );
    expect(squareUpSlots(emptyCtx(SHIP, legal))).toBe(legal);
  });

  it("is a no-op on /build", () => {
    const slots: Record<string, PlacedTile> = { "frame:top-0": { pieceId: "x", setId: "x", span: { cols: 3, rows: 1 } } };
    expect(squareUpSlots(emptyCtx(DEFAULT_FRAME_CONFIG, slots))).toBe(slots);
  });

  it("growUndersizedBadges no longer grows a side badge into a slab", () => {
    // It used to: a {2,1} side badge of a piece that prefers {2,2} grew over an
    // empty badge below it on every hydrate.
    const slots: Record<string, PlacedTile> = {
      [leftTop]: { pieceId: "hs:crest", setId: "hs", span: { cols: 2, rows: 1 } },
    };
    expect(growUndersizedBadges(emptyCtx(SHIP, slots), () => ({ cols: 2, rows: 2 }))).toBe(slots);
  });
});

describe("sectionSupportsTiles asks the frame", () => {
  it("the shipping frame's badges live in the side columns only", () => {
    expect(sectionSupportsTiles("wing-left", SHIP)).toBe(true);
    expect(sectionSupportsTiles("wing-right", SHIP)).toBe(true);
    // The 0.75" top bar is banner-only; the 1" bottom runner's squares are under
    // the floor. Offering tiles there would offer a mode that places nothing.
    expect(sectionSupportsTiles("top", SHIP)).toBe(false);
    expect(sectionSupportsTiles("bottom", SHIP)).toBe(false);
  });

  it("the live frame's two-row bottom banner still holds a 2x2", () => {
    expect(sectionSupportsTiles("bottom", SCHOOL_FRAME_CONFIG)).toBe(true);
    expect(sectionSupportsTiles("top", SCHOOL_FRAME_CONFIG)).toBe(false);
  });

  it("repairSections moves a tiles-mode bottom runner to text on the shipping frame", () => {
    const text = { text: "RAMS", fontFamily: "x", textColor: "#fff", backgroundColor: "#000" };
    const out = repairSections({ bottom: { mode: "tiles", text } }, SHIP);
    expect(out.bottom).toEqual({ mode: "text", text });
    const fine = { top: { mode: "text" as const }, bottom: { mode: "text" as const } };
    expect(repairSections(fine, SHIP)).toBe(fine);
  });

  it("an ABSENT runner is a banner on the shipping frame, not eleven empty pockets", () => {
    // Absent means tiles, and the frame can refute that: a design restored with no
    // `sections` drew the flush bottom runner as eleven 1" pockets no badge fills.
    expect(repairSections({}, SHIP)).toEqual({ top: { mode: "text" }, bottom: { mode: "text" } });
    // A panel that CAN hold badges stays absent (= tiles), and a panel already
    // chosen is never overwritten.
    const kept = { bottom: { mode: "text" as const, text: { text: "RAMS" } } };
    const out = repairSections(kept, SHIP);
    expect(out.bottom).toBe(kept.bottom);
    expect(out).not.toHaveProperty("wing-left");
    // Frames without the square rule are untouched: /build never populates
    // `sections`, and its 1-row top strip holds 1x1 tiles.
    const none = {};
    expect(repairSections(none, DEFAULT_FRAME_CONFIG)).toBe(none);
    expect(repairSections(none)).toBe(none);
  });
});

describe("kit seeds are squares the frame accepts, on every variant", () => {
  it.each(Object.values(SCHOOL_VARIANTS).map((v) => [v.id, v] as const))("%s", (_id, variant) => {
    const grid = buildGrid(variant.config);
    const ctx = emptyCtx(variant.config);
    for (const kit of allSchoolKits()) {
      const seeds = kitSeedTiles(kit, variant.config);
      expect(Object.keys(seeds).length, kit.slug).toBe(variant.badgeStack.length * 2);
      for (const [slot, tile] of Object.entries(seeds)) {
        const verdict = canPlace(ctx, grid.coordOf(slot)!, tile.span);
        expect(verdict.ok, `${kit.slug} ${slot}: ${verdict.reason}`).toBe(true);
      }
    }
  });
});
