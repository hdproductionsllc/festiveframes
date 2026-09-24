import { describe, it, expect } from "vitest";
import { BANNER_LINES, BUYERS, DEFAULT_BUYER, bannerTagline, getBuyer, yearsFor } from "./frame-buyers";

/**
 * The intake used to be third-person throughout, which assumed a parent buying
 * for a student. These are the cases that assumption got wrong.
 */

describe("who the frame is for", () => {
  it("offers the buyers we actually have", () => {
    expect(BUYERS.map((b) => b.id)).toEqual([
      "parent",
      "self",
      "grandparent",
      "alum",
      "staff",
    ]);
  });

  it("defaults to the parent, who is still the common case", () => {
    expect(getBuyer(DEFAULT_BUYER).id).toBe("parent");
    expect(getBuyer(undefined).id).toBe("parent");
    expect(getBuyer("nonsense-from-localstorage").id).toBe("parent");
  });

  it("speaks to the buyer in the right person", () => {
    expect(getBuyer("parent").activityLabel).toMatch(/they/i);
    expect(getBuyer("self").activityLabel).toMatch(/you/i);
    expect(getBuyer("alum").activityLabel).toMatch(/did/i);
  });

  it("never asks for a surname — the banner text is optional and says so", () => {
    // Owner, 2026-09-23: de-emphasise students' full names. The field was
    // "Their last name" with MILLER as the example on every buyer.
    for (const b of BUYERS) {
      expect(b.nameLabel, b.id).toMatch(/optional/i);
      expect(b.nameLabel, b.id).not.toMatch(/last name/i);
      expect(b.namePlaceholder, b.id).not.toMatch(/MILLER/);
    }
  });

  it("gives a grandparent their relationship, which is why they buy a second frame", () => {
    expect(getBuyer("grandparent").taglineFor("2027")).toMatch(/GRANDPARENT/);
    expect(getBuyer("grandparent").taglineFor("2027")).toContain("2027");
  });

  it("drops the class year for staff, who have none", () => {
    expect(getBuyer("staff").yearLabel).toBeNull();
    expect(getBuyer("staff").taglineFor("2027")).toBe("");
  });
});

describe("the year range follows the buyer", () => {
  // Fixed dates: the rolling rule is the whole point, so it cannot be tested
  // against whatever today happens to be.
  const JAN = new Date(2026, 0, 15);
  const JULY = new Date(2026, 6, 15);

  it("offers the four classes currently in the building", () => {
    expect(yearsFor("upcoming", JAN)).toEqual([2026, 2027, 2028, 2029]);
  });

  it("rolls after June, so the graduated class drops off", () => {
    expect(yearsFor("upcoming", JULY)).toEqual([2027, 2028, 2029, 2030]);
  });

  it("lets an ALUM reach their own class, which was previously impossible", () => {
    // The bug this closes: the picker only ever offered the next four years, so
    // a graduate of 1994 could not enter 1994 — the one thing they came to type.
    const years = yearsFor("past", JAN);
    expect(years).toContain(1994);
    expect(years[0]).toBe(2026);
    expect(years[years.length - 1]).toBe(1967);
  });

  it("keeps the alumni list descending and usable", () => {
    const years = yearsFor("past", JAN);
    expect(years.length).toBe(60);
    for (let i = 1; i < years.length; i++) expect(years[i]).toBeLessThan(years[i - 1]);
  });
});

describe("the banner line — one tap each, from one list", () => {
  it("puts PROUD PARENT and SENIOR one tap away for a parent", () => {
    const lines = getBuyer("parent").lines;
    expect(lines).toContain("parent");
    expect(lines).toContain("senior");
    expect(lines).toContain("number");
    expect(bannerTagline("parent", { year: "2027" })).toBe("PROUD PARENT · 2027");
    expect(bannerTagline("senior", { year: "2027" })).toBe("SENIOR · CLASS OF 2027");
  });

  it("offers a number for ANY activity, not only the jersey sports", () => {
    expect(BANNER_LINES.number.asks).toBe("number");
    expect(bannerTagline("number", { year: "2027", number: "12" })).toBe("#12 · CLASS OF 2027");
    // A chair or roster number with no year still reads.
    expect(bannerTagline("number", { number: "3" })).toBe("#3");
  });

  it("reads without a year where the words stand alone", () => {
    expect(bannerTagline("parent", {})).toBe("PROUD PARENT");
    expect(bannerTagline("senior", {})).toBe("SENIOR");
    expect(bannerTagline("class", {})).toBe("");
  });

  it("takes the buyer's own words for the custom line", () => {
    expect(bannerTagline("custom", { text: "  go cats " })).toBe("GO CATS");
    expect(bannerTagline("custom", {})).toBe("");
  });

  it("derives each buyer's default tagline from its FIRST line, not a second list", () => {
    for (const b of BUYERS) {
      expect(b.lines.length, b.id).toBeGreaterThan(0);
      for (const id of b.lines) expect(BANNER_LINES[id], `${b.id}:${id}`).toBeDefined();
      expect(b.taglineFor("2027", "12"), b.id).toBe(bannerTagline(b.lines[0], { year: "2027", number: "12" }));
    }
  });
});
