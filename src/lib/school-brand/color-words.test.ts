import { describe, it, expect } from "vitest";
import { colorWordsInText } from "@/lib/school-brand/extract-text";

describe("colorWordsInText — the colours a page states in words", () => {
  it("reads the phrase the reported school's page would carry", () => {
    const r = colorWordsInText("Our school colors are purple and white. Go Wildcats!");
    expect(r.map((c) => c.word)).toEqual(["purple", "white"]);
    expect(r[0].hex).toBe("#4E2A84");
  });

  it("prefers the LONGER colour name over its own suffix", () => {
    // "vegas gold" must not degrade to plain "gold" — different ink entirely.
    const r = colorWordsInText("School colors: navy blue and vegas gold");
    expect(r.map((c) => c.word)).toEqual(["vegas gold", "navy blue"]);
  });

  it("ignores colour words OUTSIDE a colours phrase", () => {
    // The whole reason this is trustworthy: a news item about a red barn is not a
    // statement of brand colour.
    expect(colorWordsInText("The red barn burned down. Visit our green campus.")).toEqual([]);
  });

  it("handles the ampersand and possessive forms schools actually write", () => {
    expect(colorWordsInText("Team Colors: Maroon & Gold").map((c) => c.word))
      .toEqual(["maroon", "gold"]);
    expect(colorWordsInText("our colours are royal blue and silver").map((c) => c.word))
      .toEqual(["royal blue", "silver"]);
  });

  it("stops at the end of the sentence, not the end of the page", () => {
    const r = colorWordsInText("School colors are green and white. Our black history month event.");
    expect(r.map((c) => c.word)).toEqual(["green", "white"]);
  });

  it("caps at a scheme, not a paint chart", () => {
    const r = colorWordsInText("colors are red orange yellow green blue purple black white");
    expect(r.length).toBeLessThanOrEqual(4);
  });

  it("returns nothing when the page never states its colours", () => {
    expect(colorWordsInText("Welcome to our school. Enrollment is open.")).toEqual([]);
  });
});
