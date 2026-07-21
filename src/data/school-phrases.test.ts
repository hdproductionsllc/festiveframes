import { describe, it, expect } from "vitest";
import {
  getGradYear,
  resolvePhrase,
  SCHOOL_PHRASES,
  SCHOOL_PHRASE_GROUPS,
} from "./school-phrases";
import { SCHOOL_FONT_IDS, BOTTOM_BAR_FONTS } from "@/lib/constants/frame";

const MAX_CHARS = 60; // must match SectionEditor's cap

describe("school phrase library", () => {
  it("has no hardcoded past/stale year (every embedded year is >= current year)", () => {
    const currentYear = new Date().getFullYear();
    for (const phrase of SCHOOL_PHRASES) {
      const years = phrase.match(/\b20\d\d\b/g) ?? [];
      for (const y of years) {
        // Catches the old flat list's hardcoded "2026" once the calendar rolls past it.
        expect(Number(y)).toBeGreaterThanOrEqual(currentYear);
      }
    }
  });

  it("getGradYear returns a year >= the current calendar year", () => {
    const currentYear = new Date().getFullYear();
    expect(getGradYear()).toBeGreaterThanOrEqual(currentYear);
  });

  it("rolls to next year's class from June onward, stays this year before", () => {
    expect(getGradYear(new Date(2030, 0, 15))).toBe(2030); // January -> 2030
    expect(getGradYear(new Date(2030, 4, 31))).toBe(2030); // May -> 2030
    expect(getGradYear(new Date(2030, 5, 1))).toBe(2031); // June -> 2031
    expect(getGradYear(new Date(2030, 11, 1))).toBe(2031); // December -> 2031
  });

  it("resolves {year} and {yy} tokens, leaves [MASCOT]/[#] placeholders intact", () => {
    expect(resolvePhrase("CLASS OF {year}", 2027)).toBe("CLASS OF 2027");
    expect(resolvePhrase("CLASS OF {yy}", 2027)).toBe("CLASS OF '27");
    expect(resolvePhrase("GO [MASCOT]", 2027)).toBe("GO [MASCOT]");
  });

  it("every resolved phrase fits within MAX_CHARS", () => {
    for (const phrase of SCHOOL_PHRASES) {
      expect(phrase.length).toBeLessThanOrEqual(MAX_CHARS);
    }
  });

  it("has non-empty categorized groups and a matching flat list", () => {
    expect(SCHOOL_PHRASE_GROUPS.length).toBeGreaterThan(0);
    for (const g of SCHOOL_PHRASE_GROUPS) {
      expect(g.category).toBeTruthy();
      expect(g.phrases.length).toBeGreaterThan(0);
    }
    const flatFromGroups = SCHOOL_PHRASE_GROUPS.flatMap((g) => g.phrases);
    expect(SCHOOL_PHRASES).toEqual(flatFromGroups);
  });
});

describe("collegiate font curation", () => {
  it("SCHOOL_FONT_IDS reference only ids that exist in BOTTOM_BAR_FONTS", () => {
    const known = new Set(BOTTOM_BAR_FONTS.map((f) => f.id));
    for (const id of SCHOOL_FONT_IDS) {
      expect(known.has(id)).toBe(true);
    }
  });
});
