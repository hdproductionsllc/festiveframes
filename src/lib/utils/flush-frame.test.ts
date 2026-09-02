// ─── The flush-top fork, end to end ──────────────────────────────────────────
//
// One geometry, five models of it: the grid, the panel part sizes, the placement
// engine, the print crop, and the fit bench. This file pins them to each other
// and to the numbers the owner and Bill are working from (15 x 6.75, 0.75" top bar
// flush with the plate, 0.75" below it, 2" side columns).

import { describe, expect, it } from "vitest";
import {
  SCHOOL_FLUSH_FRAME_CONFIG,
  SCHOOL_FRAME_CONFIG,
  SCHOOL_SLIM_FRAME_CONFIG,
  getRenderHeightInches,
  getTotalWidthInches,
} from "@/lib/constants/frame";
import { buildGrid, gridInvariantHolds, generateSlots } from "@/lib/utils/slot-generator";
import { panelRects, panelSizeInches, panelOverhangTiles } from "@/lib/utils/panels";
import { canPlace, type PlacementContext } from "@/lib/utils/snappet";
import { sectionBounds } from "@/lib/utils/sections";
import { panelBleedBox, panelRowsPx, schoolBannerRect, schoolRenderMetrics } from "@/lib/utils/compose-school-frame";
import { getPlateArea } from "@/lib/utils/layout";
import { topBarScrewSlots } from "@/lib/utils/screw-slots";
import { FLUSH_SPEC } from "@/lib/fit/spec";
import { computeFit, outlineParts } from "@/lib/fit/geometry";
import { configFromSpec, shippabilityRefusals, specFromConfig } from "@/lib/fit/config-bridge";
import { FLUSH_PRESETS } from "@/data/school-presets";
import type { SectionId } from "@/lib/types";

const C = SCHOOL_FLUSH_FRAME_CONFIG;

describe("flush frame: the lattice", () => {
  it("closes on its own grid at 15 x 6.75", () => {
    expect(gridInvariantHolds(C)).toBe(true);
    expect(getTotalWidthInches(C)).toBe(15);
    expect(getRenderHeightInches(C)).toBe(6.75);
    const grid = buildGrid(C);
    expect(grid.cols).toBe(15);
    expect(grid.rows).toBe(7);
  });

  it("row 0 is 0.75 in tall and every other row is one tile, at any scale", () => {
    for (const width of [150, 1000, 4500]) {
      const scale = width / 15;
      for (const s of generateSlots(C, width)) {
        if (s.row === 0) {
          expect(s.y).toBe(0);
          expect(s.height).toBeCloseTo(0.75 * scale, 9);
        } else {
          expect(s.height).toBeCloseTo(1 * scale, 9);
          expect(s.y).toBeCloseTo((0.75 + (s.row - 1)) * scale, 9);
        }
      }
    }
  });

  it("row 0 is banner-only across the full width, wings included", () => {
    const grid = buildGrid(C);
    for (let col = 0; col < grid.cols; col++) {
      expect(grid.isBannerOnly(0, col)).toBe(true);
      expect(grid.isBannerOnly(1, col)).toBe(false);
    }
    // And no other frame has such a row.
    for (const legacy of [SCHOOL_FRAME_CONFIG, SCHOOL_SLIM_FRAME_CONFIG]) {
      const g = buildGrid(legacy);
      for (let r = 0; r < g.rows; r++) expect(g.isBannerOnly(r, 0)).toBe(false);
    }
  });

  it("the plate's top edge IS the frame's top edge", () => {
    const plate = getPlateArea(C, 1500);
    expect(plate.y).toBe(0);
    expect(plate.height).toBe(600);
    // 0.75 below: the frame runs to 6.75.
    expect(getRenderHeightInches(C) * 100 - (plate.y + plate.height)).toBeCloseTo(75, 9);
  });
});

describe("flush frame: Bill's parts", () => {
  it("prints side 2 x 6.75, top 11 x 0.75, bottom 11 x 1.55 (with keystone)", () => {
    expect(panelSizeInches("wing-left", C)).toEqual({ width: 2, height: 6.75 });
    expect(panelSizeInches("wing-right", C)).toEqual({ width: 2, height: 6.75 });
    expect(panelSizeInches("top", C)).toEqual({ width: 11, height: 0.75 });
    const bottom = panelSizeInches("bottom", C);
    expect(bottom.width).toBe(11);
    expect(bottom.height).toBeCloseTo(1 + 0.55, 9);
  });

  it("sizes each panel the same as the bench's part", () => {
    const parts = outlineParts(FLUSH_SPEC);
    const rectOf = (id: string) => parts.find((p) => p.id === id)?.rect;
    const cases: Array<[SectionId, string]> = [
      ["wing-left", "badges-left"],
      ["top", "rail-top"],
      ["bottom", "runner-bottom"],
    ];
    for (const [panelId, partId] of cases) {
      const panel = panelSizeInches(panelId, C);
      const rect = rectOf(partId);
      expect(rect).toBeDefined();
      expect(rect?.w).toBeCloseTo(panel.width, 6);
      // The bottom panel's print includes the keystone; the bench part is the bar.
      const h = panelId === "bottom" ? panel.height - 0.55 : panel.height;
      expect(rect?.h).toBeCloseTo(h, 6);
    }
  });
});

describe("flush frame: placement", () => {
  const grid = buildGrid(C);
  const ctx: PlacementContext = { grid, slots: {}, sections: {}, barCovered: new Set() };
  const leftWing = panelRects(C)["wing-left"];

  it("refuses a 2x2 anchored on the top row of a wing, with the banner reason", () => {
    const r = canPlace(ctx, { row: 0, col: leftWing.col0 }, { cols: 2, rows: 2 });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("banner");
  });

  it("refuses even a 1x1 on the top row", () => {
    const r = canPlace(ctx, { row: 0, col: leftWing.col0 }, { cols: 1, rows: 1 });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("banner");
  });

  it("accepts three 2x2 badges down rows 1..6, and nothing below", () => {
    for (const row of [1, 3, 5]) {
      expect(canPlace(ctx, { row, col: leftWing.col0 }, { cols: 2, rows: 2 }).ok).toBe(true);
    }
    expect(canPlace(ctx, { row: 6, col: leftWing.col0 }, { cols: 2, rows: 2 }).ok).toBe(false);
  });

  it("the presets anchor on rows 1, 3 and 5 of both sides", () => {
    for (const preset of FLUSH_PRESETS) {
      const rows = preset.layout.map(([slot]) => grid.coordOf(slot)!.row).sort();
      expect(rows).toEqual([1, 1, 3, 3, 5, 5]);
    }
  });
});

describe("flush frame: the two renderers agree", () => {
  const W = 1500; // 100 px per inch
  const slots = generateSlots(C, W);
  const m = schoolRenderMetrics(C, W);

  it("the top banner is 75 px tall and the bottom banner starts at 575 px", () => {
    const top = schoolBannerRect({ row: "top", startIndex: 0, widthUnits: 13 }, m, C);
    expect(top.y).toBe(0);
    expect(top.height).toBeCloseTo(75, 9);
    const bottom = schoolBannerRect({ row: "bottom", startIndex: 0, widthUnits: 13 }, m, C);
    expect(bottom.y).toBeCloseTo(575, 9);
    expect(bottom.height).toBeCloseTo(100, 9);
  });

  it("the per-panel print crop lands exactly on the panel's drawn bounds", () => {
    // The trap the plan named: a crop at `row0 * tile` is 0.25 in low on every
    // panel of this frame. `panelRowsPx` is what makes the crop match the render.
    const rects = panelRects(C);
    for (const id of ["wing-left", "wing-right", "top", "bottom"] as SectionId[]) {
      const drawn = sectionBounds(id, slots, C)!;
      const over = panelOverhangTiles(id, C);
      const box = panelBleedBox(rects[id], m.tileSize, 0, over, panelRowsPx(C, 100));
      expect(box.contentX).toBeCloseTo(drawn.x - over.left * m.tileSize, 6);
      expect(box.contentY).toBeCloseTo(drawn.y - over.top * m.tileSize, 6);
      expect(box.contentW).toBeCloseTo(drawn.width + (over.left + over.right) * m.tileSize, 6);
      expect(box.contentH).toBeCloseTo(drawn.height + (over.top + over.bottom) * m.tileSize, 6);
    }
  });

  it("the old default crop would have been a quarter inch low — the reason panelRowsPx exists", () => {
    const rects = panelRects(C);
    const drawn = sectionBounds("bottom", slots, C)!;
    const naive = panelBleedBox(rects.bottom, m.tileSize, 0);
    expect(naive.contentY - drawn.y).toBeCloseTo(25, 6);
  });
});

describe("flush frame: screw slots", () => {
  it("puts two slots over the plate's top bolt holes, and none on the older frames", () => {
    const slots = topBarScrewSlots(C);
    expect(slots).toHaveLength(2);
    // Holes are 7 in apart, centred on the plate, which starts 0.5 in into the
    // inner frame: centres at 0.5 + 2.5 and 0.5 + 9.5.
    const centres = slots.map((s) => s.x + s.width / 2);
    expect(centres[0]).toBeCloseTo(3, 9);
    expect(centres[1]).toBeCloseTo(10, 9);
    // Inside the 0.75 in bar, with material above and below.
    for (const s of slots) {
      expect(s.y).toBeGreaterThan(0);
      expect(s.y + s.height).toBeLessThan(0.75);
    }
    expect(topBarScrewSlots(SCHOOL_FRAME_CONFIG)).toEqual([]);
    expect(topBarScrewSlots(SCHOOL_SLIM_FRAME_CONFIG)).toEqual([]);
  });
});

describe("flush frame: the fit bench", () => {
  it("reads 15 x 6.75 with nothing above the plate and 0.75 below", () => {
    const r = computeFit(FLUSH_SPEC);
    expect(r.totalWidthInches).toBe(15);
    expect(r.totalHeightInches).toBe(6.75);
    expect(r.abovePlateInches).toBe(0);
    expect(r.belowPlateInches).toBe(0.75);
    expect(r.faceCoverage.top).toBe(0.75);
    expect(r.faceCoverage.bottomFullWidth).toBe(0.25);
    expect(r.faceCoverage.left).toBe(0.5);
    expect(r.underPilotCeiling).toBe(true);
    expect(r.fitsBedRotated).toBe(true);
  });

  it("raises exactly the two flags the plan expects, and no others", () => {
    const r = computeFit(FLUSH_SPEC);
    expect(r.flags).toHaveLength(2);
    expect(r.flags.some((f) => f.startsWith("Bottom edge hangs 0.75"))).toBe(true);
    expect(r.flags.some((f) => f.startsWith("Top rail covers 0.75"))).toBe(true);
  });

  it("is the shipping config, projected — and projects back", () => {
    expect(shippabilityRefusals(FLUSH_SPEC)).toEqual([]);
    expect(specFromConfig(C)).toEqual(FLUSH_SPEC);
    const back = configFromSpec(FLUSH_SPEC, C);
    expect("config" in back).toBe(true);
    if ("config" in back) {
      expect(back.config.heightInches).toBe(6.75);
      expect(back.config.topBarHeightInches).toBe(0.75);
      expect(back.config.plateTopCoverInches).toBe(0.75);
      expect(back.config.widthInches).toBe(13);
      expect(back.config.wingColumns).toBe(1);
      expect(gridInvariantHolds(back.config)).toBe(true);
    }
  });
});
