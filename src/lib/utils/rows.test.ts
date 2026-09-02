import { describe, expect, it } from "vitest";
import {
  DEFAULT_FRAME_CONFIG,
  SCHOOL_FLUSH_FRAME_CONFIG,
  SCHOOL_FRAME_CONFIG,
  SCHOOL_JULY_SLIM_FRAME_CONFIG,
  SCHOOL_SLIM_FRAME_CONFIG,
  getRenderHeightInches,
} from "@/lib/constants/frame";
import {
  bannerRowBox,
  baseBottomRow,
  gridRowCount,
  isBannerOnlyRow,
  plateTopCoverInches,
  plateTopInches,
  rowHeightInches,
  rowTopInches,
  topBarHeightInches,
} from "@/lib/utils/rows";

const LEGACY = [
  ["default", DEFAULT_FRAME_CONFIG],
  ["school", SCHOOL_FRAME_CONFIG],
  ["slim", SCHOOL_SLIM_FRAME_CONFIG],
  ["july-slim", SCHOOL_JULY_SLIM_FRAME_CONFIG],
] as const;

describe("rows: every frame that predates the field is unchanged", () => {
  it.each(LEGACY)("%s: every row is one tile tall and rows start at row * tile", (_, c) => {
    const t = c.tileSizeInches;
    expect(topBarHeightInches(c)).toBe(t);
    for (let row = 0; row < gridRowCount(c); row++) {
      expect(rowHeightInches(c, row)).toBe(t);
      expect(rowTopInches(c, row)).toBeCloseTo(row * t, 12);
      expect(isBannerOnlyRow(c, row)).toBe(false);
    }
  });

  it.each(LEGACY)("%s: the plate is centred in the base ring", (_, c) => {
    const centred = (c.heightInches - c.plateHeightInches) / 2;
    expect(plateTopInches(c)).toBeCloseTo(centred, 12);
    expect(plateTopCoverInches(c)).toBeCloseTo(c.tileSizeInches - centred, 12);
  });

  it.each(LEGACY)("%s: the bottom banner sits on the base bottom row", (_, c) => {
    expect(bannerRowBox(c, "top")).toEqual({ y: 0, h: c.tileSizeInches });
    const b = bannerRowBox(c, "bottom");
    expect(b.y).toBeCloseTo(c.heightInches - c.tileSizeInches, 12);
    expect(b.h).toBe(c.tileSizeInches);
  });
});

describe("rows: the flush-top frame", () => {
  const c = SCHOOL_FLUSH_FRAME_CONFIG;

  it("has a 0.75 in top bar and one-inch rows below it", () => {
    expect(topBarHeightInches(c)).toBe(0.75);
    expect(rowHeightInches(c, 0)).toBe(0.75);
    expect(rowHeightInches(c, 1)).toBe(1);
    expect(isBannerOnlyRow(c, 0)).toBe(true);
    expect(isBannerOnlyRow(c, 1)).toBe(false);
  });

  it("stacks 0.75 + 5 + 1 to exactly 6.75 in, 7 rows", () => {
    expect(gridRowCount(c)).toBe(7);
    expect(baseBottomRow(c)).toBe(6);
    expect(rowTopInches(c, 1)).toBe(0.75);
    expect(rowTopInches(c, 6)).toBe(5.75);
    const bottom = rowTopInches(c, 6) + rowHeightInches(c, 6);
    expect(bottom).toBe(6.75);
    expect(getRenderHeightInches(c)).toBe(6.75);
  });

  it("is FLUSH: the plate's top edge is the frame's top edge", () => {
    expect(plateTopCoverInches(c)).toBe(0.75);
    expect(plateTopInches(c)).toBe(0);
    // Plate bottom at 6.0; frame bottom at 6.75; so 0.75 hangs below the plate and
    // the bottom row covers 0.25 of the face.
    expect(bannerRowBox(c, "bottom")).toEqual({ y: 5.75, h: 1 });
    expect(6 - bannerRowBox(c, "bottom").y).toBeCloseTo(0.25, 12);
  });
});
