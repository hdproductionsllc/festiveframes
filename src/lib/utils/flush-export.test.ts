// ─── The flush frame's PRINT FILES, as the exporter cuts them ────────────────
//
// `composeSchoolPanels` is browser-only (it needs `document`), so this re-runs its
// exact recipe in node — the same `panelBleedBox` + `panelRowsPx` crop, the same
// 1:1 `drawImage`, the same `clearOutsideTab` and landscape rotation — and pins the
// result to the parts Bill prints, in inches at 300 DPI. If the exporter and this
// disagree, the exporter has drifted from its own geometry.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createCanvas, type Canvas, type SKRSContext2D } from "@napi-rs/canvas";
import { SCHOOL_FLUSH_FRAME_CONFIG, EUFY_BED_LONG_INCHES, EUFY_BED_SHORT_INCHES } from "@/lib/constants/frame";
import { SCHOOL_DEFAULT_SECTIONS } from "@/lib/constants/defaults";
import { FLUSH_PRESETS, presetTiles } from "@/data/school-presets";
import { panelOverhangTiles, panelRects, panelSizeInches } from "@/lib/utils/panels";
import {
  SCHOOL_PRINT_DPI,
  clearOutsideTab,
  drawSchoolFrame,
  panelBleedBox,
  panelColsPx,
  panelRowsPx,
  schoolCanvasSize,
  type SchoolDesign,
  type SchoolImageBundle,
} from "@/lib/utils/compose-school-frame";
import { screwNotches } from "@/lib/utils/screw-slots";
import type { PlacedTile, SectionId } from "@/lib/types";

const C = SCHOOL_FLUSH_FRAME_CONFIG;
const DPI = SCHOOL_PRINT_DPI;

function seededDesign(): SchoolDesign {
  const preset = FLUSH_PRESETS.find((p) => p.id === "school")!;
  const slots: Record<string, PlacedTile> = {};
  for (const [slot, pieceId, span] of presetTiles(preset, null, null, null)) {
    slots[slot] = { pieceId, setId: pieceId.split(":")[0], span: span ?? { cols: 2, rows: 2 } } as PlacedTile;
  }
  return {
    frameConfig: C,
    slots,
    textBars: [],
    qrCode: { enabled: false, url: "", size: 0 },
    plateState: "MO",
    sections: SCHOOL_DEFAULT_SECTIONS as SchoolDesign["sections"],
    frameColor: "#1f2a5c",
  } as SchoolDesign;
}

const emptyBundle = (): SchoolImageBundle => ({
  plate: null, pieces: new Map(), snappets: new Map(), sections: new Map(), qr: null, logos: new Map(),
});

/** The exporter's recipe, in node. Returns the finished (rotated) panel canvas. */
function cutPanel(full: Canvas, id: SectionId): Canvas {
  const tilePx = C.tileSizeInches * DPI;
  const box = panelBleedBox(
    panelRects(C)[id],
    tilePx,
    0,
    panelOverhangTiles(id, C),
    panelRowsPx(C, DPI, id),
    // The exporter passes this too. Leaving it out here is how this file would
    // cut a 2.000" side column and still call itself the exporter's recipe.
    panelColsPx(C, DPI),
  );
  const c = createCanvas(box.outW, box.outH) as Canvas;
  const cx = c.getContext("2d");
  const { contentX: X, contentY: Y, contentW: W2, contentH: H2, bleed: b } = box;
  cx.drawImage(full, X, Y, W2, H2, b, b, W2, H2);
  clearOutsideTab(cx as unknown as CanvasRenderingContext2D, box, C, tilePx, DPI, id);
  if (c.height <= c.width) return c;
  const rot = createCanvas(c.height, c.width) as Canvas;
  const rx = rot.getContext("2d");
  rx.translate(rot.width / 2, rot.height / 2);
  rx.rotate(Math.PI / 2);
  rx.drawImage(c, -c.width / 2, -c.height / 2);
  return rot;
}

const alphaAt = (ctx: SKRSContext2D, x: number, y: number) =>
  ctx.getImageData(Math.round(x), Math.round(y), 1, 1).data[3];

describe("flush frame: the print files", () => {
  const { width: W, height: H } = schoolCanvasSize(C, DPI);
  const full = createCanvas(W, H) as Canvas;
  drawSchoolFrame(full.getContext("2d") as unknown as CanvasRenderingContext2D, seededDesign(), emptyBundle(), W);

  it("the assembled sheet is 15.5 x 6.75 in at 300 DPI and fits the E1 bed", () => {
    expect([W, H]).toEqual([4650, 2025]);
    expect(W / DPI).toBeLessThanOrEqual(EUFY_BED_LONG_INCHES);
    expect(H / DPI).toBeLessThanOrEqual(EUFY_BED_SHORT_INCHES);
  });

  // The sizes Bill confirms, in inches. Side columns are exported rotated to
  // landscape, which is how they go on the bed; the part is still 2.25 wide x 6.75 tall.
  const PARTS: Array<[SectionId, number, number]> = [
    ["top", 11, 0.75],
    ["bottom", 11, 1.8],
    // 2.25, not 2: the side column is a 1.000" rail plus a 1.25" wing so its three
    // badges are SQUARE (2.25 x 2.25). Landscape here because side columns export
    // rotated — that is how they go on the bed.
    ["wing-left", 6.75, 2.25],
    ["wing-right", 6.75, 2.25],
  ];

  it.each(PARTS)("%s exports at %s x %s in", (id, wIn, hIn) => {
    const panel = cutPanel(full, id);
    expect(panel.width / DPI).toBeCloseTo(wIn, 6);
    expect(panel.height / DPI).toBeCloseTo(hIn, 6);
    // ...and that IS the part size the resolution gate uses (rotation aside).
    const part = panelSizeInches(id, C);
    expect([part.width, part.height].sort()).toEqual([wIn, hIn].sort());
  });

  it("the top runner is a plain rectangle: solid ink edge to edge, no screw cut-outs", () => {
    const panel = cutPanel(full, "top");
    const ctx = panel.getContext("2d");
    expect(screwNotches(C)).toEqual([]);
    // Where the notches would have been (2.0 and 9.0 in from the left end, on the
    // lower edge), and the corners and middle: all ink.
    for (const xIn of [2.0, 9.0]) {
      expect(alphaAt(ctx, xIn * DPI, panel.height - 2)).toBe(255);
      expect(alphaAt(ctx, xIn * DPI, panel.height / 2)).toBe(255);
    }
    for (const [x, y] of [[2, 2], [panel.width - 3, 2], [panel.width / 2, panel.height - 3]]) {
      expect(alphaAt(ctx, x, y)).toBe(255);
    }
  });

  it("the bottom runner is a keystone-shaped part: shoulders clear, bar and tab solid", () => {
    const panel = cutPanel(full, "bottom");
    const ctx = panel.getContext("2d");
    const rise = 0.8 * DPI;
    // Above the bar, outside the tab: plate opening, no ink.
    expect(alphaAt(ctx, 10, 10)).toBe(0);
    expect(alphaAt(ctx, panel.width - 10, 10)).toBe(0);
    // The tab, centred: ink.
    expect(alphaAt(ctx, panel.width / 2, rise / 2)).toBe(255);
    // The bar itself, full width: ink.
    expect(alphaAt(ctx, 5, rise + 0.5 * DPI)).toBe(255);
    expect(alphaAt(ctx, panel.width - 5, rise + 0.5 * DPI)).toBe(255);
    expect(alphaAt(ctx, panel.width / 2, panel.height - 3)).toBe(255);
    // At 0.25 in of cover the bar stops short of the screw heads: no notches, and
    // the bar's upper edge prints solid where they would have been.
    expect(screwNotches(C).filter((n) => n.bar === "bottom")).toHaveLength(0);
    expect(alphaAt(ctx, 2.0 * DPI, rise + 2)).toBe(255);
    expect(alphaAt(ctx, 9.0 * DPI, rise + 2)).toBe(255);
  });

  it("a side column prints solid over its whole 2.25 x 6.75, the short top row included", () => {
    const panel = cutPanel(full, "wing-left"); // rotated: 6.75 wide x 2.25 tall
    const ctx = panel.getContext("2d");
    // Sample a grid of points across the part; every one carries ink (the body
    // backfill closes the seams between badges and the strip above them).
    for (let i = 0; i <= 10; i++) {
      for (let j = 0; j <= 4; j++) {
        const x = 2 + (panel.width - 4) * (i / 10);
        const y = 2 + (panel.height - 4) * (j / 4);
        expect(alphaAt(ctx, x, y), `(${x.toFixed(0)},${y.toFixed(0)})`).toBe(255);
      }
    }
  });
});

// ─── An order is FOUR print files, and this file must cut them the way the exporter does ──
describe("flush frame: the order's part set", () => {
  const { width: W, height: H } = schoolCanvasSize(C, DPI);
  const full = createCanvas(W, H) as Canvas;
  drawSchoolFrame(full.getContext("2d") as unknown as CanvasRenderingContext2D, seededDesign(), emptyBundle(), W);

  it("cuts exactly four panels and none of them is blank", () => {
    // `composeSchoolPanels` silently DROPS a panel that renders blank, and the
    // submit route accepts zero panels. So the guard has to be here: every panel
    // of the shipping frame carries ink after the exporter's own crop.
    const ids: SectionId[] = ["top", "bottom", "wing-left", "wing-right"];
    expect(Object.keys(panelRects(C)).sort()).toEqual([...ids].sort());
    for (const id of ids) {
      const panel = cutPanel(full, id);
      const ctx = panel.getContext("2d");
      const px = ctx.getImageData(0, 0, panel.width, panel.height).data;
      let ink = 0;
      for (let i = 3; i < px.length; i += 4 * 53) if (px[i] > 8) ink++;
      expect(ink, `${id} is blank`).toBeGreaterThan(50);
    }
  });

  it("this file's cutPanel passes the exporter the SAME geometry arguments", () => {
    // The recipe here is a copy of `composeSchoolPanels`, and a copy drifts: it
    // was missing `panelColsPx` for one afternoon while the exporter had it, and
    // cut a 2.000" side column for a 2.250" part. Read the exporter's call.
    const exporter = readFileSync("src/lib/utils/compose-school-frame.ts", "utf8");
    const call = exporter.slice(exporter.indexOf("const box = panelBleedBox("));
    for (const arg of ["panelOverhangTiles(id, config)", "panelRowsPx(config, dpi, id)", "panelColsPx(config, dpi)"]) {
      expect(call.slice(0, 400), `exporter passes ${arg}`).toContain(arg);
    }
    const here = readFileSync("src/lib/utils/flush-export.test.ts", "utf8");
    for (const arg of ["panelOverhangTiles(id, C)", "panelRowsPx(C, DPI, id)", "panelColsPx(C, DPI)"]) {
      expect(here, `this file passes ${arg}`).toContain(arg);
    }
  });
});
