import { describe, expect, it } from "vitest";
import { ACTIVITIES } from "@/data/activities";
import { getPiece } from "@/data/sets";
import { WITHHELD_ART } from "@/data/sets/high-school";
import { allSchoolKits, CHIP_PRESET_PIECE, chipPiece } from "@/data/school-kits";
import { MAX_BANNER_CHARS } from "@/data/thin-kit";

// ─── Every authored kit, held to one bar ─────────────────────────────────────
//
// These promises were first written for the Chicagoland thirty. The adversarial
// pass on St. Louis (2026-10-12) found the live kits had never been asked most of
// them: no test looked at a headline, a duplicate chip, a dollar figure or a
// banner length. A rule that holds for one metro and not the other is a rule
// about a file, not about the product, so it lives here, over every kit.

const kits = allSchoolKits();
const GROUP = new Map(ACTIVITIES.map((a) => [a.id, a.group]));
const mapped = (chip: string) => CHIP_PRESET_PIECE[chip.trim().toLowerCase()] ?? "";

/** SLUH speaks in its own register ("Jr. Bills, this one's for the back of the
 *  car."), which is the point of that kit; every other kit welcomes families. */
const OWN_HEADLINE = new Set(["sluh-jr-bills"]);

describe("every authored kit", () => {
  it("carries real colours and says where they came from", () => {
    for (const kit of kits) {
      for (const c of [kit.colors.frame, kit.colors.tileField, kit.colors.rim, kit.banners.text]) {
        if (c !== null) expect(c, kit.slug).toMatch(/^#[0-9A-Fa-f]{6}$/);
      }
      expect(kit.colorSource.length, `${kit.slug} says where its colours came from`).toBeGreaterThan(40);
    }
  });

  it("puts banner words that fit the bar: the school on top, the mascot below", () => {
    for (const kit of kits) {
      expect(kit.banners.top.length, `${kit.slug} top banner`).toBeLessThanOrEqual(MAX_BANNER_CHARS);
      expect(kit.banners.bottom.length, `${kit.slug} bottom banner`).toBeLessThanOrEqual(MAX_BANNER_CHARS);
      expect(kit.banners.top, kit.slug).toBe(kit.banners.top.toUpperCase());
      expect(kit.banners.bottom, kit.slug).toBe(kit.mascot.toUpperCase());
    }
  });

  it("seeds four distinct, real, shown badges", () => {
    for (const kit of kits) {
      const sig = kit.signature ?? [];
      expect(sig, kit.slug).toHaveLength(4);
      expect(new Set(sig).size, kit.slug).toBe(4);
      for (const id of sig) {
        expect(getPiece(id), `${kit.slug} seeds ${id}`).toBeDefined();
        expect(WITHHELD_ART.has(id), `${kit.slug} seeds withheld ${id}`).toBe(false);
      }
    }
  });

  it("offers chips that each build a badge, once, at least one of them arts or academic", () => {
    for (const kit of kits) {
      const chips = kit.welcome?.chips ?? [];
      // A chip whose art is WITHHELD is hidden by the page and comes back by itself
      // when the art is redrawn (Ladue's Scholar Bowl), so it is not dead. A chip
      // that maps to nothing at all is.
      const dead = chips.filter((c) => !getPiece(chipPiece(c) ?? "") && !WITHHELD_ART.has(mapped(c)));
      expect(dead, `${kit.slug} has chips that build nothing`).toEqual([]);
      expect(new Set(chips.map(mapped)).size, `${kit.slug} has two chips for one badge`).toBe(chips.length);
      const nonSport = chips.filter((c) => {
        const g = GROUP.get(chipPiece(c) ?? "");
        return g === "Arts" || g === "Academics & clubs";
      });
      expect(nonSport.length, `${kit.slug} has only sports chips`).toBeGreaterThan(0);
      // An outside organisation's name is a search word, never a label.
      expect(chips.filter((c) => /olympiad/i.test(c)), kit.slug).toEqual([]);
    }
  });

  it("writes a welcome that names the school and promises nothing it has not got", () => {
    for (const kit of kits) {
      const w = kit.welcome;
      expect(w, `${kit.slug} has no welcome`).toBeDefined();
      if (!w) continue;
      if (!OWN_HEADLINE.has(kit.slug)) expect(w.headline, kit.slug).toMatch(/^Welcome, .+ families\.$/);
      expect(w.message, kit.slug).toHaveLength(2);
      expect(w.ordering, kit.slug).toContain(kit.shortName);
      // School surfaces show no figure by the owner's choice (CLAUDE.md, pricing).
      // The one dollar figure allowed is a FACT about a school (Highland Park's
      // Charity Drive), named here so a new one is a choice and not an accident.
      const ALLOWED_DOLLARS = ["$3 million"];
      let copy = `${w.message.join(" ")} ${w.ordering}`;
      for (const ok of ALLOWED_DOLLARS) copy = copy.split(ok).join("");
      expect(copy, kit.slug).not.toMatch(/\$\s?\d/);
    }
  });
});
