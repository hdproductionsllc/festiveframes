import { describe, expect, it } from "vitest";
import { kitSeedTiles } from "@/data/kit-seed";
import { allSchoolKits, type SchoolKit } from "@/data/school-kits";
import { SCHOOL_VARIANTS, type SchoolVariantId } from "@/data/school-variants";
import { ACTIVITIES } from "@/data/activities";
import { getAllSlotIds, buildGrid } from "@/lib/utils/slot-generator";
import { canPlace, type PlacementContext } from "@/lib/utils/snappet";

const VARIANTS = Object.keys(SCHOOL_VARIANTS) as SchoolVariantId[];

// The defect this file exists for: a kit used to hand-write slot ids for ONE
// geometry, and the seeding code silently dropped the ids a fork did not have. A
// school opened on a half-empty frame and nothing failed. So the assertion is not
// "the seed is valid" — it is "the seed FILLS the side columns, on every variant".

describe("kit seeding is derived, and lands on every geometry", () => {
  for (const id of VARIANTS) {
    const { config, badgeStack } = SCHOOL_VARIANTS[id];

    for (const kit of allSchoolKits()) {
      describe(`${kit.slug} on ${id}`, () => {
        const seeds = kitSeedTiles(kit, config, badgeStack);
        const slots = Object.keys(seeds);

        // Which side a seed landed on is a COORDINATE question, not a string one:
        // the right-hand column's anchor is the inner rail cell (`frame:right-3`),
        // not a `wing-right-*` id, which is exactly the kind of assumption that
        // put three of every preset's anchors outside the side panel once before.
        const grid = buildGrid(config);
        const columnOf = (side: "left" | "right") =>
          slots
            .map((slot) => ({ slot, at: grid.coordOf(slot)! }))
            .filter(({ at }) => (side === "left" ? at.col < config.widthInches / 2 : at.col >= config.widthInches / 2))
            .sort((a, b) => a.at.row - b.at.row)
            .map(({ slot }) => seeds[slot].pieceId);

        it("fills both side columns — no silently dropped anchors", () => {
          expect(slots.length).toBe(badgeStack.length * 2);
          expect(columnOf("left")).toHaveLength(badgeStack.length);
          expect(columnOf("right")).toHaveLength(badgeStack.length);
        });

        it("names only slots that exist on this grid", () => {
          const ids = new Set(getAllSlotIds(config));
          for (const slot of slots) expect(ids.has(slot)).toBe(true);
        });

        it("places badges the grid actually accepts", () => {
          const ctx: PlacementContext = { grid, slots: {}, sections: {}, barCovered: new Set() };
          for (const [slot, tile] of Object.entries(seeds)) {
            const anchor = grid.coordOf(slot);
            expect(anchor, `${slot} is not a cell on this grid`).not.toBeNull();
            const verdict = canPlace(ctx, anchor!, tile.span);
            expect(verdict.ok, `${slot}: ${verdict.ok ? "" : verdict.reason}`).toBe(true);
          }
        });

        it("never stacks the same badge on itself", () => {
          for (const side of ["left", "right"] as const) {
            const column = columnOf(side);
            for (let i = 1; i < column.length; i++) expect(column[i]).not.toBe(column[i - 1]);
          }
        });

        it("derives each piece's set from the piece itself", () => {
          for (const tile of Object.values(seeds)) {
            expect(tile.pieceId.startsWith(`${tile.setId}:`)).toBe(true);
          }
        });
      });
    }
  }
});

describe("every kit's signature is real", () => {
  const known = new Set(ACTIVITIES.map((a) => a.id));

  for (const kit of allSchoolKits()) {
    it(`${kit.slug} names four badges that exist in the library`, () => {
      // Four, because that is what fills the flush frame's six positions with the
      // two marks between them without repeating a sport on the same side.
      expect(kit.signature, `${kit.slug} has no signature badges`).toBeDefined();
      expect(kit.signature).toHaveLength(4);
      for (const id of kit.signature!) expect(known.has(id), `unknown badge ${id}`).toBe(true);
      expect(new Set(kit.signature).size, "signature repeats a badge").toBe(4);
    });
  }
});

describe("a kit with no marks of its own still gets a school shape", () => {
  const bare: SchoolKit = {
    ...allSchoolKits()[0],
    slug: "bare-test",
    marks: undefined,
    signature: ["hs:soccer-patch", "hs:band", "hs:drama", "hs:track"],
  };

  it("falls back to the crest, never to a trophy nobody earned", () => {
    const { config, badgeStack } = SCHOOL_VARIANTS.flush;
    const pieces = Object.values(kitSeedTiles(bare, config, badgeStack)).map((t) => t.pieceId);
    expect(pieces).toContain("hs:crest");
    expect(pieces).not.toContain("hs:trophy");
  });
});
