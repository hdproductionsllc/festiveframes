import { describe, expect, it } from "vitest";
import {
  __allEntriesForTest,
  __buildIndexForTest,
  rosterEntry,
  rosterEntryById,
  rosterSize,
  rosterSlug,
  searchIndex,
  searchRoster,
  type RosterRow,
} from "@/data/roster";

// ─── The roster ──────────────────────────────────────────────────────────────
//
// Two jobs, tested separately because they fail differently. RANKING is a rule
// about what a parent sees first, exercised on a handful of rows where a wrong
// answer is readable. THE BUILT FILE is 29,467 rows, and the only things worth
// asserting about it are the invariants the app depends on: every slug unique
// (two schools on one URL is one school with no page) and every row the shape
// roster.ts destructures.

const ROWS: RosterRow[] = [
  ["1", "Lincoln High School", "Lincoln", "NE", "68502", "PUBLIC", 1800],
  ["2", "Lincoln High School", "Portland", "OR", "97205", "PUBLIC", 1650],
  ["3", "Lincoln Park Academy", "Fort Pierce", "FL", "34950", "PUBLIC", 1400],
  ["4", "Roosevelt High School", "Lincoln", "NE", "68510", "PUBLIC", 900],
  ["5", "Lincolnshire Country Day", "Mettawa", "IL", "60045", "PRIVATE", null],
  ["6", "Central High School", "Lincoln", "NE", "68508", "PUBLIC", 2400],
];

const index = __buildIndexForTest(ROWS);
const ids = (q: string, limit = 10) => searchIndex(index, q, limit).map((e) => e.id);
const names = (q: string, limit = 10) => searchIndex(index, q, limit).map((e) => e.name);

describe("searchRoster ranking", () => {
  it("puts a name that STARTS with the query above one that only matches its city", () => {
    // 1, 2, 3 and 5 all START with "Lincoln" and lead, biggest first. Roosevelt
    // and Central are in the CITY of Lincoln and come after all four, however
    // large they are — a school named for what you typed beats a school near it.
    expect(ids("lincoln")).toEqual(["1", "2", "3", "5", "6", "4"]);
  });

  it("breaks ties on enrolment, so the bigger school of the same name leads", () => {
    // Nebraska (1800) before Oregon (1650) — identical names, identical score.
    // Central and Roosevelt trail: "high" is in their names but "lincoln" is
    // only in their city, which is the third tier.
    expect(searchIndex(index, "lincoln high").map((e) => e.state)).toEqual([
      "NE",
      "OR",
      "NE",
      "NE",
    ]);
    expect(ids("lincoln high").slice(2)).toEqual(["6", "4"]);
  });

  it("matches tokens across name AND city, ranked below a name-only hit", () => {
    expect(names("central lincoln")).toEqual(["Central High School"]);
  });

  it("matches on a word prefix, not a substring", () => {
    // "linc" finds the four Lincoln-named schools plus the two in Lincoln, NE;
    // "oln" is mid-word in every one of them and finds nothing at all.
    expect(names("linc").length).toBe(6);
    expect(names("oln")).toEqual([]);
  });

  it("requires EVERY token to land somewhere", () => {
    expect(names("lincoln banana")).toEqual([]);
  });

  it("respects the limit and stays quiet under two characters", () => {
    expect(names("lincoln", 2).length).toBe(2);
    expect(names("l")).toEqual([]);
  });

  it("treats punctuation and case as noise", () => {
    expect(names("LINCOLN, high")).toEqual(names("lincoln high"));
  });

  it("slugs on name + city + state, so two Lincoln Highs are two pages", () => {
    expect(rosterSlug("Lincoln High School", "Lincoln", "NE")).toBe(
      "lincoln-high-school-lincoln-ne",
    );
    expect(searchIndex(index, "lincoln high").slice(0, 2).map((e) => e.slug)).toEqual([
      "lincoln-high-school-lincoln-ne",
      "lincoln-high-school-portland-or",
    ]);
  });
});

describe("the built roster file", () => {
  const all = __allEntriesForTest();

  it("loaded, and resolves by slug and by id", () => {
    expect(rosterSize()).toBeGreaterThan(25_000);
    expect(all.length).toBe(rosterSize());
    // SLUH, exactly as the federal PSS directory spells it — "St Louis
    // University High School" in "Saint Louis". The roster never re-words a
    // school's name, so the slug carries the directory's spelling and the
    // authored kit reaches it by `rosterId`, not by guessing this string.
    const sluh = rosterEntry("st-louis-university-high-school-saint-louis-mo");
    expect(sluh?.name).toBe("St Louis University High School");
    expect(rosterEntryById(sluh!.id)?.slug).toBe(sluh!.slug);
    expect(rosterEntry("does-not-exist")).toBeUndefined();
  });

  it("gives every school its own slug", () => {
    const seen = new Set(all.map((e) => e.slug));
    expect(seen.size).toBe(all.length);
  });

  it("gives every row all seven fields", () => {
    // ONE assertion over 29,467 rows, not seven per row: an expect() per field
    // is 206,000 calls and took 1.3s of the suite's wall clock to say the same
    // thing. Collect the offenders and name them instead.
    const bad = all
      .filter(
        (e) =>
          !e.id ||
          !e.name ||
          !e.city ||
          !/^[A-Z]{2}$/.test(e.state) ||
          typeof e.zip !== "string" ||
          (e.type !== "PUBLIC" && e.type !== "PRIVATE") ||
          (e.population !== null && typeof e.population !== "number"),
      )
      .slice(0, 5);
    expect(bad, `malformed rows: ${JSON.stringify(bad)}`).toEqual([]);
  });

  it("answers a warm query fast enough to type against", () => {
    searchRoster("warm"); // pay for the index outside the measurement
    const queries = ["albertville", "lincoln high", "st louis", "washington", "central"];
    const started = performance.now();
    for (const q of queries) searchRoster(q);
    const each = (performance.now() - started) / queries.length;
    // Measured well under 5 ms on this machine; the bound is deliberately loose
    // because render tests running beside this one have flaked the suite under
    // CPU contention before, and a perf test that teaches people to re-run is
    // worse than none. It still catches the change that matters — one that walks
    // all 29,467 rows per keystroke.
    expect(each).toBeLessThan(50);
  });
});
