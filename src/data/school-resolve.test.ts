import { describe, expect, it } from "vitest";
import { allSchoolKits } from "@/data/school-kits";
import { authoredSlugForRosterId, resolveSchoolKit, resolveSchoolSlug } from "@/data/school-resolve";
import { rosterEntryById } from "@/data/roster";

// ─── What school is /s/<slug>? ───────────────────────────────────────────────
//
// The resolve order IS the product, so it is pinned here rather than only in a
// comment on the route: authored kit → roster row → nothing, with a school that
// has both reachable at one URL and redirected from the other.

describe("resolve order", () => {
  it("gives an authored kit to its own slug, unchanged", () => {
    const r = resolveSchoolSlug("sluh-jr-bills");
    expect(r.kind).toBe("authored");
    expect(r.kind === "authored" && r.kit.mascot).toBe("Jr. Bills");
    // The 27 keep their researched colours; nothing generated touches them.
    expect(r.kind === "authored" && r.kit.colors.frame).toBe("#183B67");
  });

  it("gives a thin kit to a roster slug", () => {
    const r = resolveSchoolSlug("albertville-high-school-albertville-al");
    expect(r.kind).toBe("roster");
    expect(r.kind === "roster" && r.kit.shortName).toBe("Albertville");
    expect(r.kind === "roster" && r.kit.city).toBe("Albertville, AL");
    expect(r.kind === "roster" && r.kit.status).toBe("demo");
  });

  it("redirects a roster slug whose school is already authored", () => {
    const r = resolveSchoolSlug("st-louis-university-high-school-saint-louis-mo");
    expect(r).toEqual({ kind: "redirect", to: "sluh-jr-bills" });
  });

  it("is missing for anything else", () => {
    expect(resolveSchoolSlug("does-not-exist").kind).toBe("missing");
    expect(resolveSchoolSlug("").kind).toBe("missing");
    expect(resolveSchoolKit("does-not-exist")).toBeUndefined();
  });

  it("follows the redirect for callers that only need something to render", () => {
    // The sample harness and the OG card take a kit, not a decision.
    expect(resolveSchoolKit("st-louis-university-high-school-saint-louis-mo")?.slug).toBe(
      "sluh-jr-bills",
    );
  });
});

describe("the rosterId join", () => {
  const withId = allSchoolKits().filter((k) => k.rosterId);

  it("points every authored rosterId at a real, distinct roster row", () => {
    // A wrong id redirects some OTHER school's page into this one, which is the
    // worst failure this join has — and it is silent.
    expect(withId.length).toBeGreaterThan(20);
    expect(new Set(withId.map((k) => k.rosterId)).size).toBe(withId.length);
    for (const kit of withId) {
      const row = rosterEntryById(kit.rosterId!);
      expect(row, `${kit.slug} names roster id ${kit.rosterId}`).toBeDefined();
      // Same state, at least: the strongest cheap check that the id is the right
      // school rather than a plausible-looking one.
      expect(row!.state, kit.slug).toBe(kit.city.slice(-2));
      expect(authoredSlugForRosterId(kit.rosterId!)).toBe(kit.slug);
    }
  });

  it("leaves the kits with no roster row alone", () => {
    // CBC, Nerinx Hall and John Burroughs are not in the federal private-school
    // extract at all. They work exactly as before; they are simply not reachable
    // under a second URL. Asserted so a future rebuild that ADDS them is noticed
    // rather than silently leaving three schools half-joined.
    const missing = allSchoolKits().filter((k) => !k.rosterId).map((k) => k.slug);
    expect(missing.sort()).toEqual([
      "cbc-cadets",
      "john-burroughs-bombers",
      "nerinx-hall-markers",
    ]);
  });
});
