import { describe, it, expect } from "vitest";
import { rankSchools, norm, type SchoolChoice } from "./FindMySchool";
import { allSchoolKits } from "@/data/school-kits";

/**
 * The one box a parent arriving from a group chat will use. It has to find a
 * school from whatever they actually type, which is a nickname far more often
 * than a legal name.
 */

const SCHOOLS: SchoolChoice[] = allSchoolKits().map((k) => ({
  slug: k.slug,
  schoolName: k.schoolName,
  shortName: k.shortName,
  mascot: k.mascot,
  city: k.city,
}));

const top = (q: string) => rankSchools(SCHOOLS, q)[0]?.slug;

describe("norm", () => {
  it("folds punctuation, case and accents", () => {
    expect(norm("St. Louis U. High")).toBe("st louis u high");
    expect(norm("MICDS")).toBe("micds");
    expect(norm("Café")).toBe("cafe");
  });
});

describe("finding a school from what a parent actually types", () => {
  it("has kits to search", () => {
    expect(SCHOOLS.length).toBeGreaterThan(0);
  });

  it("finds each kit by its own short name", () => {
    for (const s of SCHOOLS) {
      expect(rankSchools(SCHOOLS, s.shortName).map((k) => k.slug)).toContain(s.slug);
    }
  });

  it("finds each kit by its mascot", () => {
    for (const s of SCHOOLS) {
      expect(rankSchools(SCHOOLS, s.mascot).map((k) => k.slug)).toContain(s.slug);
    }
  });

  it("survives the punctuation people leave out", () => {
    // "St. Louis U. High" typed as "st louis u high", and an acronym typed lower.
    const sluh = SCHOOLS.find((s) => s.slug.startsWith("sluh"));
    if (sluh) {
      expect(top("sluh")).toBe(sluh.slug);
      expect(top("SLUH")).toBe(sluh.slug);
    }
  });

  it("ranks a name hit above a city hit", () => {
    // A parent typing a school name must not get a different school that merely
    // sits in a city of that name.
    const a: SchoolChoice = { slug: "a", schoolName: "Webster High", shortName: "Webster", mascot: "Statesmen", city: "Rock Hill" };
    const b: SchoolChoice = { slug: "b", schoolName: "Rock Hill Prep", shortName: "Rock Hill Prep", mascot: "Hawks", city: "Webster Groves" };
    expect(rankSchools([a, b], "webster")[0].slug).toBe("a");
  });

  it("says nothing until there is enough to go on", () => {
    // One character would match nearly everything and flash a list on every
    // keystroke, which reads as noise on a phone.
    expect(rankSchools(SCHOOLS, "")).toEqual([]);
    expect(rankSchools(SCHOOLS, "s")).toEqual([]);
  });

  it("returns empty rather than guessing for a school we do not have", () => {
    // The miss is the NATIONAL case, and the UI shows the build-from-your-website
    // route. It must be a real empty, not a bad match.
    expect(rankSchools(SCHOOLS, "zzzqqq high school")).toEqual([]);
  });

  it("caps the list so a phone never scrolls a dropdown", () => {
    const many = Array.from({ length: 40 }, (_, i) => ({
      slug: `s${i}`, schoolName: `Lincoln ${i} High`, shortName: `Lincoln ${i}`,
      mascot: "Lions", city: "Springfield",
    }));
    expect(rankSchools(many, "lincoln").length).toBe(6);
  });
});
