import { describe, it, expect } from "vitest";
import { bannerTagline, getBuyer } from "./frame-buyers";

/**
 * The jersey number belongs to the STUDENT, alongside the name and the year —
 * not to whichever design happens to be picked. So it rides the buyer's tagline,
 * and every buyer who has a class year can carry one.
 */

describe("the jersey number on the banner", () => {
  it("reads as a number and a year together", () => {
    expect(getBuyer("self").taglineFor("2027", "12")).toBe("#12 · CLASS OF 2027");
  });

  it("is optional — no number, no change", () => {
    // The frames that had no number before this existed must be untouched.
    expect(getBuyer("self").taglineFor("2027", "")).toBe("CLASS OF 2027");
    expect(getBuyer("self").taglineFor("2027")).toBe("CLASS OF 2027");
  });

  it("works for an alum, who also had a number once", () => {
    // The alum's DEFAULT line says ALUMNI; the #Number line still carries a number.
    expect(getBuyer("alum").taglineFor("1994", "7")).toBe("ALUMNI · CLASS OF 1994");
    expect(bannerTagline("number", { year: "1994", number: "7" })).toBe("#7 · CLASS OF 1994");
  });

  it("leaves the grandparent line alone", () => {
    // That buyer is purchasing the relationship, and "#12 · PROUD GRANDPARENT"
    // reads as the grandparent's own number.
    expect(getBuyer("grandparent").taglineFor("2028", "12")).toBe("PROUD GRANDPARENT · 2028");
  });

  it("gives staff their role, with or without a number", () => {
    expect(bannerTagline("staff", { year: "2027", number: "12" })).toBe("FACULTY & STAFF");
  });
});
