import { describe, expect, it } from "vitest";
import { ACTIVITIES } from "@/data/activities";
import { getPiece } from "@/data/sets";
import { WITHHELD_ART } from "@/data/sets/high-school";
import { CHIP_PRESET_PIECE, chipPiece, getSchoolKit, kitPlateState } from "@/data/school-kits";
import { isBuilderOpen } from "@/data/school-pilot";
import { MAX_BANNER_CHARS } from "@/data/thin-kit";
import { CHICAGOLAND_KITS } from "./chicagoland";

// ─── The Chicagoland thirty, held to the pilot's bar ─────────────────────────
//
// The pilot tests (school-kits.chips.test.ts) check only the schools in the pilot
// list, and these are deliberately not in it. That would leave thirty kits
// checked by nothing but the shared-geometry test until the day the owner opens
// them, which is the day a parent sees them. So the same promises are made here.

const GROUP = new Map(ACTIVITIES.map((a) => [a.id, a.group]));
const mapped = (chip: string) => CHIP_PRESET_PIECE[chip.trim().toLowerCase()] ?? "";

describe("the Chicagoland kits", () => {
  it("are thirty distinct Illinois schools, registered under their own slugs", () => {
    expect(CHICAGOLAND_KITS).toHaveLength(30);
    expect(new Set(CHICAGOLAND_KITS.map((k) => k.slug)).size).toBe(30);
    for (const kit of CHICAGOLAND_KITS) {
      expect(getSchoolKit(kit.slug), kit.slug).toBe(kit);
      expect(kit.city, kit.slug).toMatch(/, IL$/);
      // The preview opens on an Illinois plate, not Missouri's.
      expect(kitPlateState(kit), kit.slug).toBe("IL");
    }
  });

  it("stay demo kits behind the not-ready page until the owner opens them", () => {
    for (const kit of CHICAGOLAND_KITS) {
      expect(kit.status, kit.slug).toBe("demo");
      expect(isBuilderOpen(kit.slug), `${kit.slug} is open to parents`).toBe(false);
    }
  });

  it("carry real colours and banner words that fit the bar", () => {
    for (const kit of CHICAGOLAND_KITS) {
      for (const c of [kit.colors.frame, kit.colors.tileField, kit.colors.rim]) {
        expect(c, kit.slug).toMatch(/^#[0-9A-F]{6}$/);
      }
      expect(kit.banners.top.length, `${kit.slug} top banner`).toBeLessThanOrEqual(MAX_BANNER_CHARS);
      expect(kit.banners.bottom.length, `${kit.slug} bottom banner`).toBeLessThanOrEqual(MAX_BANNER_CHARS);
      expect(kit.banners.top, kit.slug).toBe(kit.banners.top.toUpperCase());
      expect(kit.banners.bottom, kit.slug).toBe(kit.mascot.toUpperCase());
      expect(kit.colorSource.length, `${kit.slug} says where its colours came from`).toBeGreaterThan(40);
    }
  });

  it("seed four distinct, real, shown badges", () => {
    for (const kit of CHICAGOLAND_KITS) {
      const sig = kit.signature ?? [];
      expect(sig, kit.slug).toHaveLength(4);
      expect(new Set(sig).size, kit.slug).toBe(4);
      for (const id of sig) {
        expect(getPiece(id), `${kit.slug} seeds ${id}`).toBeDefined();
        expect(WITHHELD_ART.has(id), `${kit.slug} seeds withheld ${id}`).toBe(false);
      }
    }
  });

  it("offer chips that each build a SHOWN badge, at least one of them arts or academic", () => {
    for (const kit of CHICAGOLAND_KITS) {
      const chips = kit.welcome!.chips;
      // Through `chipPiece`, the page's own rule: a chip whose art is withheld is
      // hidden, so it must not count as a chip here either.
      const dead = chips.filter((c) => !getPiece(chipPiece(c) ?? ""));
      expect(dead, `${kit.slug} has chips that build nothing`).toEqual([]);
      expect(new Set(chips.map(mapped)).size, `${kit.slug} has two chips for one badge`).toBe(chips.length);
      const nonSport = chips.filter((c) => {
        const g = GROUP.get(chipPiece(c) ?? "");
        return g === "Arts" || g === "Academics & clubs";
      });
      expect(nonSport.length, `${kit.slug} has only sports chips`).toBeGreaterThan(0);
    }
  });

  it("write a welcome that names the school and promises nothing it has not got", () => {
    for (const kit of CHICAGOLAND_KITS) {
      const w = kit.welcome!;
      expect(w.headline, kit.slug).toMatch(/^Welcome, .+ families\.$/);
      expect(w.message, kit.slug).toHaveLength(2);
      expect(w.ordering, kit.slug).toContain(kit.shortName);
      // No price and no dollar promise to the school: school surfaces show no
      // figure by the owner's choice (CLAUDE.md, pricing).
      // Any dollar figure is suspect; the one allowed is a FACT about the school
      // (Highland Park's Charity Drive total), named here so a new one is a choice.
      const ALLOWED_DOLLARS = ["$3 million"];
      let copy = `${w.message.join(" ")} ${w.ordering}`;
      for (const ok of ALLOWED_DOLLARS) copy = copy.split(ok).join("");
      expect(copy, kit.slug).not.toMatch(/\$\s?\d/);
    }
  });

  it("never print an outside organisation's name on a chip", () => {
    // Science Olympiad is Science Olympiad, Inc.'s name. The alias maps it for
    // search; the chip says "Science" (CLAUDE.md, badge names).
    for (const kit of CHICAGOLAND_KITS) {
      expect(kit.welcome!.chips.filter((c) => /olympiad/i.test(c)), kit.slug).toEqual([]);
    }
  });
});
