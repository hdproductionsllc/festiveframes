import { describe, expect, it } from "vitest";
import { allSchoolKits, type SchoolKit } from "@/data/school-kits";
import { kitSeedTiles } from "@/data/kit-seed";
import { SCHOOL_SHIPPING_VARIANT, schoolVariant } from "@/data/school-variants";
import { getTotalWidthInches, getRenderHeightInches } from "@/lib/constants/frame";
import { panelRects, panelSizeInches, panelOverhangTiles } from "@/lib/utils/panels";
import { getAllSlotIds } from "@/lib/utils/slot-generator";
import { SCHOOL_PRINT_DPI, schoolCanvasSize } from "@/lib/utils/compose-school-frame";
import type { SectionId } from "@/lib/types";

// ─── ONE CHANGE UPDATES ALL 27 ───────────────────────────────────────────────
//
// The rollout's contract, in a test rather than in a comment:
//
//   DIMENSIONS, OUTPUT AND SIZE ARE NOT PER-SCHOOL. Every kit renders on the same
//   grid, the same panels, the same part sizes and the same print canvas, because
//   all of it comes from the variant and none of it from the kit. Change
//   SCHOOL_SHIPPING_VARIANT and all 27 builders move together.
//
//   COLOURS, WORDS AND ARTWORK ARE PER-SCHOOL, and must actually differ — a
//   "shared geometry" test passes trivially if the kits are all the same, so this
//   file asserts the variation too.
//
// The guard that makes it stick is `only appearance fields`: a kit that grows a
// dimension — a frameConfig, a widthInches, a variant of its own — fails here
// with the field named, rather than quietly forking one school's geometry away
// from the other 26.

/** Everything about a kit's rendering that MUST be identical across schools. */
function geometryOf(kit: SchoolKit) {
  const { config, badgeStack } = schoolVariant(SCHOOL_SHIPPING_VARIANT);
  const canvas = schoolCanvasSize(config, SCHOOL_PRINT_DPI);
  return {
    totalWidthInches: getTotalWidthInches(config),
    renderHeightInches: getRenderHeightInches(config),
    canvas: [canvas.width, canvas.height],
    slotIds: getAllSlotIds(config),
    seedSlots: Object.keys(kitSeedTiles(kit, config, badgeStack)).sort(),
    seedSpans: Object.values(kitSeedTiles(kit, config, badgeStack))
      .map((t) => `${t.span.cols}x${t.span.rows}`)
      .sort(),
    // Whichever panels this geometry HAS — the flush frame has four (two side
    // columns and two runners; its left/right rail zones are empty), and a
    // hard-coded list would quietly skip a panel a future variant adds.
    panels: (Object.keys(panelRects(config)) as SectionId[]).sort().map((id) => {
      const rect = panelRects(config)[id]!;
      const size = panelSizeInches(id, config);
      // Inches AND the pixels they print at: "size" is what Bill cuts, and a
      // rounding change that moved one by a pixel while leaving the inches alone
      // is exactly the drift worth failing on.
      return [id, rect.row0, rect.col0, rect.row1, rect.col1, size.width, size.height,
        Math.round(size.width * SCHOOL_PRINT_DPI), Math.round(size.height * SCHOOL_PRINT_DPI),
        JSON.stringify(panelOverhangTiles(id, config))];
    }),
  };
}

describe("dimensions, output and size are shared by every school", () => {
  const kits = allSchoolKits();
  const reference = geometryOf(kits[0]);

  for (const kit of kits.slice(1)) {
    it(`${kit.slug} renders on exactly ${kits[0].slug}'s geometry`, () => {
      expect(geometryOf(kit)).toEqual(reference);
    });
  }

  it("the whole catalogue agrees on the print canvas, to the pixel", () => {
    const sizes = new Set(kits.map((k) => geometryOf(k).canvas.join("x")));
    expect([...sizes]).toHaveLength(1);
  });
});

describe("colours, words and artwork are NOT shared", () => {
  const kits = allSchoolKits();

  it("schools differ from each other where they are supposed to", () => {
    // Without this the test above would pass on 27 identical kits, which is the
    // opposite of the product.
    expect(new Set(kits.map((k) => k.colors.frame)).size).toBeGreaterThan(5);
    expect(new Set(kits.map((k) => k.banners.bottom)).size).toBeGreaterThan(20);
    expect(new Set(kits.map((k) => (k.signature ?? []).join(","))).size).toBeGreaterThan(15);
  });
});

describe("a kit cannot carry a dimension", () => {
  // Appearance and identity only. Adding a field here is a deliberate act; adding
  // one that sizes, positions or re-grids the frame belongs on the VARIANT, where
  // all 27 schools get it at once.
  const ALLOWED = new Set([
    "slug", "schoolName", "shortName", "mascot", "city",
    "colors", "banners", "fontFamily", "welcome", "signature", "marks",
    "plate", "status", "colorSource",
  ]);

  for (const kit of allSchoolKits()) {
    it(`${kit.slug} carries only appearance and identity fields`, () => {
      const stray = Object.keys(kit).filter((k) => !ALLOWED.has(k));
      expect(stray, `${kit.slug} has non-appearance field(s): ${stray.join(", ")}`).toEqual([]);
    });
  }

  it("names no frame geometry anywhere in the catalogue", () => {
    const banned = /"(frameConfig|widthInches|heightInches|tileSizeInches|variant|bottomTab|wingRows|topBarHeightInches)"/;
    for (const kit of allSchoolKits()) {
      expect(banned.test(JSON.stringify(kit)), `${kit.slug} names frame geometry`).toBe(false);
    }
  });
});
