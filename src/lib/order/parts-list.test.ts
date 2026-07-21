import { describe, it, expect } from "vitest";
import { buildPartsList, buildPanelPartsList, skuFor, partsListCsv, partsListHtml, type BuildPartsListInput } from "./parts-list";
import { DEFAULT_FRAME_CONFIG, SCHOOL_FRAME_CONFIG } from "@/lib/constants/frame";
import type { PlacedTile, TileSpan } from "@/lib/types";

// Stage 5: the parts list is span-aware. A multi-cell snappet is a DISTINCT
// physical part from a 1x1 of the same art. These tests pin that down AND prove
// the regression bar: an all-1x1 design renders byte-identical to before.
//
// Pieces here (`test:*`) intentionally do NOT exist in the sets data, so the
// output is deterministic (name falls back to the id, color to #FFFFFF) and
// independent of the artwork catalogue.

const t = (pieceId: string, span?: TileSpan): PlacedTile => ({ pieceId, setId: "test", ...(span ? { span } : {}) });

const base: Omit<BuildPartsListInput, "slots"> = {
  textBars: [],
  qrCode: { enabled: false, url: "", size: 0 },
  plateState: "assembled",
  designName: "Test",
  tileSizeInches: 0.99,
  dieCut: false,
};

describe("skuFor", () => {
  it("leaves a 1x1 SKU unchanged (absent or explicit 1x1)", () => {
    expect(skuFor("test:flag")).toBe("TES-FLAG");
    expect(skuFor("test:flag", { cols: 1, rows: 1 })).toBe("TES-FLAG");
  });
  it("appends a size suffix for a multi-cell snappet", () => {
    expect(skuFor("test:flag", { cols: 2, rows: 4 })).toBe("TES-FLAG-2X4");
  });
});

describe("buildPartsList — span awareness", () => {
  it("merges two same-piece same-span snappets into one row, qty 2", () => {
    const slots: Record<string, PlacedTile> = {
      "frame:top-0": t("test:flag", { cols: 2, rows: 2 }),
      "frame:top-4": t("test:flag", { cols: 2, rows: 2 }),
    };
    const parts = buildPartsList({ ...base, slots });
    expect(parts.rows).toHaveLength(1);
    expect(parts.rows[0].qty).toBe(2);
    expect(parts.rows[0].sku).toBe("TES-FLAG-2X2");
  });

  it("splits the same piece at different spans into two rows", () => {
    const slots: Record<string, PlacedTile> = {
      "frame:top-0": t("test:flag", { cols: 2, rows: 4 }),
      "frame:left-0": t("test:flag"), // 1x1
    };
    const parts = buildPartsList({ ...base, slots });
    expect(parts.rows).toHaveLength(2);
    expect(parts.rows.map((r) => r.sku).sort()).toEqual(["TES-FLAG", "TES-FLAG-2X4"]);
  });

  it("counts a 2x4 as ONE part (+1 tiles) but EIGHT cells, with the right size string", () => {
    const slots: Record<string, PlacedTile> = {
      "frame:top-0": t("test:flag", { cols: 2, rows: 4 }),
      "frame:left-0": t("test:red"),
      "frame:left-1": t("test:red"),
    };
    // 0.991" pitch → 2 cols = 1.98", 4 rows = 3.96" (2dp).
    const parts = buildPartsList({ ...base, slots, tileSizeInches: 0.991 });
    const flag = parts.rows.find((r) => r.pieceId === "test:flag")!;
    expect(flag.span).toEqual({ cols: 2, rows: 4 });
    expect(flag.size).toBe("1.98 x 3.96");
    expect(flag.qty).toBe(1);
    expect(parts.totalTiles).toBe(3); // 1 flag + 2 red — physical parts
    expect(parts.totalCells).toBe(10); // 8 flag cells + 2 red cells
  });

  it("shows the size column and cell total in the rendered CSV / HTML when multi-cell", () => {
    const slots: Record<string, PlacedTile> = {
      "frame:top-0": t("test:flag", { cols: 2, rows: 4 }),
    };
    const parts = buildPartsList({ ...base, slots, tileSizeInches: 0.991 });
    const csv = partsListCsv(parts, "1042", "Jane");
    expect(csv).toContain('"Size (in)"');
    expect(csv).toContain('"1.98 x 3.96"');
    expect(csv).toContain('"Total cells","8"');
    const html = partsListHtml(parts);
    expect(html).toContain("Size (in)");
    expect(html).toContain("Total cells");
    expect(html).toContain("1.98 x 3.96");
  });
});

describe("buildPartsList — 1x1 regression bar (byte-identical output)", () => {
  const slots: Record<string, PlacedTile> = {
    "frame:top-0": t("test:alpha"),
    "frame:top-1": t("test:alpha"),
    "frame:left-0": t("test:beta"),
  };
  const parts = buildPartsList({ ...base, slots });

  it("totalCells equals totalTiles when every part is 1x1", () => {
    expect(parts.totalTiles).toBe(3);
    expect(parts.totalCells).toBe(3);
  });

  it("renders the CSV exactly as it did before spans existed", () => {
    const expected = [
      '"Order #","1042"',
      '"Customer","Jane"',
      '"Design","Test"',
      '"Tile size (in)","0.990"',
      '"Plate","assembled"',
      "",
      '"Part #","Tile","Color","Qty"',
      '"TES-ALPHA","test:alpha","#FFFFFF","2"',
      '"TES-BETA","test:beta","#FFFFFF","1"',
      '"","","Total tiles","3"',
      "",
      '"Custom parts (text bars)"',
      '"Text","Font","Row","Size (tiles)","Size (in)"',
    ].join("\r\n");
    expect(partsListCsv(parts, "1042", "Jane")).toBe(expected);
  });

  it("renders the HTML with the original 4-column table (no Size, no cell total)", () => {
    const html = partsListHtml(parts);
    expect(html).not.toContain("Total cells");
    expect(html).toContain("Total tiles");
    expect(html).toContain('colspan="3"');
    expect(html).not.toContain('colspan="4"');
  });
});

describe("buildPanelPartsList — panel grouping (school)", () => {
  const panelBase = { ...base, frameConfig: SCHOOL_FRAME_CONFIG };

  it("groups snappets in two different panels into two buckets, in reading order", () => {
    const slots: Record<string, PlacedTile> = {
      // wing-left panel (a 1x2 mascot snappet)
      "frame:wing-left-0": t("test:mascot", { cols: 1, rows: 2 }),
      // top panel (a plain tile)
      "frame:top-5": t("test:star"),
    };
    const list = buildPanelPartsList({ ...panelBase, slots });
    expect(list.panels.map((p) => p.panel)).toEqual(["wing-left", "top"]);
    const left = list.panels.find((p) => p.panel === "wing-left")!;
    expect(left.label).toBe("Left panel");
    expect(left.rows.map((r) => r.pieceId)).toEqual(["test:mascot"]);
    expect(left.totalTiles).toBe(1);
    expect(left.totalCells).toBe(2); // 1x2 snappet
    const top = list.panels.find((p) => p.panel === "top")!;
    expect(top.rows.map((r) => r.pieceId)).toEqual(["test:star"]);
    expect(top.totalCells).toBe(1);
  });

  it("does NOT merge the same piece across different panels (flat list would)", () => {
    const slots: Record<string, PlacedTile> = {
      "frame:wing-left-0": t("test:flag"),
      "frame:wing-right-0": t("test:flag"),
    };
    const list = buildPanelPartsList({ ...panelBase, slots });
    // Flat view merges into ONE qty-2 row…
    expect(list.rows).toHaveLength(1);
    expect(list.rows[0].qty).toBe(2);
    // …but the panel view keeps them as two separate single-part panels.
    expect(list.panels.map((p) => p.panel)).toEqual(["wing-left", "wing-right"]);
    expect(list.panels.every((p) => p.totalTiles === 1)).toBe(true);
  });

  it("a /build 1x1 design's flat half is byte-identical to buildPartsList (no panels leak in)", () => {
    const slots: Record<string, PlacedTile> = {
      "frame:top-0": t("test:alpha"),
      "frame:top-1": t("test:alpha"),
      "frame:left-0": t("test:beta"),
    };
    const flat = buildPartsList({ ...base, slots });
    const panelList = buildPanelPartsList({ ...base, frameConfig: DEFAULT_FRAME_CONFIG, slots });
    // The flat fields are unchanged; only an extra `panels` array is added.
    const { panels, ...flatHalf } = panelList;
    expect(flatHalf).toEqual(flat);
    expect(Array.isArray(panels)).toBe(true);
  });
});

describe("buildPanelPartsList — section suppression (direct-print panels)", () => {
  const panelBase = { ...base, frameConfig: SCHOOL_FRAME_CONFIG };
  const textCfg = {
    text: "CLASS OF 2027",
    fontFamily: "Inter",
    fontSize: 1,
    textColor: "#ffffff",
    backgroundColor: "#0a2342",
    textAlign: "center" as const,
    letterSpacing: 0,
  };

  // "frame:wing-right-0" (col 13) and the right rail "frame:right-0" (col 12, a corner)
  // both belong to the wing-right PANEL; "frame:top-3" is an inner top-panel cell.
  const slots: Record<string, PlacedTile> = {
    "frame:wing-right-0": t("test:ring"),
    "frame:right-0": t("test:corner"),
    "frame:top-3": t("test:star"),
  };

  it("switching a panel to TEXT drops its tiles and emits ONE direct-print part", () => {
    const list = buildPanelPartsList({
      ...panelBase,
      slots,
      sections: { "wing-right": { mode: "text", text: textCfg } },
    });
    const right = list.panels.find((p) => p.panel === "wing-right")!;
    // No phantom tiles — just the direct-print panel piece.
    expect(right.rows).toHaveLength(1);
    expect(right.rows[0].pieceId).toBe("panel:wing-right");
    expect(right.rows[0].sku).toBe("PANEL-WING-RIGHT-TEXT");
    expect(right.rows[0].color).toBe("#0a2342");
    expect(right.rows[0].qty).toBe(1);
    // wing-right panel is 2 cols × 8 rows on the school frame.
    expect(right.rows[0].span).toEqual({ cols: 2, rows: 8 });
    expect(right.totalTiles).toBe(1);
    expect(right.totalCells).toBe(16);
    // The still-tiled top panel is untouched.
    const top = list.panels.find((p) => p.panel === "top")!;
    expect(top.rows.map((r) => r.pieceId)).toEqual(["test:star"]);
  });

  it("the flat half excludes the suppressed tiles and lists the direct-print part", () => {
    const list = buildPanelPartsList({
      ...panelBase,
      slots,
      sections: { "wing-right": { mode: "image", imageUrl: "/school/mascot.png" } },
    });
    const flatPieces = list.rows.map((r) => r.pieceId);
    // The two wing-right tiles are gone (not produced); the panel part is listed.
    expect(flatPieces).not.toContain("test:ring");
    expect(flatPieces).not.toContain("test:corner");
    expect(flatPieces).toContain("panel:wing-right");
    expect(flatPieces).toContain("test:star");
    // Totals reflect: 1 star tile + 1 direct-print panel = 2 parts, 1 + 16 cells.
    expect(list.totalTiles).toBe(2);
    expect(list.totalCells).toBe(17);
    const img = list.rows.find((r) => r.pieceId === "panel:wing-right")!;
    expect(img.sku).toBe("PANEL-WING-RIGHT-IMG");
    expect(img.color).toBe("#FFFFFF");
  });

  it("is byte-identical to the no-sections list when every section is 'tiles'", () => {
    const withTiles = buildPanelPartsList({
      ...panelBase,
      slots,
      sections: { "wing-right": { mode: "tiles" }, top: { mode: "tiles" } },
    });
    const without = buildPanelPartsList({ ...panelBase, slots });
    expect(withTiles).toEqual(without);
  });
});
