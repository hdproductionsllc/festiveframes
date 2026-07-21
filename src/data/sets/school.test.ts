import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import path from "node:path";
import {
  getSet,
  getSetPieces,
  SURFACED_SET_IDS,
  SCHOOL_SURFACED_SET_IDS,
  surfacedSets,
  resolveSurfacedSetId,
} from "./index";
import { schoolSet } from "./school";

describe("school spirit set", () => {
  it("is registered and getSet-able", () => {
    const set = getSet("school");
    expect(set).toBeDefined();
    expect(set).toBe(schoolSet);
    expect(set?.id).toBe("school");
    expect(set?.name).toBe("School Spirit");
  });

  it("has pieces, all with well-formed ids and matching setId", () => {
    const pieces = getSetPieces("school");
    expect(pieces.length).toBeGreaterThan(0);
    for (const p of pieces) {
      expect(p.id).toMatch(/^school:[a-z0-9-]+$/);
      expect(p.setId).toBe("school");
      expect(p.name.length).toBeGreaterThan(0);
      expect(p.emoji.length).toBeGreaterThan(0);
    }
  });

  it("has unique piece ids", () => {
    const ids = schoolSet.pieces.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("references no missing art — empty, Twemoji CDN, or a local file that EXISTS", () => {
    // Real production art is a human task (tasks/school-spirit-ideogram-brief.md).
    // Until it lands, every artworkUrl must be either empty (solid color block), a
    // Twemoji CDN SVG (generic emoji placeholder), or a local "/tiles/..." path that
    // actually points at a committed file (the multi-cell TEST placeholders) — the
    // real guard is "never reference a local file that doesn't exist".
    for (const p of schoolSet.pieces) {
      if (p.artworkUrl === "" || p.artworkUrl.startsWith("https://cdn.jsdelivr.net/")) continue;
      expect(p.artworkUrl.startsWith("/tiles/"), `${p.id} -> ${p.artworkUrl}`).toBe(true);
      const onDisk = path.join(process.cwd(), "public", p.artworkUrl);
      expect(existsSync(onDisk), `missing local art file: ${onDisk}`).toBe(true);
    }
  });

  it("has well-formed presets referencing only its own pieces", () => {
    expect(schoolSet.presets.length).toBeGreaterThan(0);
    const ownIds = new Set(schoolSet.pieces.map((p) => p.id));
    for (const preset of schoolSet.presets) {
      for (const tile of Object.values(preset.slots)) {
        expect(tile.setId).toBe("school");
        expect(ownIds.has(tile.pieceId)).toBe(true);
      }
    }
  });
});

describe("scoped surfacing — /build stays unchanged", () => {
  it("does NOT surface the school set on /build", () => {
    expect(SURFACED_SET_IDS).not.toContain("school");
    expect(surfacedSets.map((s) => s.id)).not.toContain("school");
  });

  it("keeps the exact /build surfaced list (regression gate)", () => {
    expect([...SURFACED_SET_IDS]).toEqual(["july4th"]);
  });

  it("surfaces the school set only in the school-scoped list", () => {
    expect([...SCHOOL_SURFACED_SET_IDS]).toEqual(["school"]);
  });
});

describe("resolveSurfacedSetId", () => {
  it("defaults to /build behavior: passes through a surfaced set", () => {
    expect(resolveSurfacedSetId("july4th")).toBe("july4th");
  });

  it("defaults to /build behavior: falls back to first surfaced set when off-list", () => {
    // e.g. seasonal default lands on a non-surfaced set → /build still shows july4th.
    expect(resolveSurfacedSetId("valentines")).toBe("july4th");
  });

  it("forces the school set in the school palette regardless of the global active set", () => {
    expect(resolveSurfacedSetId("july4th", SCHOOL_SURFACED_SET_IDS)).toBe("school");
    expect(resolveSurfacedSetId("school", SCHOOL_SURFACED_SET_IDS)).toBe("school");
  });
});
