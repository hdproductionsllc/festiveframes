import { describe, it, expect } from "vitest";
import { TILE_BG, luminance, tileBackground, bevelMetrics, bevelBoxShadow } from "./tile-theme";

describe("luminance", () => {
  it("orders black < mid < white", () => {
    expect(luminance("#000000")).toBeCloseTo(0, 5);
    expect(luminance("#FFFFFF")).toBeCloseTo(1, 5);
    expect(luminance(TILE_BG.navy)).toBeLessThan(0.5);
  });

  it("survives a malformed colour rather than throwing", () => {
    expect(luminance("nope")).toBe(0.5);
    expect(luminance("#abc")).toBe(0.5);
  });
});

describe("tileBackground — the ONE field colour both renderers ask for", () => {
  it("keeps a colour that is already in the standard palette", () => {
    for (const c of Object.values(TILE_BG)) {
      expect(tileBackground({ backgroundColor: c })).toBe(c.toUpperCase());
    }
  });

  it("snaps an off-palette colour into the scheme, preserving light vs dark", () => {
    // A one-off pale colour still wants a LIGHT field; a one-off dark one a dark field.
    expect(tileBackground({ backgroundColor: "#FEFDF8" })).toBe(TILE_BG.white);
    expect(tileBackground({ backgroundColor: "#2D1B4A" })).toBe(TILE_BG.navy);
  });

  it("is case-insensitive about the piece's own colour", () => {
    expect(tileBackground({ backgroundColor: "#ffffff" })).toBe(TILE_BG.white);
  });
});

describe("bevelMetrics", () => {
  it("scales with the tile so a big badge has the same moulding, not a flat edge", () => {
    const small = bevelMetrics(100, 100);
    const big = bevelMetrics(300, 300);
    expect(big.thickness).toBeGreaterThan(small.thickness);
    // Proportional within rounding: both are integers, so a small tile's ratio can
    // sit a little off a big one's without the moulding actually looking different.
    const drift = Math.abs(big.thickness / big.radius - small.thickness / small.radius);
    expect(drift).toBeLessThan(0.1);
  });

  it("uses the SHORT side, so a wide badge isn't given a huge edge", () => {
    expect(bevelMetrics(400, 100).thickness).toBe(bevelMetrics(100, 100).thickness);
  });

  it("never degenerates to a zero-width edge", () => {
    const tiny = bevelMetrics(1, 1);
    expect(tiny.thickness).toBeGreaterThanOrEqual(1);
    expect(tiny.radius).toBeGreaterThanOrEqual(2);
  });

  it("lights a DARK field from the upper-left with a white highlight", () => {
    const m = bevelMetrics(100, 100, TILE_BG.navy);
    expect(m.highlight).toContain("255,255,255");
    expect(m.shade).toContain("0,0,0");
  });

  it("shades a LIGHT field instead — a white highlight on white is invisible", () => {
    // Physically right too: a raised white face cannot get brighter than white, so
    // depth reads as the lit side being shaded LESS than the falling-away side.
    const m = bevelMetrics(100, 100, TILE_BG.white);
    expect(m.highlight).not.toContain("255,255,255");
    const alpha = (c: string) => Number(c.match(/([\d.]+)\)$/)![1]);
    expect(alpha(m.highlight)).toBeLessThan(alpha(m.shade));
  });
});

describe("bevelBoxShadow", () => {
  it("mirrors the printed bevel: inset highlight top-left, shade bottom-right", () => {
    const dark = bevelBoxShadow(TILE_BG.navy);
    expect(dark).toContain("inset 1.5px 1.5px 0 rgba(255,255,255");
    expect(dark).toContain("inset -1.5px -1.5px 0 rgba(0,0,0");
    // And adapts on a light field, exactly like the printed bevel.
    expect(bevelBoxShadow(TILE_BG.white)).not.toContain("rgba(255,255,255");
  });
});
