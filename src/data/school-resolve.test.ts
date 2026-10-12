import { describe, expect, it } from "vitest";
import { allSchoolKits } from "@/data/school-kits";
import { authoredSlugForRosterId, resolveSchoolKit, resolveSchoolSlug } from "@/data/school-resolve";
import { __allEntriesForTest, rosterEntryById } from "@/data/roster";

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
      // Same state is not enough: Illinois has two Mount Carmel High Schools, one
      // in Chicago and one downstate. The federal name and ours must share a
      // distinctive word ("Lyons Twp High Sch" / "Lyons Township High School").
      expect(sharesDistinctiveWord(row!.name, kit.schoolName), `${kit.slug} -> "${row!.name}"`).toBe(true);
      // And where the state has two rows of that very name, the CITY decides: the
      // two Mount Carmels share every word, so only Chicago vs Mount Carmel, IL
      // tells them apart.
      const twins = ROWS.filter((r) => r.state === row!.state && r.name === row!.name);
      if (twins.length > 1) {
        expect(sameCity(row!.city, kit.city.replace(/,\s*[A-Z]{2}$/, "")), `${kit.slug} -> ${row!.city}`).toBe(true);
      }
      expect(authoredSlugForRosterId(kit.rosterId!)).toBe(kit.slug);
    }
  });

  it("sends a campus row's own URL to its school's builder", () => {
    // The index is only half the join; this is the page a parent actually hits.
    const row = rosterEntryById("172820004263")!; // New Trier, Northfield campus
    expect(resolveSchoolSlug(row.slug)).toEqual({ kind: "redirect", to: "new-trier-trevians" });
  });

  it("joins every campus row to its school, by the same checks", () => {
    const withCampuses = allSchoolKits().filter((k) => k.campusRosterIds?.length);
    expect(withCampuses.map((k) => k.slug)).toContain("new-trier-trevians");
    const all = allSchoolKits().flatMap((k) => [k.rosterId, ...(k.campusRosterIds ?? [])]).filter(Boolean);
    expect(new Set(all).size, "a roster row claimed by two kits").toBe(all.length);
    for (const kit of withCampuses) {
      for (const id of kit.campusRosterIds!) {
        const row = rosterEntryById(id);
        expect(row, `${kit.slug} campus ${id}`).toBeDefined();
        expect(row!.state).toBe(kit.city.slice(-2));
        expect(sharesDistinctiveWord(row!.name, kit.schoolName), `${kit.slug} -> "${row!.name}"`).toBe(true);
        expect(authoredSlugForRosterId(id)).toBe(kit.slug);
      }
    }
  });

  it("leaves the kits with no roster row alone", () => {
    // These schools are not in the federal private-school extract at all. They
    // work exactly as before; they are simply not reachable under a second URL.
    // Asserted so a future rebuild that ADDS them is noticed rather than silently
    // leaving a school half-joined.
    const missing = allSchoolKits().filter((k) => !k.rosterId).map((k) => k.slug);
    expect(missing.sort()).toEqual([
      "carmel-catholic-corsairs",
      "cbc-cadets",
      "john-burroughs-bombers",
      "loyola-academy-ramblers",
      "nerinx-hall-markers",
    ]);
  });
});

const ROWS = __allEntriesForTest();

function sameCity(a: string, b: string): boolean {
  const norm = (s: string) =>
    s.toLowerCase().replace(/\bmt\b\.?/g, "mount").replace(/\bst\b\.?/g, "saint").replace(/[^a-z]/g, "");
  return norm(a) === norm(b);
}

/** Words that say what a school IS, not which one it is. */
const GENERIC = new Set(["high", "school", "sch", "academy", "college", "prep", "saint", "community", "comm", "township", "twp"]);

/** Does the federal `row` name the same school as our `kit` name? A shared word
 *  that is not generic, or — for a school known by its acronym (MICDS) — the
 *  acronym's letters in order among the federal name's initials. */
function sharesDistinctiveWord(row: string, kit: string): boolean {
  const words = (s: string) =>
    new Set(s.toLowerCase().split(/[^a-z]+/).filter((w) => w.length >= 4 && !GENERIC.has(w)));
  const wk = words(kit);
  if ([...words(row)].some((w) => wk.has(w))) return true;
  if (!/^[A-Z]{3,}$/.test(kit)) return false;
  const initials = row.toUpperCase().split(/[^A-Z]+/).filter(Boolean).map((w) => w[0]).join("");
  let i = 0;
  for (const c of initials) if (c === kit[i]) i++;
  return i === kit.length;
}
