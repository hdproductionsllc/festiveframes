import { describe, expect, it } from "vitest";
import { allSchoolKits, kitSections, type SchoolKit } from "@/data/school-kits";
import { kitSeedTiles } from "@/data/kit-seed";
import { SCHOOL_SHIPPING_VARIANT, schoolVariant } from "@/data/school-variants";
import { SCHOOL_PRINT_DPI, schoolCanvasSize } from "@/lib/utils/compose-school-frame";
import type { PlacedTile } from "@/lib/types";
import { buildPanelPartsList } from "@/lib/order/parts-list";

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

/**
 * Everything about a kit's rendering that MUST be identical across schools —
 * computed FROM THE KIT, or the comparison is a constant against itself.
 *
 * The first version of this derived the canvas, slot ids and panel rects purely
 * from the variant; `kit` was not an input to any of them, so 26 cases compared
 * a pure function of a constant to itself and could not fail. A kit can still
 * fork geometry through a route the field allowlist below does not see: its
 * SECTIONS (`kitSections`) decide which panels are direct-printed, and that
 * changes the part set Bill cuts. So the comparison is the parts list built
 * from the kit's own sections and seeds.
 */
function partsOf(kit: SchoolKit) {
  const { config } = schoolVariant(SCHOOL_SHIPPING_VARIANT);
  const slots = kitSeedTiles(kit, config) as Record<string, PlacedTile>;
  const list = buildPanelPartsList({
    slots,
    textBars: [],
    qrCode: { enabled: false, url: "", size: 0 },
    plateState: "MO",
    designName: kit.slug,
    tileSizeInches: config.tileSizeInches,
    dieCut: false,
    frameConfig: config,
    sections: kitSections(kit),
  });
  return {
    canvas: (({ width, height }) => [width, height])(schoolCanvasSize(config, SCHOOL_PRINT_DPI)),
    // Which panels are direct-printed and at what size — the kit's sections
    // decide this, so it is the geometry a kit COULD fork.
    directParts: list.rows.filter((r) => r.pieceId.startsWith("panel:")).map((r) => [r.pieceId, r.size]).sort(),
    // Every badge part's size: the seeds land on the same anchors for every kit,
    // so the multiset of sizes must match even though the pieces differ.
    // Expanded by quantity: a school wearing its one mark in both mark positions
    // prints ONE row with qty 2, which is the same six parts as six rows of one.
    badgeSizes: list.rows
      .filter((r) => !r.pieceId.startsWith("panel:"))
      .flatMap((r) => Array.from({ length: r.qty }, () => r.size))
      .sort(),
    seedSlots: Object.keys(slots).sort(),
  };
}

describe("dimensions, output and size are shared by every school", () => {
  const kits = allSchoolKits();
  const reference = partsOf(kits[0]);

  it("the reference kit really produces parts (or the comparison below is empty)", () => {
    expect(reference.directParts.length).toBeGreaterThan(0);
    expect(reference.badgeSizes.length).toBe(6);
    expect(reference.canvas).toEqual([4650, 2025]);
  });

  for (const kit of kits.slice(1)) {
    it(`${kit.slug} cuts exactly ${kits[0].slug}'s part set`, () => {
      expect(partsOf(kit)).toEqual(reference);
    });
  }
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
    // IDENTITY, not appearance: which row of the national roster this school is
    // (an NCES/PSS id). It buys the finder and /s/<slug> one answer to "is this
    // school already authored?" and sizes, positions and re-grids nothing.
    "rosterId",
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
