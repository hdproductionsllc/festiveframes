import { describe, it, expect } from "vitest";
import { evaluateResolution, TARGET_DPI, BLOCK_DPI } from "./print-resolution";

// A representative school LEFT panel: ~2" x ~8".
const PANEL = { width: 2, height: 8 };

describe("evaluateResolution", () => {
  it("computes DPI at the limiting axis", () => {
    // 600 px wide / 2" = 300 dpi; 2400 px tall / 8" = 300 dpi → 300 dpi.
    const v = evaluateResolution({ width: 600, height: 2400 }, PANEL);
    expect(v.dpi).toBeCloseTo(300, 5);
    expect(v.level).toBe("green");
    expect(v.blocked).toBe(false);
  });

  it("takes the WORSE axis, not the average", () => {
    // Wide axis is 300 dpi but the short axis is only 150 dpi → limited to 150.
    const v = evaluateResolution({ width: 600, height: 1200 }, PANEL);
    expect(v.dpi).toBeCloseTo(150, 5);
    expect(v.level).toBe("red");
  });

  it("grades green at/above the target DPI", () => {
    const v = evaluateResolution({ width: 2 * TARGET_DPI, height: 8 * TARGET_DPI }, PANEL);
    expect(v.level).toBe("green");
  });

  it("grades amber between the block and target DPI", () => {
    const dpi = 250; // 200 <= 250 < 300
    const v = evaluateResolution({ width: 2 * dpi, height: 8 * dpi }, PANEL);
    expect(v.dpi).toBeCloseTo(250, 5);
    expect(v.level).toBe("amber");
    expect(v.blocked).toBe(false);
  });

  it("blocks (red) below the hard-block DPI", () => {
    const dpi = BLOCK_DPI - 1; // 199
    const v = evaluateResolution({ width: 2 * dpi, height: 8 * dpi }, PANEL);
    expect(v.level).toBe("red");
    expect(v.blocked).toBe(true);
  });

  it("lowers DPI as the crop zooms in (fewer source pixels behind the panel)", () => {
    const wide = evaluateResolution({ width: 1200, height: 4800 }, PANEL); // 600 dpi
    const tight = evaluateResolution({ width: 300, height: 1200 }, PANEL); // 150 dpi
    expect(tight.dpi).toBeLessThan(wide.dpi);
    expect(wide.level).toBe("green");
    expect(tight.level).toBe("red");
  });

  it("reports the smaller cropped side as minSidePx", () => {
    const v = evaluateResolution({ width: 640, height: 2000 }, PANEL);
    expect(v.minSidePx).toBe(640);
  });

  it("does not divide by zero on a degenerate target", () => {
    const v = evaluateResolution({ width: 500, height: 500 }, { width: 0, height: 0 });
    expect(v.dpi).toBe(0);
    expect(v.level).toBe("red");
  });
});
