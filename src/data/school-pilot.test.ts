import { describe, it, expect } from "vitest";
import { finderSchools, isBuilderOpen, pilotSchoolKits, PILOT_SCHOOL_SLUGS, SCHOOL_FINDER_SCOPE } from "@/data/school-pilot";
import { allSchoolKits } from "@/data/school-kits";
import { authoredSlugForRosterId, resolveSchoolSlug } from "@/data/school-resolve";

describe("the six-school pilot", () => {
  it("every pilot school has an authored kit", () => {
    expect(pilotSchoolKits().map((k) => k.slug)).toEqual([...PILOT_SCHOOL_SLUGS]);
  });

  it("the finder offers exactly the pilot while the scope is pilot", () => {
    expect(SCHOOL_FINDER_SCOPE).toBe("pilot");
    expect(finderSchools().map((s) => s.slug)).toEqual([...PILOT_SCHOOL_SLUGS]);
  });

  it("each pilot school opens its own builder at /s/<slug>", () => {
    for (const slug of PILOT_SCHOOL_SLUGS) {
      expect(resolveSchoolSlug(slug).kind, slug).toBe("authored");
    }
  });

  it("only the pilot six open a builder; everyone else gets the not-ready page", () => {
    for (const slug of PILOT_SCHOOL_SLUGS) expect(isBuilderOpen(slug), slug).toBe(true);
    // An authored kit outside the pilot, and a roster school, are both still
    // RESOLVED (so the page can name them) but neither opens a builder.
    expect(resolveSchoolSlug("sluh-jr-bills").kind).toBe("authored");
    expect(isBuilderOpen("sluh-jr-bills")).toBe(false);
    expect(isBuilderOpen("albertville-high-school-albertville-al")).toBe(false);
    // The gate hides builders; it deletes nothing. Every authored kit is still here.
    expect(allSchoolKits().length).toBeGreaterThan(PILOT_SCHOOL_SLUGS.length);
  });

  it("Eureka's federal roster row redirects to its authored kit", () => {
    expect(authoredSlugForRosterId("292685001621")).toBe("eureka-wildcats");
  });
});
