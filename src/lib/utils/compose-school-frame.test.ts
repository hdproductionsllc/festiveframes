import { describe, it, expect } from "vitest";
import { createCanvas, loadImage, type SKRSContext2D } from "@napi-rs/canvas";
import { writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import {
  clearOutsideTab,
  schoolCanvasSize,
  shouldRotateForBed,
  schoolBannerRect,
  schoolRenderMetrics,
  drawSchoolFrame,
  backFillTransparent,
  panelBleedBox,
  SCHOOL_PRINT_DPI,
  SCHOOL_PANEL_BLEED_INCHES,
  type SchoolDesign,
  type DrawableImage,
  type SchoolImageBundle,
} from "./compose-school-frame";
import { panelOverhangTiles, panelRects, panelSizeInches } from "@/lib/utils/panels";
import { SCHOOL_FRAME_CONFIG, SCHOOL_SLIM_FRAME_CONFIG } from "@/lib/constants/frame";
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

describe("panelBleedBox (per-panel export crop — bleed adds AREA via edge-clamp, never scale)", () => {
  const tilePx = 300; // 1in tile at 300 DPI, round numbers
  const bleedPx = 12; // 0.04in bleed

  it("keeps content 1:1 and pads by exactly one bleed on every side", () => {
    for (const id of ["wing-left", "wing-right", "top", "bottom"] as const) {
      const box = panelBleedBox(panelRects(SCHOOL_FRAME_CONFIG)[id], tilePx, bleedPx);
      // The load-bearing invariant: the panel art is NOT stretched to fill the bleed —
      // the output is exactly the content plus one bleed of margin on each side.
      expect(box.outW).toBe(Math.round(box.contentW) + 2 * box.bleed);
      expect(box.outH).toBe(Math.round(box.contentH) + 2 * box.bleed);
    }
  });

  it("adds exactly one bleed of margin on every side around the true content", () => {
    const box = panelBleedBox({ col0: 0, col1: 1, row0: 0, row1: 7 }, tilePx, bleedPx);
    expect(box.contentW).toBe(2 * tilePx); // 2 tiles wide (rail + wing)
    expect(box.contentH).toBe(8 * tilePx); // full 8-row height
    expect(box.outW).toBe(2 * tilePx + 2 * bleedPx);
    expect(box.outH).toBe(8 * tilePx + 2 * bleedPx);
    // Content is sampled from its TRUE position (no reaching into the neighbour); the
    // bleed margin is filled by edge-clamp, so the crop origin is the panel's own corner.
    expect(box.contentX).toBe(0 * tilePx);
    expect(box.contentY).toBe(0 * tilePx);
    expect(box.bleed).toBe(bleedPx);
  });

  // ─── The KEYSTONE is not a run of cells ──────────────────────────────────
  //
  // Every printed part used to be exactly its own rectangle of the lattice, so the
  // crop could be the rectangle. The tab broke that: it rises out of the bottom
  // panel into the plate opening, off the grid, and the crop cut it clean off.
  // Nothing failed — the export produced a plain bar and a wrong print file.

  it("crops the slim frame's bottom panel TALL enough to keep the tab", () => {
    const cfg = SCHOOL_SLIM_FRAME_CONFIG;
    const tab = cfg.bottomTab!;
    const tilePx = cfg.tileSizeInches * 300;
    const rect = panelRects(cfg).bottom;
    const over = panelOverhangTiles("bottom", cfg);

    const box = panelBleedBox(rect, tilePx, 0, over);
    // The tab's topmost pixel, in the full render's coordinates.
    const tabTopY = (rect.row0 * cfg.tileSizeInches - tab.riseInches) * 300;
    expect(box.contentY).toBeCloseTo(tabTopY, 6);
    // …and the crop still ends at the bar's bottom edge.
    expect(box.contentY + box.contentH).toBeCloseTo((rect.row1 + 1) * tilePx, 6);
    // It is exactly one rise taller than the row it sits on, and no wider.
    expect(box.contentH - tilePx).toBeCloseTo(tab.riseInches * 300, 6);
    expect(box.contentX).toBeCloseTo(rect.col0 * tilePx, 6);
  });

  it("WOULD have cut 178px off the tab without the overhang", () => {
    // The defect, pinned. This is the call the export used to make.
    const cfg = SCHOOL_SLIM_FRAME_CONFIG;
    const tilePx = cfg.tileSizeInches * 300;
    const naive = panelBleedBox(panelRects(cfg).bottom, tilePx, 0);
    const fixed = panelBleedBox(panelRects(cfg).bottom, tilePx, 0, panelOverhangTiles("bottom", cfg));
    expect(naive.contentY - fixed.contentY).toBeCloseTo(cfg.bottomTab!.riseInches * 300, 6);
    expect(Math.round(naive.contentY - fixed.contentY)).toBe(178);
  });

  it("leaves every panel of a frame WITHOUT a tab exactly its own rectangle", () => {
    // The overhang must be inert on the live frame, whose bottom banner is cells.
    for (const id of ["wing-left", "wing-right", "top", "bottom"] as const) {
      expect(panelOverhangTiles(id, SCHOOL_FRAME_CONFIG)).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
      const rect = panelRects(SCHOOL_FRAME_CONFIG)[id];
      const a = panelBleedBox(rect, 300, 12);
      const b = panelBleedBox(rect, 300, 12, panelOverhangTiles(id, SCHOOL_FRAME_CONFIG));
      expect(a).toEqual(b);
    }
    // …and only the BOTTOM panel of the slim frame carries one.
    for (const id of ["wing-left", "wing-right", "top"] as const) {
      expect(panelOverhangTiles(id, SCHOOL_SLIM_FRAME_CONFIG).top).toBe(0);
    }
    expect(panelOverhangTiles("bottom", SCHOOL_SLIM_FRAME_CONFIG).top).toBeGreaterThan(0);
  });

  it("gives the resolution gate the TALLER bottom panel to divide by", () => {
    // The gate asks how big the part is. A part that is 1.586in tall must not be
    // measured as 0.991in, or a low-res upload passes on a third less area than it
    // is actually printed across.
    const cfg = SCHOOL_SLIM_FRAME_CONFIG;
    const size = panelSizeInches("bottom", cfg);
    expect(size.height).toBeCloseTo(cfg.tileSizeInches + cfg.bottomTab!.riseInches, 6);
    expect(size.height).toBeGreaterThan(cfg.tileSizeInches);
    // Unchanged on the live frame.
    expect(panelSizeInches("bottom", SCHOOL_FRAME_CONFIG).height).toBeCloseTo(2 * SCHOOL_FRAME_CONFIG.tileSizeInches, 6);
  });

  it("a zero bleed is an exact, unpadded panel crop", () => {
    const box = panelBleedBox({ col0: 2, col1: 5, row0: 0, row1: 0, }, tilePx, 0);
    expect(box.contentX).toBe(2 * tilePx);
    expect(box.bleed).toBe(0);
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
    logos: new Map(),
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

    // A wing-left tile cell: its FIELD is the standard white, sampled well inside the
    // bevel so the edge treatment doesn't colour the reading.
    const inset = Math.round(m.tileSize * 0.5);
    const fieldPx = napi.getImageData(inset, inset, 1, 1).data;
    expect([fieldPx[0], fieldPx[1], fieldPx[2]]).toEqual([255, 255, 255]);

    // ...and the faux bevel really is drawn: the extreme corner sits in the edge, so
    // it must be DARKER than the field. (On a light field the bevel shades rather
    // than highlights — a white highlight on white would be invisible.)
    const edgePx = napi.getImageData(2, 2, 1, 1).data;
    expect(edgePx[0]).toBeLessThan(fieldPx[0]);

    const png = canvas.toBuffer("image/png");
    expect(png.length).toBeGreaterThan(1000);

    // Write the sample artifact ONLY when asked, so the committed test stays portable.
    const out = process.env.SCHOOL_SAMPLE_OUT;
    if (out) writeFileSync(out, png);
  });
});

describe("print backing — nothing reaches the printer transparent", () => {
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
    slots: {
      "frame:wing-left-0": { pieceId: "x:none", setId: "x" } as PlacedTile,
      "frame:top-5": { pieceId: "x:none", setId: "x", span: { cols: 2, rows: 1 } } as PlacedTile,
    },
    textBars: [bottomBar],
    qrCode: { enabled: false, url: "", size: 0 },
    plateState: "MO",
    sections: {},
  };
  const bundle = (): SchoolImageBundle => ({
    plate: null, pieces: new Map(), snappets: new Map(), sections: new Map(), qr: null, logos: new Map(),
  });

  it("leaves NO transparent or partial-alpha pixel anywhere in the render", () => {
    // The defect this closes is one only the operator could see: a badge is a rounded
    // rectangle, so the seams and corners between badges carried no ink and the bare
    // snappet showed through on the printed part. Most of the frame is empty in this
    // seeded design, which is exactly what makes it a good test — every empty cell,
    // every seam and the whole margin must still come back opaque.
    const { width: W, height: H } = schoolCanvasSize(SCHOOL_FRAME_CONFIG, 75); // small = fast
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d") as unknown as CanvasRenderingContext2D;
    drawSchoolFrame(ctx, design, bundle(), W);

    const data = (ctx as unknown as SKRSContext2D).getImageData(0, 0, W, H).data;
    let open = 0;
    let partial = 0;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] === 0) open++;
      else if (data[i] < 255) partial++;
    }
    expect(open, "fully transparent pixels").toBe(0);
    // Partial alpha matters just as much: a half-covered edge pixel composites onto
    // whatever is behind it, so on the part it fringes toward the substrate colour.
    expect(partial, "partial-alpha pixels").toBe(0);
  });

  it("paints the backing UNDER the art, never over it", () => {
    // destination-over is load-bearing. Painted the other way round this would be a
    // black rectangle, and every test above it would still pass.
    const { width: W, height: H } = schoolCanvasSize(SCHOOL_FRAME_CONFIG, 75);
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d") as unknown as CanvasRenderingContext2D;
    drawSchoolFrame(ctx, design, bundle(), W);
    const napi = ctx as unknown as SKRSContext2D;

    const m = schoolRenderMetrics(SCHOOL_FRAME_CONFIG, W);
    // The banner keeps its own colour...
    const br = schoolBannerRect(bottomBar, m);
    const bannerPx = napi.getImageData(Math.round(br.x + 3), Math.round(br.y + 3), 1, 1).data;
    expect([bannerPx[0], bannerPx[1], bannerPx[2]]).toEqual([34, 68, 170]);
    // ...and a placed tile's white field survives untouched.
    const inset = Math.round(m.tileSize * 0.5);
    const fieldPx = napi.getImageData(inset, inset, 1, 1).data;
    expect([fieldPx[0], fieldPx[1], fieldPx[2]]).toEqual([255, 255, 255]);
    // An EMPTY cell prints nothing, so it is backing colour — the frame's far bottom
    // -right corner is outside every panel of this seeded design.
    const emptyPx = napi.getImageData(W - 2, H - 2, 1, 1).data;
    expect([emptyPx[0], emptyPx[1], emptyPx[2], emptyPx[3]]).toEqual([0, 0, 0, 255]);
  });

  it("backFillTransparent is a no-op over already-opaque pixels", () => {
    const c = createCanvas(4, 4);
    const x = c.getContext("2d") as unknown as CanvasRenderingContext2D;
    x.fillStyle = "#ff0000";
    x.fillRect(0, 0, 2, 4); // left half red, right half untouched
    backFillTransparent(x, 4, 4);
    const d = (x as unknown as SKRSContext2D).getImageData(0, 0, 4, 4).data;
    expect([d[0], d[1], d[2], d[3]]).toEqual([255, 0, 0, 255]); // red survives
    const right = (x as unknown as SKRSContext2D).getImageData(3, 0, 1, 1).data;
    expect([right[0], right[1], right[2], right[3]]).toEqual([0, 0, 0, 255]); // filled
  });
});

describe("panel files are the SAME SIZE as the parts they print", () => {
  it("exports every panel at its true physical size", () => {
    // The defect the operator hit on import: bleed is a FIXED 0.08in total, so it
    // lands as a different percentage on every panel — 7.4% on the top strip's
    // height, 3.9% across a wing — and each file had to be hand-corrected by a
    // different amount. These panels are a continuous sheet with no cut edge, so
    // there was never anything for the bleed to protect.
    const dpi = SCHOOL_PRINT_DPI;
    const tilePx = SCHOOL_FRAME_CONFIG.tileSizeInches * dpi;
    const rects = panelRects(SCHOOL_FRAME_CONFIG);
    for (const id of ["wing-left", "wing-right", "top", "bottom"] as const) {
      const rc = rects[id];
      const box = panelBleedBox(rc, tilePx, SCHOOL_PANEL_BLEED_INCHES * dpi);
      const partW = (rc.col1 - rc.col0 + 1) * SCHOOL_FRAME_CONFIG.tileSizeInches;
      const partH = (rc.row1 - rc.row0 + 1) * SCHOOL_FRAME_CONFIG.tileSizeInches;
      // Within one pixel at print resolution — rounding, not a size difference.
      expect(Math.abs(box.outW / dpi - partW), `${id} width`).toBeLessThan(1 / dpi + 1e-9);
      expect(Math.abs(box.outH / dpi - partH), `${id} height`).toBeLessThan(1 / dpi + 1e-9);
    }
  });

  it("still honours an explicit bleed for a run that wants overspray", () => {
    const box = panelBleedBox({ col0: 0, col1: 1, row0: 0, row1: 7 }, 300, 12);
    expect(box.outW).toBe(2 * 300 + 24);
  });
});

describe("uploaded art's field — the white-logo-vanishing fix", () => {
  // A cut-out logo: transparent everywhere except a small white mark in the middle.
  // Under the OLD hard-coded white field, every pixel around the mark printed white
  // and the mark itself was white-on-white — invisible on the physical part.
  function whiteLogo(): DrawableImage {
    const c = createCanvas(200, 200);
    const g = c.getContext("2d");
    g.fillStyle = "#ffffff";
    g.fillRect(80, 80, 40, 40);
    return c as unknown as DrawableImage;
  }

  const designWith = (field?: string): SchoolDesign => ({
    frameConfig: SCHOOL_FRAME_CONFIG,
    slots: {
      "frame:wing-left-0": {
        pieceId: "upload:x",
        setId: "upload",
        span: { cols: 2, rows: 2 },
        image: { url: "data:,", ...(field ? { field } : {}) },
      } as PlacedTile,
    },
    textBars: [],
    qrCode: { enabled: false, url: "", size: 0 },
    plateState: "MO",
    sections: {},
  });

  function renderAndProbe(design: SchoolDesign) {
    const { width: W, height: H } = schoolCanvasSize(SCHOOL_FRAME_CONFIG, 75);
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d") as unknown as CanvasRenderingContext2D;
    const bundle: SchoolImageBundle = {
      plate: null, pieces: new Map(), sections: new Map(), qr: null, logos: new Map(),
      snappets: new Map([["frame:wing-left-0", whiteLogo()]]),
    };
    drawSchoolFrame(ctx, design, bundle, W);
    // Probe INSIDE the snappet, off-centre — art is drawn `cover` so the white mark
    // sits at the middle; this pixel is the field showing through the transparency.
    const m = schoolRenderMetrics(SCHOOL_FRAME_CONFIG, W);
    const x = Math.round(m.tileSize * 0.55);
    const y = Math.round(m.tileSize * 1.55);
    const d = (ctx as unknown as SKRSContext2D).getImageData(x, y, 1, 1).data;
    return [d[0], d[1], d[2]] as const;
  }

  it("paints the STORED field (navy) under light art, so a white logo prints visible", () => {
    const [r, g, b] = renderAndProbe(designWith("#1B2A4A"));
    expect(b).toBeGreaterThan(r); // navy family, categorically not white
    expect(r + g + b).toBeLessThan(400);
  });

  it("keeps the legacy white field for designs saved before the field existed", () => {
    const [r, g, b] = renderAndProbe(designWith(undefined));
    expect(r + g + b).toBeGreaterThan(700); // white-ish, byte-compatible with old prints
  });
});

describe("clearOutsideTab — the panel file describes the PART, not a rectangle", () => {
  const cfg = SCHOOL_SLIM_FRAME_CONFIG;
  const DPI = 300;
  const tab = cfg.bottomTab!;

  /** A bottom-panel crop, filled solid, then knocked out. Alpha is the silhouette. */
  function silhouette() {
    const tilePx = cfg.tileSizeInches * DPI;
    const box = panelBleedBox(panelRects(cfg).bottom, tilePx, Math.round(0.04 * DPI), panelOverhangTiles("bottom", cfg));
    const c = createCanvas(box.outW, box.outH);
    const cx = c.getContext("2d") as unknown as CanvasRenderingContext2D;
    cx.fillStyle = "#123456";
    cx.fillRect(0, 0, box.outW, box.outH);
    clearOutsideTab(cx, box, cfg, tilePx, DPI);
    const napi = cx as unknown as SKRSContext2D;
    const alphaAt = (x: number, y: number) => napi.getImageData(Math.round(x), Math.round(y), 1, 1).data[3];
    return { box, alphaAt, tilePx };
  }

  it("keeps the bar solid and clears the shoulders beside the tab", () => {
    const { box, alphaAt } = silhouette();
    const barTopY = box.bleed + tab.riseInches * DPI;
    // Well inside the bar: untouched.
    expect(alphaAt(box.outW / 2, barTopY + 40)).toBe(255);
    expect(alphaAt(box.bleed + 20, box.outH - box.bleed - 20)).toBe(255);
    // Beside the tab, above the bar: gone, bleed margin included.
    expect(alphaAt(box.bleed + 20, barTopY - 40)).toBe(0);
    expect(alphaAt(box.outW - box.bleed - 20, barTopY - 40)).toBe(0);
    expect(alphaAt(4, 4)).toBe(0);
  });

  it("keeps the tab itself, all the way up to its apex", () => {
    const { box, alphaAt } = silhouette();
    const cx = box.bleed + box.contentW / 2;
    // The crop STARTS at the apex — that is what the overhang is — so a few pixels
    // down from the top edge of the content is already inside the tab. Reading this
    // as `contentH - rise` instead put the trapezoid a whole rise too low and erased
    // the tab; the test that caught it was a pixel read, not a look.
    expect(alphaAt(cx, box.bleed + 6)).toBe(255);
    expect(alphaAt(cx, box.bleed + tab.riseInches * DPI - 6)).toBe(255);
  });

  it("clears OUTSIDE the sloped sides, not a bounding box", () => {
    const { box, alphaAt } = silhouette();
    const cx = box.bleed + box.contentW / 2;
    const halfTop = (tab.topInches * DPI) / 2;
    const halfBase = (tab.baseInches * DPI) / 2;
    // Just past the narrow top edge, near the apex: outside the slope.
    expect(alphaAt(cx - halfTop - 25, box.bleed + 8)).toBe(0);
    expect(alphaAt(cx + halfTop + 25, box.bleed + 8)).toBe(0);
    // Just inside the wide base, near the bar: the slope has opened out to here.
    expect(alphaAt(cx - halfBase + 25, box.bleed + tab.riseInches * DPI - 8)).toBe(255);
    expect(alphaAt(cx + halfBase - 25, box.bleed + tab.riseInches * DPI - 8)).toBe(255);
  });

  it("is INERT on a frame with no tab — every live panel is untouched", () => {
    const tilePx = SCHOOL_FRAME_CONFIG.tileSizeInches * DPI;
    for (const id of ["wing-left", "wing-right", "top", "bottom"] as const) {
      const box = panelBleedBox(panelRects(SCHOOL_FRAME_CONFIG)[id], tilePx, 12, panelOverhangTiles(id, SCHOOL_FRAME_CONFIG));
      const c = createCanvas(box.outW, box.outH);
      const cx2 = c.getContext("2d") as unknown as CanvasRenderingContext2D;
      cx2.fillStyle = "#123456";
      cx2.fillRect(0, 0, box.outW, box.outH);
      clearOutsideTab(cx2, box, SCHOOL_FRAME_CONFIG, tilePx, DPI);
      const napi = cx2 as unknown as SKRSContext2D;
      expect(napi.getImageData(2, 2, 1, 1).data[3], `${id} was clipped`).toBe(255);
      expect(napi.getImageData(box.outW - 2, 2, 1, 1).data[3], `${id} was clipped`).toBe(255);
    }
  });
});
