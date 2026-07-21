import { describe, it, expect } from "vitest";
import { panelOf, panelRects, panelSizeInches, type PanelRect } from "./panels";
import { buildGrid } from "./slot-generator";
import { DEFAULT_FRAME_CONFIG, SCHOOL_FRAME_CONFIG } from "@/lib/constants/frame";
import type { SectionId } from "@/lib/types";

const SECTION_IDS: SectionId[] = ["wing-left", "wing-right", "top", "bottom"];
const area = (r: PanelRect) => (r.col1 - r.col0 + 1) * (r.row1 - r.row0 + 1);
const inRect = (r: PanelRect, row: number, col: number) =>
  col >= r.col0 && col <= r.col1 && row >= r.row0 && row <= r.row1;

describe("panelOf — the school frame (14 cols x 8 rows)", () => {
  it("gives the LEFT/RIGHT panels the CORNER cells, not the top/bottom banners", () => {
    // The whole point of a panel vs a zone: (0,1) is the top-left CORNER. It is a
    // `top` ZONE slot (frame:top-0), but it belongs to the LEFT PANEL.
    expect(panelOf(0, 1, SCHOOL_FRAME_CONFIG)).toBe("wing-left");
    expect(panelOf(0, 12, SCHOOL_FRAME_CONFIG)).toBe("wing-right"); // top-right corner
    expect(panelOf(6, 1, SCHOOL_FRAME_CONFIG)).toBe("wing-left"); // bottom-left corner
    expect(panelOf(7, 12, SCHOOL_FRAME_CONFIG)).toBe("wing-right"); // bottom-right corner
  });

  it("owns the wing columns and the inner rails, all rows", () => {
    for (let row = 0; row < 8; row++) {
      expect(panelOf(row, 0, SCHOOL_FRAME_CONFIG)).toBe("wing-left"); // wing column
      expect(panelOf(row, 1, SCHOOL_FRAME_CONFIG)).toBe("wing-left"); // left rail
      expect(panelOf(row, 12, SCHOOL_FRAME_CONFIG)).toBe("wing-right"); // right rail
      expect(panelOf(row, 13, SCHOOL_FRAME_CONFIG)).toBe("wing-right"); // wing column
    }
  });

  it("gives the TOP panel only the inner cells on row 0, the BOTTOM only rows 6-7", () => {
    for (let col = 2; col <= 11; col++) {
      expect(panelOf(0, col, SCHOOL_FRAME_CONFIG)).toBe("top");
      expect(panelOf(6, col, SCHOOL_FRAME_CONFIG)).toBe("bottom");
      expect(panelOf(7, col, SCHOOL_FRAME_CONFIG)).toBe("bottom");
    }
  });

  it("returns null for the plate hole and for off-grid coords", () => {
    // Plate = rows 1..5 x cols 2..11.
    expect(panelOf(3, 6, SCHOOL_FRAME_CONFIG)).toBeNull();
    expect(panelOf(1, 2, SCHOOL_FRAME_CONFIG)).toBeNull();
    expect(panelOf(-1, 0, SCHOOL_FRAME_CONFIG)).toBeNull();
    expect(panelOf(0, 99, SCHOOL_FRAME_CONFIG)).toBeNull();
  });
});

describe("panelRects — exact partition of the ring", () => {
  it("yields the documented school rectangles", () => {
    const r = panelRects(SCHOOL_FRAME_CONFIG);
    expect(r["wing-left"]).toEqual({ col0: 0, col1: 1, row0: 0, row1: 7 });
    expect(r["wing-right"]).toEqual({ col0: 12, col1: 13, row0: 0, row1: 7 });
    expect(r.top).toEqual({ col0: 2, col1: 11, row0: 0, row1: 0 });
    expect(r.bottom).toEqual({ col0: 2, col1: 11, row0: 6, row1: 7 });
  });

  it("gives the physical print size of each panel (the resolution-gate denominator)", () => {
    const t = SCHOOL_FRAME_CONFIG.tileSizeInches; // 0.991, and each inner col too
    const left = panelSizeInches("wing-left", SCHOOL_FRAME_CONFIG);
    expect(left.width).toBeCloseTo(2 * t, 5); // 1 wing col + 1 rail col
    expect(left.height).toBeCloseTo(8 * t, 5); // all 8 rows
    const top = panelSizeInches("top", SCHOOL_FRAME_CONFIG);
    expect(top.width).toBeCloseTo(10 * t, 5); // 10 inner cols
    expect(top.height).toBeCloseTo(1 * t, 5); // one row
    const bottom = panelSizeInches("bottom", SCHOOL_FRAME_CONFIG);
    expect(bottom.width).toBeCloseTo(10 * t, 5);
    expect(bottom.height).toBeCloseTo(2 * t, 5); // two bottom rows
  });

  it("partitions the ring: areas sum to every real slot, no overlap, no gap", () => {
    for (const config of [SCHOOL_FRAME_CONFIG, DEFAULT_FRAME_CONFIG]) {
      const grid = buildGrid(config);
      const rects = panelRects(config);

      // Sum of panel areas equals the number of real (non-plate) slots.
      const total = SECTION_IDS.reduce((n, id) => n + area(rects[id]), 0);
      expect(total).toBe(grid.slots.length);

      // Every real slot lands in EXACTLY one panel, and its rect contains it.
      for (const slot of grid.slots) {
        const owner = panelOf(slot.row, slot.col, config);
        expect(owner).not.toBeNull();
        const owners = SECTION_IDS.filter((id) => inRect(rects[id], slot.row, slot.col));
        expect(owners).toEqual([owner]); // one and only one rect claims it
      }

      // Every plate cell belongs to no panel.
      for (let row = 0; row < grid.rows; row++) {
        for (let col = 0; col < grid.cols; col++) {
          if (grid.isPlate(row, col)) expect(panelOf(row, col, config)).toBeNull();
        }
      }
    }
  });
});
