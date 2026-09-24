import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { readdirSync } from "node:fs";
import path from "node:path";
import { highSchoolSet } from "./high-school";
import { minSpanFor, MIN_ART_SPAN } from "@/lib/utils/snappet";

/**
 * ALL BADGE ARTWORK IS SQUARE (owner, 2026-09-23).
 *
 * Every badge cell a parent can fill on the shipping frame is square — the side
 * column is three 2.25 in squares — and uploads are cropped square. The library
 * used to carry real aspect ratios instead (0.50 for a trumpet lying flat, 3.07 for
 * an upright torch) with TALL / WIDE footprints declared to match. That is what let
 * a 395 x 1000 violin spill out of a fixed-size tile on the homepage, and it is a
 * second shape rule living beside the cell's own.
 *
 * So the intake trims each badge to its own bounds and THEN pads it to a centred
 * transparent square (scripts/cut-enamel-pins.mjs). Both renderers draw art with
 * `contain`, so in a square cell the padded file draws exactly as the trimmed art
 * did. This file measures the PNGs rather than trusting a list, as before — the
 * earlier version of it pinned the opposite rule (portrait and landscape pieces
 * must exist), and that assertion is replaced here, not dropped.
 */

const PUBLIC = path.join(process.cwd(), "public");
const DIR = path.join(PUBLIC, "tiles/high-school");
/** The 300 DPI gate for a 2x2 tile at the 0.991 in pitch — the long side of the
 *  art itself, not of the padding, has to clear it. */
const PRINT_FLOOR = Math.ceil(0.991 * 2 * 300);

const pieces = highSchoolSet.pieces.filter((p) => p.artworkUrl && p.defaultSpan);
const files = readdirSync(DIR).filter((f) => f.endsWith(".png")).sort();

describe("high-school badge art is square", () => {
  it("has pieces and files to check", () => {
    expect(pieces.length).toBeGreaterThan(40);
    expect(files.length).toBeGreaterThan(40);
  });

  it.each(files)("%s is a square canvas", async (f) => {
    const { width, height } = await sharp(path.join(DIR, f)).metadata();
    expect(width, `${f} has no width`).toBeTruthy();
    expect(width, `${f} is ${width} x ${height}`).toBe(height);
  });

  it.each(files)("%s is trimmed THEN padded, and its art clears the print floor", async (f) => {
    const file = path.join(DIR, f);
    const { width: side } = await sharp(file).metadata();
    const { info } = await sharp(file).trim({ threshold: 1 }).toBuffer({ resolveWithObject: true });
    const artLong = Math.max(info.width, info.height);
    // The art touches the square on its long axis: padded to a square, never
    // floated in extra margin that `contain` would then shrink.
    expect(artLong, `${f}: art ${info.width} x ${info.height} floats in a ${side} square`).toBe(side);
    expect(artLong, `${f}: art long side ${artLong}px is under the ${PRINT_FLOOR}px gate`).toBeGreaterThanOrEqual(PRINT_FLOOR);
  });

  it.each(pieces.map((p) => [p.name, p] as const))(
    "%s declares a square footprint, matching its art",
    async (_name, piece) => {
      const { width, height } = await sharp(path.join(PUBLIC, piece.artworkUrl!)).metadata();
      expect(width).toBe(height);
      // A 1x2 or 2x1 cell holding square art draws it at half the cell's long side.
      const { cols, rows } = piece.defaultSpan!;
      expect(cols, `${piece.artworkUrl} is square art on a ${cols}x${rows} footprint`).toBe(rows);
    },
  );
});

describe("the readability floor keeps a piece's shape", () => {
  it("no longer squares a portrait badge", () => {
    // The bug: a per-axis max against a square MIN_ART_SPAN turned {1,2} into {2,2},
    // so no piece could ever seat at the portrait footprint it declared.
    const tall = { defaultSpan: { cols: 1, rows: 2 } };
    expect(minSpanFor(tall, MIN_ART_SPAN)).toEqual({ cols: 1, rows: 2 });
  });

  it("no longer squares a landscape badge", () => {
    const wide = { defaultSpan: { cols: 2, rows: 1 } };
    expect(minSpanFor(wide, MIN_ART_SPAN)).toEqual({ cols: 2, rows: 1 });
  });

  it("still floors a square badge at 2x2", () => {
    const square = { defaultSpan: { cols: 2, rows: 2 } };
    expect(minSpanFor(square, MIN_ART_SPAN)).toEqual({ cols: 2, rows: 2 });
  });

  it("scales a small declaration up to the product floor, keeping shape", () => {
    const tiny = { defaultSpan: { cols: 1, rows: 1 } };
    expect(minSpanFor(tiny, MIN_ART_SPAN)).toEqual({ cols: 2, rows: 2 });
  });

  it("leaves a calibration tile exact", () => {
    const cal = { defaultSpan: { cols: 3, rows: 1 }, spanRequired: true };
    expect(minSpanFor(cal, MIN_ART_SPAN)).toEqual({ cols: 1, rows: 1 });
  });

  it("keeps the 1x1 floor for a piece with no art", () => {
    expect(minSpanFor(null)).toEqual({ cols: 1, rows: 1 });
  });
});
