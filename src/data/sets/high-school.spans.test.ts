import { describe, it, expect } from "vitest";
import sharp from "sharp";
import path from "node:path";
import { highSchoolSet } from "./high-school";
import { minSpanFor, MIN_ART_SPAN } from "@/lib/utils/snappet";

/**
 * A badge's footprint must match the shape of its artwork.
 *
 * This exists because the shapes drifted silently and nobody noticed for two
 * commits. The intake trims each badge to its own bounds without padding it back
 * out to a square, so the files carry real aspect ratios — 0.50 for a trumpet lying
 * flat, 3.07 for an upright torch — while the rebuild declared all forty-eight of
 * them square. `contain` then fits a 3:1 torch to the tile's height and leaves two
 * thirds of it empty. Re-cut a badge at a different crop and the declaration here
 * has to move with it, so the test measures the PNG rather than trusting a list.
 */

const PUBLIC = path.join(process.cwd(), "public");
const TALL_AT = 1.45;   // h/w at or above this is portrait
const WIDE_AT = 0.69;   // h/w at or below this is landscape

function shapeOf(aspect: number): "tall" | "wide" | "square" {
  if (aspect >= TALL_AT) return "tall";
  if (aspect <= WIDE_AT) return "wide";
  return "square";
}

function shapeOfSpan(span: { cols: number; rows: number }): "tall" | "wide" | "square" {
  if (span.rows > span.cols) return "tall";
  if (span.cols > span.rows) return "wide";
  return "square";
}

const pieces = highSchoolSet.pieces.filter((p) => p.artworkUrl && p.defaultSpan);

describe("high-school footprints track their artwork", () => {
  it("has pieces to check", () => {
    expect(pieces.length).toBeGreaterThan(40);
  });

  it.each(pieces.map((p) => [p.name, p] as const))(
    "%s declares a footprint matching its art",
    async (_name, piece) => {
      const file = path.join(PUBLIC, piece.artworkUrl!);
      const { width, height } = await sharp(file).metadata();
      expect(width, `${piece.artworkUrl} has no width`).toBeTruthy();
      const aspect = height! / width!;
      expect(shapeOfSpan(piece.defaultSpan!)).toBe(shapeOf(aspect));
    },
  );

  it("keeps at least one portrait and one landscape piece", () => {
    // The regression this guards was the total disappearance of both, so assert
    // the buckets are non-empty rather than only that each piece is self-consistent.
    const shapes = pieces.map((p) => shapeOfSpan(p.defaultSpan!));
    expect(shapes).toContain("tall");
    expect(shapes).toContain("wide");
  });
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
