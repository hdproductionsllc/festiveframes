import { describe, it, expect } from "vitest";
import { migrateSchoolDesign } from "./school-migration";
import { SCHOOL_FRAME_CONFIG } from "@/lib/constants/frame";
import { getAllSlotIds, wingRowCount } from "./slot-generator";
import type { PlacedTile } from "@/lib/types";

// The v6 school frame: 3 wing columns per side, same row banding (fullWidthTopBar +
// bottomRows 2 → 8 rows), so wing ids ran 0..23 on each side.
const V6_WING_ROWS = 8;
const V6_SCHOOL_CONFIG = {
  ...SCHOOL_FRAME_CONFIG,
  wingColumns: 3,
  wingWidthInches: 3 * SCHOOL_FRAME_CONFIG.tileSizeInches,
};

const tile = (n: number): PlacedTile => ({ pieceId: `p${n}`, setId: "school" });

function v6Blob() {
  const slots: Record<string, PlacedTile> = {
    "frame:top-0": tile(1),
    "frame:bottom-4": tile(2),
    "frame:left-2": tile(3),
  };
  // Every wing cell on both sides: 3 columns x 8 rows = indices 0..23.
  for (let i = 0; i < 3 * V6_WING_ROWS; i++) {
    slots[`frame:wing-left-${i}`] = tile(100 + i);
    slots[`frame:wing-right-${i}`] = tile(200 + i);
  }
  return {
    designName: "Lincoln Lions",
    plateState: "MO",
    slots,
    textBars: [],
    frameConfig: V6_SCHOOL_CONFIG,
    dieCut: false,
    updatedAt: 1,
  };
}

describe("migrateSchoolDesign (v6 → v7 wing trim)", () => {
  it("drops wing tiles on columns that no longer exist (indices 8..23)", () => {
    const out = migrateSchoolDesign(v6Blob()) as { slots: Record<string, PlacedTile> };
    const bound = SCHOOL_FRAME_CONFIG.wingColumns * wingRowCount(SCHOOL_FRAME_CONFIG);
    expect(bound).toBe(8); // 1 column x 8 rows

    for (let i = 0; i < 3 * V6_WING_ROWS; i++) {
      const survives = i < bound;
      expect(`frame:wing-left-${i}` in out.slots).toBe(survives);
      expect(`frame:wing-right-${i}` in out.slots).toBe(survives);
    }
  });

  it("keeps the surviving wing tiles' art untouched (col 0 stays col 0)", () => {
    const before = v6Blob();
    const out = migrateSchoolDesign(before) as { slots: Record<string, PlacedTile> };
    for (let i = 0; i < 8; i++) {
      expect(out.slots[`frame:wing-left-${i}`]).toEqual(before.slots[`frame:wing-left-${i}`]);
      expect(out.slots[`frame:wing-right-${i}`]).toEqual(before.slots[`frame:wing-right-${i}`]);
    }
  });

  it("leaves every non-wing tile alone", () => {
    const out = migrateSchoolDesign(v6Blob()) as { slots: Record<string, PlacedTile> };
    expect(out.slots["frame:top-0"]).toEqual(tile(1));
    expect(out.slots["frame:bottom-4"]).toEqual(tile(2));
    expect(out.slots["frame:left-2"]).toEqual(tile(3));
  });

  it("refreshes the stale 3-column frameConfig", () => {
    const out = migrateSchoolDesign(v6Blob()) as { frameConfig: typeof SCHOOL_FRAME_CONFIG };
    expect(out.frameConfig).toEqual(SCHOOL_FRAME_CONFIG);
    expect(out.frameConfig.wingColumns).toBe(1);
    // A copy, not the shared constant — the store must never mutate it.
    expect(out.frameConfig).not.toBe(SCHOOL_FRAME_CONFIG);
  });

  it("leaves every surviving slot id a REAL slot in the new config", () => {
    // The point of the migration: no persisted tile may address a cell the trimmed
    // frame does not generate.
    const out = migrateSchoolDesign(v6Blob()) as { slots: Record<string, PlacedTile> };
    const valid = new Set(getAllSlotIds(SCHOOL_FRAME_CONFIG));
    for (const id of Object.keys(out.slots)) expect(valid.has(id)).toBe(true);
  });

  it("preserves the rest of the design (name, state, bars, meta)", () => {
    const out = migrateSchoolDesign(v6Blob()) as Record<string, unknown>;
    expect(out.designName).toBe("Lincoln Lions");
    expect(out.plateState).toBe("MO");
    expect(out.textBars).toEqual([]);
    expect(out.updatedAt).toBe(1);
  });

  it("does not mutate the blob it was given", () => {
    const before = v6Blob();
    migrateSchoolDesign(before);
    expect(Object.keys(before.slots)).toHaveLength(3 + 2 * 3 * V6_WING_ROWS);
    expect(before.frameConfig.wingColumns).toBe(3);
  });

  it("is idempotent — re-running on its own output changes nothing", () => {
    const once = migrateSchoolDesign(v6Blob());
    const twice = migrateSchoolDesign(once);
    expect(twice).toEqual(once);
  });

  it("drops ALL wing tiles when the wing ROW banding differs (indices unmappable)", () => {
    // A flat wing index only means the same cell while rows-per-column is constant.
    // A blob from a differently-banded frame gets its wings cleared rather than
    // silently relocated onto cells the user never chose.
    const blob = v6Blob();
    blob.frameConfig = { ...V6_SCHOOL_CONFIG, bottomRows: 1, fullWidthTopBar: false };
    const out = migrateSchoolDesign(blob) as { slots: Record<string, PlacedTile> };
    expect(Object.keys(out.slots).filter((k) => k.includes("wing-"))).toHaveLength(0);
    expect(out.slots["frame:top-0"]).toEqual(tile(1)); // non-wing art still safe
  });

  it("survives a blob with no slots or no frameConfig", () => {
    expect(migrateSchoolDesign({ designName: "x" })).toEqual({
      designName: "x",
      frameConfig: { ...SCHOOL_FRAME_CONFIG },
    });
    expect(migrateSchoolDesign(undefined)).toBeUndefined();
    expect(migrateSchoolDesign(null)).toBeNull();
  });
});

describe("migrateSchoolDesign (retired image mode → tiles)", () => {
  it("converts a section still in the old image mode back to tiles", () => {
    // Uploaded art is a snappet now; a persisted section in `mode: "image"` would
    // otherwise render a dead, tile-suppressed blank panel. Convert it to tiles so
    // the panel's tiles reappear (the overlay-only preview image is dropped).
    const out = migrateSchoolDesign({
      slots: {},
      frameConfig: SCHOOL_FRAME_CONFIG,
      sections: {
        "wing-left": { mode: "image", imageUrl: "data:old", fullResId: "fr-old", imageFit: "cover" },
        top: { mode: "text", text: { text: "GO LIONS" } },
        "wing-right": { mode: "tiles" },
      },
    }) as { sections: Record<string, { mode: string; imageUrl?: string }> };

    expect(out.sections["wing-left"]).toEqual({ mode: "tiles" }); // image dropped
    expect(out.sections.top.mode).toBe("text"); // text banners are untouched
    expect(out.sections["wing-right"].mode).toBe("tiles");
  });

  it("leaves a blob with no sections alone", () => {
    const out = migrateSchoolDesign({ slots: {}, frameConfig: SCHOOL_FRAME_CONFIG }) as {
      sections?: unknown;
    };
    expect(out.sections).toBeUndefined();
  });
});
