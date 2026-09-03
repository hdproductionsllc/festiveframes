// ─── The flush frame's PRINT FILES, as the exporter cuts them ────────────────
//
// `composeSchoolPanels` is browser-only (it needs `document`), so this re-runs its
// exact recipe in node — the same `panelBleedBox` + `panelRowsPx` crop, the same
// 1:1 `drawImage`, the same `clearOutsideTab` and landscape rotation — and pins the
// result to the parts Bill prints, in inches at 300 DPI. If the exporter and this
// disagree, the exporter has drifted from its own geometry.

import { describe, expect, it } from "vitest";
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
  const box = panelBleedBox(panelRects(C)[id], tilePx, 0, panelOverhangTiles(id, C), panelRowsPx(C, DPI));
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

  it("the assembled sheet is 15 x 6.75 in at 300 DPI and fits the E1 bed", () => {
    expect([W, H]).toEqual([4500, 2025]);
    expect(W / DPI).toBeLessThanOrEqual(EUFY_BED_LONG_INCHES);
    expect(H / DPI).toBeLessThanOrEqual(EUFY_BED_SHORT_INCHES);
  });

  // The sizes Bill confirms, in inches. Side columns are exported rotated to
  // landscape, which is how they go on the bed; the part is still 2 wide x 6.75 tall.
  const PARTS: Array<[SectionId, number, number]> = [
    ["top", 11, 0.75],
    ["bottom", 11, 1.8],
    ["wing-left", 6.75, 2],
    ["wing-right", 6.75, 2],
  ];

  it.each(PARTS)("%s exports at %s x %s in", (id, wIn, hIn) => {
    const panel = cutPanel(full, id);
    expect(panel.width / DPI).toBeCloseTo(wIn, 6);
    expect(panel.height / DPI).toBeCloseTo(hIn, 6);
    // ...and that IS the part size the resolution gate uses (rotation aside).
    const part = panelSizeInches(id, C);
    expect([part.width, part.height].sort()).toEqual([wIn, hIn].sort());
  });

  it("the top runner carries two screw notches 2.0 and 9.0 in from its left end, open on its lower edge", () => {
    const panel = cutPanel(full, "top");
    const ctx = panel.getContext("2d");
    // The runner sits between the side columns, one rail cell in from the inner
    // frame's left edge: a notch at x from the inner edge sits at x - 1 on the part.
    const rail = C.tileSizeInches;
    const notches = screwNotches(C).filter((n) => n.bar === "top");
    expect(notches).toHaveLength(2);
    const centres = notches.map((n) => n.x + n.width / 2 - rail).sort((a, b) => a - b);
    expect(centres[0]).toBeCloseTo(2.0, 9);
    expect(centres[1]).toBeCloseTo(9.0, 9);
    for (const n of notches) {
      const cx = (n.x + n.width / 2 - rail) * DPI;
      const cy = (n.y + n.height / 2) * DPI;
      expect(alphaAt(ctx, cx, cy)).toBe(0); // inside the notch: no ink
      expect(alphaAt(ctx, cx, panel.height - 2)).toBe(0); // it is OPEN at the lower edge
      expect(alphaAt(ctx, cx, 3)).toBe(255); // the web above it: ink
      expect(alphaAt(ctx, cx + 0.5 * DPI, cy)).toBe(255); // beside it: ink
    }
    // Corners and middle of the runner print solid.
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

  it("a side column prints solid over its whole 2 x 6.75, the short top row included", () => {
    const panel = cutPanel(full, "wing-left"); // rotated: 6.75 wide x 2 tall
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
