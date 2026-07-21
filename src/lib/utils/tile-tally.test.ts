import { describe, it, expect } from "vitest";
import { tallyTiles, tallyKey, type TileTally } from "./tile-tally";
import { buildPrintQueue } from "./eufy-print-core";
import type { PlacedTextBar, PlacedTile, TileSpan } from "@/lib/types";

// The tally used to be copy-pasted into three files (the parts list, the print
// queue, the in-builder export sheet). These lock the shared implementation to the
// behaviour those copies had — plus the span-awareness added in Stage 5, where a
// multi-cell snappet is a DISTINCT physical part from a 1x1 of the same piece.

const t = (pieceId: string): PlacedTile => ({ pieceId, setId: "essentials" });
const ts = (pieceId: string, span: TileSpan): PlacedTile => ({ pieceId, setId: "essentials", span });

/** Map the tally to { key: qty } for terse assertions. */
const byKey = (m: Map<string, TileTally>): Record<string, number> =>
  Object.fromEntries(Array.from(m.entries()).map(([k, v]) => [k, v.qty]));

const bar = (row: "top" | "bottom", startIndex: number, widthUnits: number): PlacedTextBar => ({
  id: `tb-${row}-${startIndex}`,
  row,
  startIndex,
  widthUnits,
  qr: false,
  config: {
    text: "GO TEAM",
    fontFamily: "sans-serif",
    fontSize: 1,
    textColor: "#fff",
    backgroundColor: "#000",
    textAlign: "center",
    letterSpacing: 0,
  },
});

describe("tallyTiles", () => {
  it("counts each piece once per placed tile", () => {
    const slots = {
      "frame:top-0": t("essentials:red"),
      "frame:top-1": t("essentials:red"),
      "frame:left-0": t("essentials:blue"),
    };
    expect(byKey(tallyTiles(slots, []))).toEqual({
      "essentials:red@1x1": 2,
      "essentials:blue@1x1": 1,
    });
  });

  it("excludes tiles hidden under a text bar — the bar replaces them", () => {
    const slots = {
      "frame:bottom-0": t("essentials:red"),
      "frame:bottom-1": t("essentials:red"), // under the bar
      "frame:bottom-2": t("essentials:red"), // under the bar
      "frame:top-0": t("essentials:blue"),
    };
    expect(byKey(tallyTiles(slots, [bar("bottom", 1, 2)]))).toEqual({
      "essentials:red@1x1": 1,
      "essentials:blue@1x1": 1,
    });
  });

  it("counts a multi-cell snappet as ONE part, not one per covered cell", () => {
    // The covered cells hold no record of their own (see utils/snappet), so the
    // anchor-only tally is already right — this pins that down.
    const slots: Record<string, PlacedTile> = {
      "frame:wing-left-2": { pieceId: "school:banner", setId: "school", span: { cols: 2, rows: 2 } },
    };
    const entry = tallyTiles(slots, []).get(tallyKey("school:banner", { cols: 2, rows: 2 }));
    expect(entry).toEqual({ pieceId: "school:banner", span: { cols: 2, rows: 2 }, qty: 1 });
  });

  it("merges two same-piece same-span snappets into one row (qty 2)", () => {
    const slots: Record<string, PlacedTile> = {
      "frame:top-0": ts("school:flag", { cols: 2, rows: 4 }),
      "frame:top-4": ts("school:flag", { cols: 2, rows: 4 }),
    };
    const tally = tallyTiles(slots, []);
    expect(tally.size).toBe(1);
    expect(tally.get(tallyKey("school:flag", { cols: 2, rows: 4 }))?.qty).toBe(2);
  });

  it("splits the SAME piece at DIFFERENT spans into separate rows", () => {
    const slots: Record<string, PlacedTile> = {
      "frame:top-0": ts("school:flag", { cols: 2, rows: 4 }),
      "frame:left-0": t("school:flag"), // 1x1
    };
    expect(byKey(tallyTiles(slots, []))).toEqual({
      "school:flag@2x4": 1,
      "school:flag@1x1": 1,
    });
  });

  it("treats an absent span and an explicit 1x1 as the SAME key", () => {
    const slots: Record<string, PlacedTile> = {
      "frame:top-0": t("essentials:red"), // span absent
      "frame:top-1": ts("essentials:red", { cols: 1, rows: 1 }), // explicit 1x1
    };
    const tally = tallyTiles(slots, []);
    expect(tally.size).toBe(1);
    expect(tally.get("essentials:red@1x1")?.qty).toBe(2);
  });

  it("the print queue agrees with the tally on how many faces are produced", () => {
    const slots = {
      "frame:top-0": t("unknown:navy"),
      "frame:top-1": t("unknown:navy"),
      "frame:bottom-0": t("unknown:navy"), // under the bar → not produced
    };
    const bars = [bar("bottom", 0, 1)];
    const tallied = Array.from(tallyTiles(slots, bars).values()).reduce((a, v) => a + v.qty, 0);
    const { queue, skippedBlankTiles, oversizedTiles } = buildPrintQueue(slots, bars);
    expect(queue.length + skippedBlankTiles + oversizedTiles).toBe(tallied);
    expect(tallied).toBe(2);
    expect(oversizedTiles).toBe(0);
  });

  it("surfaces a multi-cell snappet as oversized rather than seating it in a 1x1 pocket", () => {
    const slots: Record<string, PlacedTile> = {
      "frame:top-0": ts("unknown:navy", { cols: 2, rows: 4 }), // does not fit a pocket
      "frame:top-4": t("unknown:navy"), // ordinary 1x1
    };
    const { queue, skippedBlankTiles, oversizedTiles } = buildPrintQueue(slots, []);
    expect(oversizedTiles).toBe(1); // the 2x4 is one part, kept out of the pocket queue
    // getPiece(unknown) has no artwork and defaults to white, so the 1x1 grabs a
    // blank snappet (skipped, not queued) — the point here is only that the 2x4 is
    // NOT mis-seated as a pocket.
    expect(skippedBlankTiles).toBe(1);
    expect(queue.length).toBe(0);
  });
});
