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
import { TILE_BG, tileBackground } from "@/lib/utils/tile-theme";

describe("school spirit set", () => {
  it("is registered and getSet-able", () => {
    const set = getSet("school");
    expect(set).toBeDefined();
    expect(set).toBe(schoolSet);
    expect(set?.id).toBe("school");
    expect(set?.name).toBe("School Spirit");
  });

  it("has pieces, all with well-formed ids whose prefix matches their setId", () => {
    // The school PALETTE deliberately composes two namespaces: Becky's real
    // "hs:" artwork spread in from ./high-school, plus the original "school:"
    // placeholders, solids, and test tiles. (TileGrid renders one set at a time
    // and has no switcher, so they have to share a palette to both be reachable.)
    // A piece's id prefix must still agree with its own setId — that pairing is
    // what makes getPiece()'s flat, cross-set lookup unambiguous.
    const pieces = getSetPieces("school");
    expect(pieces.length).toBeGreaterThan(0);
    for (const p of pieces) {
      expect(p.id).toMatch(/^(school|hs):[a-z0-9-]+$/);
      expect(p.id.split(":")[0]).toBe(p.setId);
      expect(p.name.length).toBeGreaterThan(0);
      expect(p.emoji.length).toBeGreaterThan(0);
    }
  });

  it("leads the palette with the real high-school art", () => {
    const pieces = getSetPieces("school");
    const hs = pieces.filter((p) => p.setId === "hs");
    // The whole library, one make: 48 die-struck enamel badges. The six flat originals that used to pad this out
    // (DECA, FBLA, NHS, Mu Alpha Theta, FCA, Student Council) have been withdrawn —
    // they were another illustrator's flat style and, being other organisations'
    // registered marks, were never ours to print. Asserting the COUNT is deliberate
    // even though it needs editing whenever art lands: it is what catches a piece
    // silently dropping out of the palette, which `> 0` would sail past.
    expect(hs.length).toBe(48);
    // Real art first, so the collection is what you see on open.
    expect(pieces.slice(0, hs.length).every((p) => p.setId === "hs")).toBe(true);
    // Every one points at a committed local PNG (not an emoji/CDN placeholder).
    for (const p of hs) expect(p.artworkUrl).toMatch(/^\/tiles\/high-school\/[a-z0-9-]+\.png$/);
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
    // The set LISTS pieces from more than one set: Becky's collection is spread in
    // and keeps its own `hs:` ids (see the note on `pieces`). So the invariant is
    // that a preset names a piece this set actually offers, and labels it with that
    // piece's OWN set — not that everything is `school:`, which stopped being true
    // the moment real art arrived.
    const own = new Map(schoolSet.pieces.map((p) => [p.id, p]));
    for (const preset of schoolSet.presets) {
      for (const tile of Object.values(preset.slots)) {
        const piece = own.get(tile.pieceId);
        expect(piece, `preset ${preset.id} references unknown piece ${tile.pieceId}`).toBeDefined();
        expect(tile.setId).toBe(piece!.setId);
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

describe("High School fields — every piece takes a standard field colour", () => {
  const hs = getSetPieces("school").filter((p) => p.setId === "hs");

  it("uses ONLY colours from the standard palette", () => {
    const allowed = Object.values(TILE_BG).map((c) => c.toUpperCase());
    for (const p of hs) expect(allowed).toContain(p.backgroundColor.toUpperCase());
  });

  it("resolves each piece's field to itself — nothing gets snapped away", () => {
    // If a piece ever drifts off-palette, tileBackground silently rewrites it. Pinning
    // the round-trip means that rewrite can't hide a mistake in the data.
    for (const p of hs) expect(tileBackground(p)).toBe(p.backgroundColor.toUpperCase());
  });

  it("puts every embroidered patch on the SAME field", () => {
    // This asserted a MIX until the flat originals were withdrawn: they were the only
    // white-field pieces, because they were dark line art that needed a light ground.
    // Every remaining piece is a full-colour embroidered patch, and those all read on
    // navy — so one field is now correct rather than a regression. It also matches
    // how a kit page looks in practice, where the school's own colour floods every
    // badge field anyway (see tileField).
    const navy = hs.filter((p) => p.backgroundColor.toUpperCase() === TILE_BG.navy);
    expect(navy.length).toBe(hs.length);
  });

  it("puts the white-on-colour logos on NAVY — they would vanish on white", () => {
    for (const id of ["hs:honor-star", "hs:gavel", "hs:trophy"]) {
      expect(hs.find((p) => p.id === id)?.backgroundColor.toUpperCase()).toBe(TILE_BG.navy);
    }
  });
});
