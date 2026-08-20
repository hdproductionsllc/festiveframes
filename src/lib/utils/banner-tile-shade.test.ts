import { it, expect, describe } from "vitest";
import { createCanvas } from "@napi-rs/canvas";
import type { SKRSContext2D } from "@napi-rs/canvas";
import {
  drawSchoolFrame,
  schoolCanvasSize,
  schoolRenderMetrics,
  schoolBannerRect,
  type SchoolDesign,
  type SchoolImageBundle,
} from "@/lib/utils/compose-school-frame";
import { SCHOOL_FRAME_CONFIG } from "@/lib/constants/frame";
import { DEFAULT_BOTTOM_BAR } from "@/lib/constants/defaults";
import { bevelGradient, TILE_BG } from "@/lib/utils/tile-theme";
import { channelDelta, fieldColour, SHADE_TOLERANCE } from "@/lib/utils/__testing__/field-sample";
import type { PlacedTextBar, PlacedTile } from "@/lib/types";

/**
 * THE BANNERS MUST BE THE SAME SHADE OF BLUE AS THE PANELS.
 *
 * Reported four or five times by the owner and "fixed" twice in the wrong place,
 * because the obvious suspect was always the colour — and the colour was never
 * wrong. Both elements were handed the identical `#1B2A4A`. What differed was how
 * much of each shape the bevel's bright end covered: the stops sat at fixed
 * FRACTIONS of the run, so on a square badge the extremes only reached the small
 * corner triangles, while on a 6:1 banner the run is vertical and that same
 * fraction became a broad full-width band at 55% white across the top of the bar.
 *
 * The fix is that the bevel is a band of constant physical width and the FACE is
 * left bare. This test pins the outcome rather than the mechanism: sample the face
 * of a banner and the face of a tile in the real renderer and demand they match.
 */

/**
 * HOW THE FACE IS MEASURED, and why it is neither one pixel nor a lettered bar.
 *
 * This used to read a SINGLE coordinate at 10% of the banner's height, on a bar
 * built with `text: ""`. Two things were wrong with that and only one of them was
 * visible:
 *
 *  · An empty string is falsy, so `drawSchoolFrame` substituted "YOUR TEXT HERE".
 *    The bar under test was covered in placeholder lettering, and that one
 *    coordinate sat in a glyph's drop shadow — reading 26,41,72 against the
 *    declared 27,42,74. Font fallback decides where the glyphs land, so the
 *    contamination moves with the platform: exact on the Linux box the baseline was
 *    taken on, a unit out on Windows. The bar now carries a single SPACE, which is
 *    truthy, so nothing is drawn on the face at all.
 *
 *  · One pixel is not a field. `fieldColour` takes the MODE over an inset grid,
 *    which is what "the face is this colour" actually means, and it cannot be
 *    swung by whatever happens to sit under one coordinate.
 *
 * The flood this file exists to catch — a bevel's bright end covering the face at
 * 55% white, well over a hundred units off — is still unmissable either way.
 */
const FIELD = { steps: 16, inset: 0.2 } as const;

describe("banners and tiles paint the same field", () => {
  it("the print path gives a banner and a badge the identical face colour", () => {
    const bar: PlacedTextBar = {
      id: "b", row: "bottom", startIndex: 0, widthUnits: 8,
      // A SPACE, not "". An empty string is falsy and `drawSchoolFrame` swaps in
      // "YOUR TEXT HERE" — lettering that covers most of the bar, so the face this
      // test is about would barely be in frame. A space is truthy, so the
      // placeholder never fires and the banner renders as bare field.
      config: { ...DEFAULT_BOTTOM_BAR, text: " " }, qr: false,
    };
    const design: SchoolDesign = {
      frameConfig: SCHOOL_FRAME_CONFIG,
      slots: {
        "frame:wing-left-1": {
          pieceId: "hs:torch", setId: "hs", span: { cols: 1, rows: 2 },
        } as PlacedTile,
      },
      textBars: [bar],
      qrCode: { enabled: false, url: "", size: 0 },
      plateState: "MO",
      sections: {},
    };
    const bundle: SchoolImageBundle = {
      plate: null, pieces: new Map(), snappets: new Map(),
      sections: new Map(), qr: null, logos: new Map(),
    };
    const { width: W, height: H } = schoolCanvasSize(SCHOOL_FRAME_CONFIG, 150);
    const cv = createCanvas(W, H);
    const ctx = cv.getContext("2d") as unknown as CanvasRenderingContext2D;
    drawSchoolFrame(ctx, design, bundle, W);

    const napi = ctx as unknown as SKRSContext2D;
    const m = schoolRenderMetrics(SCHOOL_FRAME_CONFIG, W);
    const br = schoolBannerRect(bar, m);

    // Both measured as the FIELD of their own rectangle — the mode over an inset
    // grid, so the bevel band at the edges and the placeholder lettering in the
    // middle are both outvoted by the bare face they sit on.
    const banner = fieldColour(napi, br, FIELD);
    const tile = fieldColour(
      napi,
      { x: 0, y: m.tileSize, width: m.tileSize, height: m.tileSize * 2 },
      FIELD,
    );

    expect(channelDelta(tile, banner), `tile ${tile} vs banner ${banner}`)
      .toBeLessThanOrEqual(SHADE_TOLERANCE);
    // …and it is the DECLARED colour, not a shade of it. #1B2A4A = 27,42,74.
    expect(channelDelta(banner, "27,42,74"), `banner field was ${banner}`)
      .toBeLessThanOrEqual(SHADE_TOLERANCE);
  });

  it("no bevel ink lands on the face of ANY shape", () => {
    // The invariant behind the above, checked directly across the shapes the frame
    // actually uses: a one-row bar, a two-row panel, a square badge, a portrait badge.
    for (const [w, h] of [[1800, 150], [1800, 300], [150, 150], [150, 300]]) {
      const face = bevelGradient(TILE_BG.navy, w, h).filter(([at]) => at > 0 && at < 1);
      expect(face.length).toBe(2);
      for (const [, colour] of face) expect(colour).toMatch(/,\s*0\)$/);
    }
  });
});
