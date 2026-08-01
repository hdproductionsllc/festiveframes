import { describe, it, expect } from "vitest";
import { BUYERS, DEFAULT_BUYER, getBuyer, yearsFor } from "./frame-buyers";

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
    expect(getBuyer("parent").nameLabel).toMatch(/their/i);
    expect(getBuyer("self").nameLabel).toMatch(/your/i);
    expect(getBuyer("alum").activityLabel).toMatch(/did/i);
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
