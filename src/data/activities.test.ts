import { describe, it, expect } from "vitest";
import { ACTIVITIES, ACTIVITY_GROUPS, hasJerseyNumber } from "./activities";
import { getPiece } from "@/data/sets";

/**
 * The list moved out of the builder's JSX so each entry could carry whether it
 * wears a number. A wrong answer here shows a swimmer's parent a jersey field, or
 * hides it from a goalkeeper's.
 */

describe("the activity list", () => {
  it("places only badges that exist", () => {
    for (const a of ACTIVITIES) {
      expect(getPiece(a.id), `${a.label} references unknown piece ${a.id}`).toBeTruthy();
    }
  });

  it("has no duplicates and no orphan groups", () => {
    expect(new Set(ACTIVITIES.map((a) => a.id)).size).toBe(ACTIVITIES.length);
    for (const a of ACTIVITIES) expect(ACTIVITY_GROUPS).toContain(a.group);
    // Every group is populated, or the picker renders an empty header.
    for (const g of ACTIVITY_GROUPS) expect(ACTIVITIES.some((a) => a.group === g)).toBe(true);
  });
});

describe("which activities wear a number", () => {
  it("asks the team sports that put one on the uniform", () => {
    for (const id of [
      "hs:football-patch",
      "hs:soccer-patch",
      "hs:basketball-patch",
      "hs:volleyball-patch",
      "hs:baseball-patch",
      "hs:softball-patch",
      "hs:lacrosse",
      "hs:ice-hockey",
      "hs:field-hockey",
      "hs:water-polo",
      "hs:rugby",
    ]) {
      expect(hasJerseyNumber(id), `${id} should offer a number`).toBe(true);
    }
  });

  it("does not ask an athlete who has no number", () => {
    // Track and cross country pin on a bib assigned per meet — not their number.
    // Wrestling is a weight class. The rest never wear one.
    for (const id of [
      "hs:track",
      "hs:cross-country",
      "hs:swim-dive",
      "hs:wrestling",
      "hs:tennis",
      "hs:golf",
      "hs:racquetball",
      "hs:gymnastics",
      "hs:bowling",
      "hs:cheer",
      "hs:dance",
      "hs:esports",
    ]) {
      expect(hasJerseyNumber(id), `${id} should not ask for a number`).toBe(false);
    }
  });

  it("never asks outside sport at all", () => {
    for (const a of ACTIVITIES) {
      if (a.group === "Sports") continue;
      expect(hasJerseyNumber(a.id), `${a.label} should not ask for a number`).toBe(false);
    }
  });

  it("treats nothing-chosen and anything-unknown as no", () => {
    expect(hasJerseyNumber("")).toBe(false);
    expect(hasJerseyNumber(null)).toBe(false);
    expect(hasJerseyNumber("hs:not-a-thing")).toBe(false);
  });
});
