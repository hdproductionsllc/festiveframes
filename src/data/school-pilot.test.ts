import { describe, it, expect } from "vitest";
import { finderSchools, isBuilderOpen, pilotSchoolKits, PILOT_SCHOOL_SLUGS, SCHOOL_FINDER_SCOPE } from "@/data/school-pilot";
import { allSchoolKits } from "@/data/school-kits";
import { authoredSlugForRosterId, resolveSchoolSlug } from "@/data/school-resolve";

describe("the St. Louis pilot", () => {
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

  it("only the pilot opens a builder; everyone else gets the not-ready page", () => {
    for (const slug of PILOT_SCHOOL_SLUGS) expect(isBuilderOpen(slug), slug).toBe(true);
    // A roster school is still RESOLVED (so the page can name it) but does not
    // open a builder.
    expect(resolveSchoolSlug("albertville-high-school-albertville-al").kind).toBe("roster");
    expect(isBuilderOpen("albertville-high-school-albertville-al")).toBe(false);
  });

  it("the St. Louis pilot is every authored Missouri kit, each listed once", () => {
    // A St. Louis kit left off the list is a school we did the homework for and
    // then show a "not ready" page; a duplicate shows twice in the finder. Other
    // metros (data/kits/) are authored ahead of opening and stay out.
    expect(new Set(PILOT_SCHOOL_SLUGS).size).toBe(PILOT_SCHOOL_SLUGS.length);
    const missouri = allSchoolKits().filter((k) => k.city.endsWith(", MO")).map((k) => k.slug);
    expect([...PILOT_SCHOOL_SLUGS].sort()).toEqual(missouri.sort());
  });

  it("Eureka's federal roster row redirects to its authored kit", () => {
    expect(authoredSlugForRosterId("292685001621")).toBe("eureka-wildcats");
  });
});
