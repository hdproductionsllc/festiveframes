import { describe, it, expect } from "vitest";
import { createCanvas, loadImage, type SKRSContext2D } from "@napi-rs/canvas";
import { writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import {
  schoolCanvasSize,
  shouldRotateForBed,
  schoolBannerRect,
  schoolRenderMetrics,
  drawSchoolFrame,
  panelBleedBox,
  SCHOOL_PRINT_DPI,
  type SchoolDesign,
  type SchoolImageBundle,
} from "./compose-school-frame";
import { panelRects } from "@/lib/utils/panels";
import { SCHOOL_FRAME_CONFIG } from "@/lib/constants/frame";
import { getTotalWidthInches, getRenderHeightInches } from "@/lib/constants/frame";
import type { BottomBarConfig, PlacedTextBar, PlacedTile, SectionState } from "@/lib/types";

// The compose function itself is browser-bound (Image + IndexedDB), so the node
// suite exercises (a) the PURE geometry helpers and (b) the environment-agnostic
// `drawSchoolFrame` against a @napi-rs/canvas context — the "node-canvas shim" the
// task allows. A seeded design renders to real pixels here with no DOM.

const barConfig = (over: Partial<BottomBarConfig> = {}): BottomBarConfig => ({
  text: "GO WILDCATS",
  fontFamily: "sans-serif",
  fontSize: 1,
  textColor: "#ffffff",
  backgroundColor: "#2244aa",
  textAlign: "center",
  letterSpacing: 0,
  ...over,
});

describe("schoolCanvasSize", () => {
  it("is the whole rendered frame at the given DPI", () => {
    const size = schoolCanvasSize(SCHOOL_FRAME_CONFIG, 300);
    expect(size.width).toBe(Math.round(getTotalWidthInches(SCHOOL_FRAME_CONFIG) * 300));
    expect(size.height).toBe(Math.round(getRenderHeightInches(SCHOOL_FRAME_CONFIG) * 300));
  });
  it("defaults to 300 DPI", () => {
    expect(schoolCanvasSize(SCHOOL_FRAME_CONFIG)).toEqual(
      schoolCanvasSize(SCHOOL_FRAME_CONFIG, SCHOOL_PRINT_DPI),
    );
  });
});

describe("shouldRotateForBed", () => {
  it("keeps the (landscape) school frame unrotated — its long axis already lies along 16.5in", () => {
    const { width, height } = schoolCanvasSize(SCHOOL_FRAME_CONFIG);
    expect(width).toBeGreaterThan(height); // landscape
    expect(shouldRotateForBed(width, height)).toBe(false);
  });
  it("rotates a portrait canvas so its long axis ends up horizontal", () => {
    expect(shouldRotateForBed(100, 200)).toBe(true);
    expect(shouldRotateForBed(200, 100)).toBe(false);
  });
});

describe("schoolBannerRect (the compose-frame banner bug, fixed)", () => {
  const W = schoolCanvasSize(SCHOOL_FRAME_CONFIG).width;
  const m = schoolRenderMetrics(SCHOOL_FRAME_CONFIG, W);
  const H = schoolCanvasSize(SCHOOL_FRAME_CONFIG).height;

  it("offsets the banner by the WING width (compose-frame omits this)", () => {
    expect(m.wingPx).toBeGreaterThan(0);
    const top = schoolBannerRect({ row: "top", startIndex: 2, widthUnits: 6 }, m);
    expect(top.x).toBeCloseTo(m.wingPx + 2 * m.tileSize, 5);
    expect(top.y).toBe(0);
    expect(top.width).toBeCloseTo(6 * m.tileSize, 5);
    expect(top.height).toBeCloseTo(m.tileSize, 5);
  });

  it("pins the BOTTOM banner to the BASE bottom row, not the render-height bottom", () => {
    const bottom = schoolBannerRect({ row: "bottom", startIndex: 0, widthUnits: 8 }, m);
    // baseFrameHeightPx < canvas height, because the school frame has an extra bottom
    // row. compose-frame's `H - tile` would sit the banner a whole row too low.
    expect(m.baseFrameHeightPx).toBeLessThan(H);
    expect(bottom.y).toBeCloseTo(m.baseFrameHeightPx - m.tileSize, 5);
    expect(bottom.y).not.toBeCloseTo(H - m.tileSize, 0);
  });
});

describe("panelBleedBox (per-panel export crop — bleed adds AREA, never scale)", () => {
  const tilePx = 300; // 1in tile at 300 DPI, round numbers
  const bleedPx = 12; // 0.04in bleed

  it("draws 1:1 — source crop size equals output size (no enlargement)", () => {
    for (const id of ["wing-left", "wing-right", "top", "bottom"] as const) {
      const box = panelBleedBox(panelRects(SCHOOL_FRAME_CONFIG)[id], tilePx, bleedPx);
      // The load-bearing invariant: the panel art is NOT stretched to fill the bleed.
      expect(box.srcW).toBe(box.outW);
      expect(box.srcH).toBe(box.outH);
    }
  });

  it("adds exactly one bleed of margin on every side around the true content", () => {
    const box = panelBleedBox({ col0: 0, col1: 1, row0: 0, row1: 7 }, tilePx, bleedPx);
    expect(box.contentW).toBe(2 * tilePx); // 2 tiles wide (rail + wing)
    expect(box.contentH).toBe(8 * tilePx); // full 8-row height
    expect(box.outW).toBe(2 * tilePx + 2 * bleedPx);
    expect(box.outH).toBe(8 * tilePx + 2 * bleedPx);
    // Crop starts one bleed BEFORE the panel's top-left (picks up real adjacent pixels).
    expect(box.srcX).toBe(0 * tilePx - bleedPx);
    expect(box.srcY).toBe(0 * tilePx - bleedPx);
  });

  it("a zero bleed is an exact, unpadded panel crop", () => {
    const box = panelBleedBox({ col0: 2, col1: 5, row0: 0, row1: 0, }, tilePx, 0);
    expect(box.srcX).toBe(2 * tilePx);
    expect(box.outW).toBe(box.contentW);
    expect(box.outH).toBe(box.contentH);
  });
});

describe("drawSchoolFrame (node-canvas render of a seeded design)", () => {
  const bottomBar: PlacedTextBar = {
    id: "tb-1",
    row: "bottom",
    startIndex: 0,
    widthUnits: 8,
    config: barConfig(),
    qr: false,
  };
  const design: SchoolDesign = {
    frameConfig: SCHOOL_FRAME_CONFIG,
    // A couple of empty-piece tiles (white cells), one multi-cell snappet, and a
    // right-panel TEXT section. No remote artwork, so nothing needs preloading.
    slots: {
      "frame:wing-left-0": { pieceId: "x:none", setId: "x" } as PlacedTile,
      "frame:top-5": { pieceId: "x:none", setId: "x", span: { cols: 2, rows: 1 } } as PlacedTile,
    },
    textBars: [bottomBar],
    qrCode: { enabled: false, url: "", size: 0 },
    plateState: "MO",
    sections: {
      "wing-right": { mode: "text", text: barConfig({ text: "CLASS\nOF 2027", backgroundColor: "#aa2222" }) } as SectionState,
    },
  };

  const emptyBundle = (): SchoolImageBundle => ({
    plate: null,
    pieces: new Map(),
    snappets: new Map(),
    sections: new Map(),
    qr: null,
  });

  it("paints the banner background, white tiles, and produces a non-trivial PNG", async () => {
    const { width: W, height: H } = schoolCanvasSize(SCHOOL_FRAME_CONFIG, 150); // smaller = fast
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d") as unknown as CanvasRenderingContext2D;

    // Optionally drop in the real MO plate photo for a nicer sample artifact.
    const bundle = emptyBundle();
    const platePath = path.join(process.cwd(), "public", "plates", "missouri-festive-centered.png");
    if (existsSync(platePath)) {
      try { bundle.plate = await loadImage(platePath); } catch { /* fall back to flat plate */ }
    }

    drawSchoolFrame(ctx, design, bundle, W);

    const m = schoolRenderMetrics(SCHOOL_FRAME_CONFIG, W);
    const napi = ctx as unknown as SKRSContext2D;

    // Banner background near its top-left corner (text is centered, so the corner is
    // the fill color #2244aa).
    const br = schoolBannerRect(bottomBar, m);
    const bannerPx = napi.getImageData(Math.round(br.x + 3), Math.round(br.y + 3), 1, 1).data;
    expect([bannerPx[0], bannerPx[1], bannerPx[2]]).toEqual([34, 68, 170]);

    // A wing-left tile cell (white snappet) at the top-left corner.
    const tilePx = napi.getImageData(2, 2, 1, 1).data;
    expect([tilePx[0], tilePx[1], tilePx[2]]).toEqual([255, 255, 255]);

    const png = canvas.toBuffer("image/png");
    expect(png.length).toBeGreaterThan(1000);

    // Write the sample artifact ONLY when asked, so the committed test stays portable.
    const out = process.env.SCHOOL_SAMPLE_OUT;
    if (out) writeFileSync(out, png);
  });
});
