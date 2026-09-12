import { describe, expect, it } from "vitest";
import { GET } from "./route";
import type { SchoolFindResult } from "./route";

// ─── The national half of the finder ─────────────────────────────────────────
//
// The browser ranks the 27 authored kits itself and merges them on top of this.
// So what matters here is the OTHER half: that a name finds the right school
// anywhere in the country, and that a school which already has an authored page
// never comes back as a second, thinner entry beside it.

async function find(q: string): Promise<SchoolFindResult[]> {
  const res = await GET(new Request(`http://localhost:3000/api/school/find?q=${encodeURIComponent(q)}`));
  expect(res.headers.get("Cache-Control")).toBe("public, max-age=300");
  const json = (await res.json()) as { results: SchoolFindResult[] };
  return json.results;
}

describe("GET /api/school/find", () => {
  it("finds a school by name, anywhere", async () => {
    const hits = await find("albertville");
    expect(hits[0]).toMatchObject({
      name: "Albertville High School",
      city: "Albertville",
      state: "AL",
      type: "PUBLIC",
    });
    expect(hits[0].slug).toBe("albertville-high-school-albertville-al");
  });

  it("carries city and state on every row, because names repeat nationally", async () => {
    const hits = await find("lincoln high");
    expect(hits.length).toBeGreaterThan(3);
    // Several rows share a name; the city is what tells them apart, so it can
    // never be blank.
    expect(hits.every((h) => h.city && /^[A-Z]{2}$/.test(h.state))).toBe(true);
    expect(new Set(hits.map((h) => h.slug)).size).toBe(hits.length);
  });

  it("hides a roster row whose school already has an authored kit", async () => {
    // SLUH is on the roster as "St Louis University High School". The finder
    // merges the authored kit on top; returning the roster row too would list the
    // same school twice, and picking it only redirects back.
    const hits = await find("st louis university high");
    expect(hits.map((h) => h.slug)).not.toContain(
      "st-louis-university-high-school-saint-louis-mo",
    );
  });

  it("returns at most ten", async () => {
    expect((await find("high school")).length).toBeLessThanOrEqual(10);
  });

  it("says nothing for a query too short to mean anything", async () => {
    expect(await find("a")).toEqual([]);
    expect(await find("")).toEqual([]);
    expect(await find("   ")).toEqual([]);
  });

  it("finds nothing rather than guessing", async () => {
    expect(await find("zzzzqqqq school")).toEqual([]);
  });
});
