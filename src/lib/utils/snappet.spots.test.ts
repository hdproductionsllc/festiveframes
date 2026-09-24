import { describe, it, expect } from "vitest";
import { badgeSpots, largestBadgeInches, UPLOAD_PIECE_ID, UPLOAD_SET_ID } from "./snappet";
import { DEFAULT_FRAME_CONFIG } from "@/lib/constants/frame";
import { SCHOOL_SHIPPING_VARIANT, schoolVariant } from "@/data/school-variants";
import { getSchoolKit } from "@/data/school-kits";
import { kitSections } from "@/data/school-kits";
import { kitSeedTiles } from "@/data/kit-seed";

// "Which badge should this photo go on?" — the upload picker's positions. On the
// shipping frame the answer is the six side badges, filled or not, and never a
// panel, a slab or a sliver.

const variant = schoolVariant(SCHOOL_SHIPPING_VARIANT);
const SHIP = variant.config;
const kit = getSchoolKit("eureka-wildcats")!;
const sections = kitSections(kit);

describe("badgeSpots", () => {
  it("names the six square side badges of a seeded kit frame", () => {
    const slots = kitSeedTiles(kit, SHIP);
    const spots = badgeSpots(SHIP, { slots, sections, textBars: [] });
    expect(spots).toHaveLength(6);
    for (const s of spots) {
      expect(s.rect.width).toBeCloseTo(2.25, 6);
      expect(s.rect.height).toBeCloseTo(2.25, 6);
      expect(s.occupant).not.toBeNull();
    }
    // Left column first, top to bottom, then the right column.
    expect(spots.slice(0, 3).every((s) => s.panel === "wing-left")).toBe(true);
    expect(spots.slice(3).every((s) => s.panel === "wing-right")).toBe(true);
    expect(spots[0].rect.y).toBeLessThan(spots[1].rect.y);
    expect(spots[1].rect.y).toBeLessThan(spots[2].rect.y);
  });

  it("names the same six positions on an EMPTY frame", () => {
    const seeded = badgeSpots(SHIP, {
      slots: kitSeedTiles(kit, SHIP),
      sections,
      textBars: [],
    });
    const empty = badgeSpots(SHIP, { slots: {}, sections, textBars: [] });
    expect(empty.map((s) => s.anchorSlotId)).toEqual(seeded.map((s) => s.anchorSlotId));
    expect(empty.every((s) => s.occupant === null)).toBe(true);
  });

  it("keeps a position when only some badges are filled, and never overlaps two", () => {
    const [first] = badgeSpots(SHIP, { slots: {}, sections, textBars: [] });
    const photo = {
      pieceId: UPLOAD_PIECE_ID,
      setId: UPLOAD_SET_ID,
      span: first.span,
      image: { url: "data:," },
    };
    const spots = badgeSpots(SHIP, { slots: { [first.anchorSlotId]: photo }, sections, textBars: [] });
    expect(spots).toHaveLength(6);
    expect(spots.find((s) => s.anchorSlotId === first.anchorSlotId)?.occupant).toBe(photo);
  });

  it("offers no fixed positions on /build, whose badges are free", () => {
    expect(badgeSpots(DEFAULT_FRAME_CONFIG, { slots: {}, sections: {}, textBars: [] })).toEqual([]);
  });
});

describe("largestBadgeInches", () => {
  it("is the shipping frame's 2.25-inch square, derived from the geometry", () => {
    expect(largestBadgeInches(SHIP)).toBeCloseTo(2.25, 6);
  });
  it("is null where badges have no one size", () => {
    expect(largestBadgeInches(DEFAULT_FRAME_CONFIG)).toBeNull();
  });
});
