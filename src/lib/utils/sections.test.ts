import { describe, it, expect } from "vitest";
import { slotSuppressed, panelSuppressed, sectionBounds, repairSections } from "./sections";
import { panelOf } from "./panels";
import { buildGrid } from "./slot-generator";
import { DEFAULT_FRAME_CONFIG, SCHOOL_FRAME_CONFIG } from "@/lib/constants/frame";
import type { SectionId, SectionState } from "@/lib/types";

const schoolGrid = buildGrid(SCHOOL_FRAME_CONFIG);

/** Count the real slots the PANEL owns (via panelOf) whose tiles a section hides. */
function suppressedCells(
  sections: Partial<Record<SectionId, SectionState>>,
): number {
  return schoolGrid.slots.filter((s) => slotSuppressed(s, sections, SCHOOL_FRAME_CONFIG)).length;
}

describe("panelSuppressed", () => {
  it("is true only for a panel in a non-tile mode; null panel is never suppressed", () => {
    const sections = { "wing-left": { mode: "image" as const } };
    expect(panelSuppressed("wing-left", sections)).toBe(true);
    expect(panelSuppressed("top", sections)).toBe(false);
    expect(panelSuppressed(null, sections)).toBe(false);
    expect(panelSuppressed("wing-left", { "wing-left": { mode: "tiles" as const } })).toBe(false);
  });
});

describe("slotSuppressed — by PANEL, so it hides the corners too", () => {
  it("LEFT panel hides all 16 left-panel cells, INCLUDING the corners", () => {
    // The live bug this fixes: the old zone mapping hid only the 8 wing-column
    // cells, filling half the panel. The panel owns all 16 (cols 0-1, rows 0-7).
    expect(suppressedCells({ "wing-left": { mode: "image" } })).toBe(16);

    // Spot-check the corners specifically — they are `top`/`bottom` ZONE slots but
    // LEFT-panel cells, so LEFT must hide them.
    const topLeftCorner = schoolGrid.cellAt(0, 1)!; // frame:top-0
    const bottomLeftCorner = schoolGrid.cellAt(6, 1)!; // frame:bottom-0
    expect(topLeftCorner.zone).toBe("top");
    expect(bottomLeftCorner.zone).toBe("bottom");
    expect(slotSuppressed(topLeftCorner, { "wing-left": { mode: "image" } }, SCHOOL_FRAME_CONFIG)).toBe(true);
    expect(slotSuppressed(bottomLeftCorner, { "wing-left": { mode: "image" } }, SCHOOL_FRAME_CONFIG)).toBe(true);
  });

  it("TOP panel hides only the 10 INNER top cells, not the corners", () => {
    expect(suppressedCells({ top: { mode: "image" } })).toBe(10);
    // The corner is NOT hidden by TOP — it belongs to the LEFT panel.
    const topLeftCorner = schoolGrid.cellAt(0, 1)!;
    expect(slotSuppressed(topLeftCorner, { top: { mode: "image" } }, SCHOOL_FRAME_CONFIG)).toBe(false);
  });

  it("BOTTOM panel hides 20 cells, RIGHT panel hides 16", () => {
    expect(suppressedCells({ bottom: { mode: "text" } })).toBe(20);
    expect(suppressedCells({ "wing-right": { mode: "image" } })).toBe(16);
  });

  it("suppresses nothing when no section is set (the /build case)", () => {
    expect(suppressedCells({})).toBe(0);
    // …and on /build, whose slots are never fed a `sections` map at all.
    const buildGridDefault = buildGrid(DEFAULT_FRAME_CONFIG);
    const anySuppressed = buildGridDefault.slots.some((s) =>
      slotSuppressed(s, {}, DEFAULT_FRAME_CONFIG),
    );
    expect(anySuppressed).toBe(false);
  });
});

describe("sectionBounds — unions the PANEL cells, incl. corners", () => {
  it("the LEFT panel box spans the full vertical (rows 0-7), both columns", () => {
    const box = sectionBounds("wing-left", schoolGrid.slots, SCHOOL_FRAME_CONFIG)!;
    // Left edge is the wing column's x (col 0); top edge is row 0 (the top corner);
    // bottom edge is the last bottom row. Compare against the actual corner cells.
    const topCorner = schoolGrid.cellAt(0, 0)!; // wing top
    const botCorner = schoolGrid.cellAt(7, 1)!; // rail, last bottom row
    expect(box.x).toBeCloseTo(topCorner.x, 6);
    expect(box.y).toBeCloseTo(topCorner.y, 6);
    expect(box.y + box.height).toBeCloseTo(botCorner.y + botCorner.height, 6);
  });

  it("the TOP panel box covers only the inner cells (starts at col 2, not col 1)", () => {
    const box = sectionBounds("top", schoolGrid.slots, SCHOOL_FRAME_CONFIG)!;
    const firstInner = schoolGrid.cellAt(0, 2)!; // frame:top-1
    const lastInner = schoolGrid.cellAt(0, 11)!; // frame:top-10
    expect(box.x).toBeCloseTo(firstInner.x, 6);
    expect(box.x + box.width).toBeCloseTo(lastInner.x + lastInner.width, 6);
    // Exactly one row tall.
    expect(box.height).toBeCloseTo(firstInner.height, 6);
  });

  it("every panel resolves to a box, and only its own cells feed it", () => {
    for (const id of ["wing-left", "wing-right", "top", "bottom"] as SectionId[]) {
      const box = sectionBounds(id, schoolGrid.slots, SCHOOL_FRAME_CONFIG);
      expect(box).not.toBeNull();
    }
    // A panel that owns no slots (impossible here) would be null — sanity that the
    // predicate is panelOf, not zone: the top box must exclude the corner cell.
    const topBox = sectionBounds("top", schoolGrid.slots, SCHOOL_FRAME_CONFIG)!;
    const corner = schoolGrid.cellAt(0, 1)!;
    expect(panelOf(corner.row, corner.col, SCHOOL_FRAME_CONFIG)).not.toBe("top");
    expect(topBox.x).toBeGreaterThan(corner.x); // top box starts to the right of the corner
  });
});

describe("clearAll leaves a genuinely blank frame", () => {
  it("blanks the banner WORDS but keeps the section in text mode", async () => {
    const { createDesignStore } = await import("@/stores/design-store");
    const { SCHOOL_DEFAULT_SECTIONS } = await import("@/lib/constants/defaults");
    const store = createDesignStore("test-clear-all", {
      sections: SCHOOL_DEFAULT_SECTIONS,
    });
    const s0 = store.getState();
    expect(s0.sections.top?.text?.text).toBeTruthy(); // seeded copy is there

    s0.placeTile("frame:top-3", "school:star", "school");
    expect(Object.keys(store.getState().slots).length).toBe(1);

    store.getState().clearAll();
    const s1 = store.getState();
    expect(Object.keys(s1.slots).length).toBe(0);
    expect(s1.textBars).toEqual([]);
    // The words are gone...
    expect(s1.sections.top?.text?.text).toBe("");
    expect(s1.sections.bottom?.text?.text).toBe("");
    expect(s1.sections.bottom?.text?.tagline).toBe("");
    // ...but the bar is still a TEXT bar, ready to type into.
    expect(s1.sections.top?.mode).toBe("text");
    expect(s1.sections.top?.text?.fontFamily).toBe(
      SCHOOL_DEFAULT_SECTIONS.top.text.fontFamily,
    );
  });
});

describe("repairSections — frees a side panel stuck in text mode", () => {
  it("converts a WING out of text mode", () => {
    const out = repairSections({
      "wing-left": { mode: "text" },
      "wing-right": { mode: "text" },
    });
    expect(out["wing-left"].mode).toBe("tiles");
    expect(out["wing-right"].mode).toBe("tiles");
  });

  it("leaves TOP and BOTTOM text alone — those panels legitimately hold it", () => {
    const input = { top: { mode: "text" }, bottom: { mode: "text" } };
    expect(repairSections(input)).toBe(input); // same object: nothing to fix
  });

  it("returns the SAME object when nothing needs repair, so hydrate can skip a write", () => {
    const input = { "wing-left": { mode: "tiles" }, top: { mode: "text" } };
    expect(repairSections(input)).toBe(input);
  });

  it("repairs only the offending panel, preserving its neighbours", () => {
    const out = repairSections({
      "wing-left": { mode: "text" },
      top: { mode: "text" },
      "wing-right": { mode: "tiles" },
    });
    expect(out["wing-left"].mode).toBe("tiles");
    expect(out.top.mode).toBe("text");
    expect(out["wing-right"].mode).toBe("tiles");
  });
});
