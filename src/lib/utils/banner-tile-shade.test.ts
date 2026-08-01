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

function faceOf(ctx: SKRSContext2D, x: number, y: number): string {
  return [...ctx.getImageData(Math.round(x), Math.round(y), 1, 1).data].slice(0, 3).join(",");
}

describe("banners and tiles paint the same field", () => {
  it("the print path gives a banner and a badge the identical face colour", () => {
    const bar: PlacedTextBar = {
      id: "b", row: "bottom", startIndex: 0, widthUnits: 8,
      config: { ...DEFAULT_BOTTOM_BAR, text: "" }, qr: false,
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

    // Both sampled on the FACE — inside the element, clear of its bevel band, and
    // clear of the artwork (the torch is narrow, so the tile's left quarter is field).
    const banner = faceOf(napi, br.x + br.width * 0.5, br.y + br.height * 0.1);
    const tile = faceOf(napi, m.tileSize * 0.22, m.tileSize * 2.0);

    expect(tile).toBe(banner);
    expect(banner).toBe("27,42,74"); // and it is the declared colour, not a shade of it
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
