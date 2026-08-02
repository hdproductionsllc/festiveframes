import { describe, it, expect } from "vitest";
import { tabPath, tabClipPath, tabTextBox, tabSkirt, frameTab } from "./bottom-tab";
import { SCHOOL_SLIM_FRAME_CONFIG, SCHOOL_FRAME_CONFIG } from "@/lib/constants/frame";
import type { BottomTab } from "@/lib/types";

// ─── The keystone's shape ────────────────────────────────────────────────────
//
// One outline, sampled here into plain points, so the browser's `clip-path` and
// the print sheet's canvas path draw the SAME curve. Leaving the corners to each
// renderer's own primitive would be two curves and two chances to drift, which is
// the failure mode this whole module exists to prevent.

const PPI = 100;
const SQUARE: BottomTab = { riseInches: 1, baseInches: 6, topInches: 4 };
const ROUND: BottomTab = { ...SQUARE, cornerRadiusInches: 0.4 };

describe("tabPath — the outline", () => {
  it("a mitred tab is the six-point trapezoid it always was", () => {
    const p = tabPath(SQUARE, 500, 300, PPI, 10);
    expect(p.points).toHaveLength(6);
    expect(p.rim).toHaveLength(4);
    // Down the left skirt, up the slope, across, down, down the right skirt.
    expect(p.points[0]).toEqual({ x: 200, y: 310 });
    expect(p.points[5]).toEqual({ x: 800, y: 310 });
  });

  it("rounding the top corners adds points there and NOWHERE else", () => {
    const p = tabPath(ROUND, 500, 300, PPI, 10);
    // The base corners are still the rim's endpoints, exactly.
    expect(p.rim[0]).toEqual({ x: 200, y: 300 });
    expect(p.rim[p.rim.length - 1]).toEqual({ x: 800, y: 300 });
    // …and the skirt is still two points, one at each end.
    expect(p.points[0]).toEqual({ x: 200, y: 310 });
    expect(p.points[p.points.length - 1]).toEqual({ x: 800, y: 310 });
    expect(p.points).toHaveLength(p.rim.length + 2);
    expect(p.rim.length).toBeGreaterThan(12);
  });

  it("NEVER rounds the base corners — that is where the tab meets the bar", () => {
    // Rounding them would carve two notches out of solid material, and the join is
    // the one place on this shape that has to read as continuous.
    for (const tab of [SQUARE, ROUND, { ...ROUND, cornerRadiusInches: 5 }]) {
      const p = tabPath(tab, 500, 300, PPI, 10);
      expect(p.rim[0].y, "the left base corner lifted off the bar").toBe(300);
      expect(p.rim[p.rim.length - 1].y, "the right base corner lifted off the bar").toBe(300);
      expect(p.rim[0].x).toBe(200);
      expect(p.rim[p.rim.length - 1].x).toBe(800);
    }
  });

  it("keeps the whole outline inside the tab's own box", () => {
    // A Bézier can bulge past its endpoints if the control point is placed wrong;
    // this shape must stay within [left, left+base] x [topY, barTop].
    const p = tabPath(ROUND, 500, 300, PPI, 0);
    for (const pt of p.rim) {
      expect(pt.x).toBeGreaterThanOrEqual(200 - 1e-9);
      expect(pt.x).toBeLessThanOrEqual(800 + 1e-9);
      expect(pt.y).toBeGreaterThanOrEqual(200 - 1e-9);
      expect(pt.y).toBeLessThanOrEqual(300 + 1e-9);
    }
  });

  it("clamps a radius bigger than the edges can give", () => {
    // Asking for more round than there is edge must not invert the shape.
    const p = tabPath({ ...SQUARE, cornerRadiusInches: 99 }, 500, 300, PPI, 0);
    const xs = p.rim.map((q) => q.x);
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(200 - 1e-9);
    expect(Math.max(...xs)).toBeLessThanOrEqual(800 + 1e-9);
    // Still monotonically left-to-right: no crossed-over outline.
    for (let i = 1; i < xs.length; i++) expect(xs[i]).toBeGreaterThanOrEqual(xs[i - 1] - 1e-9);
  });
});

describe("tabClipPath — the CSS twin of that outline", () => {
  it("traces the same points as the canvas path", () => {
    // The whole contract of this module. Same tab, same units: the clip polygon's
    // vertices must be the outline's, in the tab box's own coordinates.
    const p = tabPath(ROUND, 500, 300, PPI, 10);
    const css = tabClipPath(ROUND, PPI, 10);
    const nums = [...css.matchAll(/(-?[\d.]+)px (-?[\d.]+)px/g)].map((m) => ({
      x: Number(m[1]),
      y: Number(m[2]),
    }));
    expect(nums).toHaveLength(p.points.length);
    p.points.forEach((pt, i) => {
      // The path is anchored at the bar; the clip at the box's top-left.
      expect(nums[i].x).toBeCloseTo(pt.x - p.left, 1);
      expect(nums[i].y).toBeCloseTo(pt.y - (300 - p.rise), 1);
    });
  });

  it("the FILL shape flares to full width at the base and keeps the skirt", () => {
    // The seam fix: the rim is an outside edge, and below the base there is no
    // outside. An inner shape inset on all four sides leaves a strip of rim down
    // each side of the skirt; clipping the outer layer instead kills the skirt.
    const css = tabClipPath(ROUND, PPI, 10, 6);
    const pts = [...css.matchAll(/(-?[\d.]+)px (-?[\d.]+)px/g)].map((m) => ({
      x: Number(m[1]),
      y: Number(m[2]),
    }));
    const rise = ROUND.riseInches * PPI;
    const base = ROUND.baseInches * PPI;
    const atBaseOrBelow = pts.filter((q) => q.y >= rise - 1e-9);
    expect(Math.min(...atBaseOrBelow.map((q) => q.x))).toBe(0);
    expect(Math.max(...atBaseOrBelow.map((q) => q.x))).toBe(base);
    expect(Math.max(...pts.map((q) => q.y))).toBeCloseTo(rise + 10, 6);
    // …while ABOVE the base it is inset, leaving the rim visible.
    const aboveBase = pts.filter((q) => q.y < rise - 1e-9);
    expect(Math.min(...aboveBase.map((q) => q.x))).toBeGreaterThan(0);
    expect(Math.min(...aboveBase.map((q) => q.y))).toBeCloseTo(6, 6);
  });
});

describe("tabTextBox — room for the tagline", () => {
  it("measures the width where the TEXT starts, not at the narrow top edge", () => {
    // The tab is a trapezoid, so taking its narrowest width threw away real room —
    // and on a long school name the width is what binds.
    const box = tabTextBox(SQUARE, PPI);
    expect(box.width).toBeGreaterThan(SQUARE.topInches * PPI * 0.92);
    expect(box.width).toBeLessThan(SQUARE.baseInches * PPI);
  });

  it("grows with the tab, so a bigger keystone means bigger type", () => {
    const small = tabTextBox({ ...SQUARE, riseInches: 0.6 }, PPI);
    const big = tabTextBox({ ...SQUARE, riseInches: 1.0 }, PPI);
    expect(big.height / small.height).toBeCloseTo(1 / 0.6, 5);
  });

  it("leaves the tagline clear of the sloped sides", () => {
    const box = tabTextBox(SQUARE, PPI);
    const rise = SQUARE.riseInches * PPI;
    const top = SQUARE.topInches * PPI;
    const base = SQUARE.baseInches * PPI;
    // The tab's actual width at the text's top edge.
    const yTop = (rise - box.height) / 2;
    const widthThere = top + (base - top) * (yTop / rise);
    expect(box.width).toBeLessThan(widthThere);
  });
});

describe("tabSkirt — how far the fill reaches into the bar", () => {
  it("clears the bar's surround, rim AND the bevel inside it", () => {
    // Sized from ONE CELL, which is what the bar's own chrome is measured against.
    // Both renderers derived it from the TAB before and both left a line.
    const unit = 300;
    expect(tabSkirt(unit)).toBeGreaterThan(unit * 0.09);
    expect(tabSkirt(unit)).toBeLessThan(unit * 0.2);
  });

  it("scales with the cell, so it is the same depth at every zoom", () => {
    expect(tabSkirt(600) / tabSkirt(300)).toBeGreaterThan(1.9);
    expect(tabSkirt(600) / tabSkirt(300)).toBeLessThan(2.1);
  });
});

describe("frameTab", () => {
  it("finds the slim fork's tab and nothing on the live frame", () => {
    expect(frameTab(SCHOOL_SLIM_FRAME_CONFIG)).not.toBeNull();
    expect(frameTab(SCHOOL_FRAME_CONFIG)).toBeNull();
  });

  it("the shipped tab has rounded top corners and clears the plate's date line", () => {
    const tab = frameTab(SCHOOL_SLIM_FRAME_CONFIG)!;
    expect(tab.cornerRadiusInches).toBeGreaterThan(0);
    // How far up the plate face it reaches at the centre. Missouri's bicentennial
    // plate prints "1821 * 2021" about 1.08" up, so this has to stay under that.
    const c = SCHOOL_SLIM_FRAME_CONFIG;
    const barTop = (c.leftSlots + 1) * c.tileSizeInches;
    const plateBottom = (c.heightInches - c.plateHeightInches) / 2 + c.plateHeightInches;
    expect(plateBottom - (barTop - tab.riseInches)).toBeLessThan(1.0);
  });
});
