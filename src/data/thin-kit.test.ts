import { describe, expect, it } from "vitest";
import { GENERIC_MARKS, kitSeedTiles } from "@/data/kit-seed";
import { SCHOOL_SHIPPING_VARIANT, schoolVariant } from "@/data/school-variants";
import { fitBanner, stripHighSchool, thinKitFromRoster } from "@/data/thin-kit";
import { kitPlateState } from "@/data/school-kits";
import type { RosterEntry } from "@/data/roster";

// ─── A generated kit still has to be a kit ───────────────────────────────────
//
// 29,440 schools get one of these and nobody will ever look at most of them, so
// the things that would be caught by eye on the 27 have to be caught here: a
// banner too long to read, a school whose name became empty, a signature that
// starves the badge seeder, and — the one that matters most — a claim.

const entry = (over: Partial<RosterEntry> = {}): RosterEntry => ({
  id: "123456789",
  slug: "albertville-high-school-albertville-al",
  name: "Albertville High School",
  city: "Albertville",
  state: "AL",
  zip: "35950",
  type: "PUBLIC",
  population: 1710,
  ...over,
});

describe("the school's name on the banner", () => {
  it("drops the school-name suffix however the directory spelled it", () => {
    for (const [name, short] of [
      ["Albertville High School", "Albertville"],
      ["Lincoln High", "Lincoln"],
      ["Carbondale Comm H S", "Carbondale Comm"],
      ["Hoover Senior High School", "Hoover"],
      ["Marquette Sr. High", "Marquette"],
      ["Pine Bluff Jr/Sr High School", "Pine Bluff"],
    ] as const) {
      expect(stripHighSchool(name), name).toBe(short);
    }
  });

  it("keeps Academy, which is part of the name rather than a suffix", () => {
    expect(stripHighSchool("Lincoln Park Academy")).toBe("Lincoln Park Academy");
    expect(stripHighSchool("Cor Jesu Academy")).toBe("Cor Jesu Academy");
  });

  it("never returns an empty banner", () => {
    // The directory really does list schools called exactly this.
    expect(stripHighSchool("High School")).toBe("High School");
  });
});

describe("fitBanner", () => {
  it("leaves anything that already fits alone", () => {
    expect(fitBanner("KIRKWOOD")).toBe("KIRKWOOD");
  });

  it("drops HIGH SCHOOL before it drops anything a parent would miss", () => {
    expect(fitBanner("WASHINGTON TOWNSHIP HIGH SCHOOL")).toBe("WASHINGTON TOWNSHIP");
  });

  it("abbreviates SAINT the way the schools do, and keeps the case it was given", () => {
    // 35 chars in; SAINT -> ST. saves five, and the word-boundary cut takes the
    // trailing SCHOOL.
    expect(fitBanner("SAINT MARY OF THE ASSUMPTION SCHOOL", 30)).toBe(
      "ST. MARY OF THE ASSUMPTION",
    );
    expect(fitBanner("Saint Regis Falls Central School", 28)).toBe("St. Regis Falls Central");
  });

  it("truncates on a word boundary, never mid-word", () => {
    const out = fitBanner("ACADEMY OF OUR LADY OF PEACE", 22);
    expect(out).toBe("ACADEMY OF OUR LADY");
    expect("ACADEMY OF OUR LADY OF PEACE".startsWith(out)).toBe(true);
  });

  it("does not leave the banner hanging on a preposition", () => {
    // The word-boundary cut alone gives "ACADEMY OF OUR LADY OF", which reads as
    // a banner that ran out of frame rather than as a name.
    expect(fitBanner("ACADEMY OF OUR LADY OF PEACE", 24).endsWith("OF")).toBe(false);
  });

  it("returns a single long word whole rather than half of it", () => {
    expect(fitBanner("MISSISSIPPIWORDTHATISLONG", 10)).toBe("MISSISSIPPIWORDTHATISLONG");
  });
});

describe("a thin kit", () => {
  it("says nothing about the school it does not know", () => {
    const kit = thinKitFromRoster(entry());
    expect(kit.mascot).toBe("");
    expect(kit.status).toBe("demo");
    expect(kit.colorSource).toMatch(/no colours on file/);
    expect(kit.colors).toEqual({ frame: "#1B2A4A", tileField: "#1B2A4A", rim: "#FFFFFF" });
    // The welcome copy names only what the roster row says: the school, and the
    // city. A claim about a programme would have to come from somewhere, and
    // there is nowhere for it to come from.
    const prose = [kit.welcome!.headline, ...kit.welcome!.message, kit.welcome!.ordering].join(" ");
    expect(prose).toContain("Albertville");
    expect(prose).not.toMatch(/state champion|tradition|since \d{4}|known for (its|their)/i);
  });

  it("carries identity and appearance only — the geometry guard's rule", () => {
    const kit = thinKitFromRoster(entry());
    const ALLOWED = new Set([
      "slug", "rosterId", "schoolName", "shortName", "mascot", "city",
      "colors", "banners", "fontFamily", "welcome", "signature", "marks",
      "plate", "status", "colorSource",
    ]);
    expect(Object.keys(kit).filter((k) => !ALLOWED.has(k))).toEqual([]);
  });

  it("puts the name on the banners in both tiers, without repeating itself", () => {
    const kit = thinKitFromRoster(entry());
    expect(kit.banners.bottom).toBe("ALBERTVILLE");
    expect(kit.banners.tagline).toBe("ALBERTVILLE HIGH SCHOOL");

    // The 60-character case: the two tiers must not say the same words twice.
    const long = thinKitFromRoster(
      entry({ name: "Alternative Computerized Education (ACE) Charter High School" }),
    );
    expect(long.banners.tagline).not.toBe(long.banners.bottom);
    expect(long.banners.bottom.length).toBeLessThanOrEqual(26);
    expect(long.banners.tagline.length).toBeLessThanOrEqual(34);
  });

  it("leaves at least two generic marks for the badge seeder", () => {
    // `kitMarks` picks the frame's two centre marks from GENERIC_MARKS minus the
    // kit's own signature. A thin kit that spent the whole list would seed an
    // empty pocket, so the rule is checked against the real list, not restated.
    const kit = thinKitFromRoster(entry());
    const spent = (kit.signature ?? []).filter((id) => GENERIC_MARKS.includes(id));
    expect(spent.length).toBeLessThanOrEqual(1);
  });

  it("seeds a complete frame on the variant every school ships on", () => {
    const { config, badgeStack } = schoolVariant(SCHOOL_SHIPPING_VARIANT);
    const slots = kitSeedTiles(thinKitFromRoster(entry()), config, badgeStack);
    const pieces = Object.values(slots).map((t) => t.pieceId);
    expect(pieces.length).toBe(6);
    expect(pieces.every((p) => typeof p === "string" && p.includes(":"))).toBe(true);
    // Never the same badge twice in a row down a column (school-presets rule 1).
    expect(new Set(pieces).size).toBeGreaterThan(4);
  });

  it("opens on its own state's plate, and on nobody's for a territory", () => {
    expect(kitPlateState(thinKitFromRoster(entry()))).toBe("AL");
    expect(kitPlateState(thinKitFromRoster(entry({ state: "TX", city: "Austin" })))).toBe("TX");
    // Puerto Rico, the Virgin Islands and the Marianas are on the roster and have
    // no plate design; the caller keeps its own default rather than showing a
    // mainland plate on a school that cannot have one.
    expect(kitPlateState(thinKitFromRoster(entry({ state: "PR", city: "San Juan" })))).toBeNull();
  });
});
